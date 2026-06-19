/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const isValidEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const isExistingEmailError = (error) =>
  [
    "auth/email-already-exists",
    "auth/email-already-in-use",
    "EMAIL_ALREADY_EXISTS",
  ].includes(error?.code);

const isWeakPasswordError = (error) =>
  ["auth/invalid-password", "auth/weak-password", "PASSWORD_DOES_NOT_MEET_REQUIREMENTS"].includes(
    error?.code
  );

async function sendEmailJsMessage({ serviceId, templateId, publicKey, templateParams }) {
  if (!serviceId || !templateId || !publicKey) {
    return false;
  }

  const response = await fetch(EMAILJS_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || "EmailJS send failed.");
  }

  return true;
}

exports.createUserInviteV1 = functions.runWith({ maxInstances: 10 }).https.onCall(async (data, context) => {
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create users.");
  }

  const ownerSnapshot = await admin.firestore().doc(`admins/${uid}`).get();
  const ownerExists =
    typeof ownerSnapshot.exists === "function" ? ownerSnapshot.exists() : ownerSnapshot.exists;
  const ownerData = ownerExists ? ownerSnapshot.data() || {} : {};

  if (ownerData.role !== "owner") {
    throw new functions.https.HttpsError("permission-denied", "Only the owner can create users.");
  }

  const firstName = String(data?.firstName || "").trim();
  const lastName = String(data?.lastName || "").trim();
  const email = normalizeEmail(data?.email || "");
  const password = String(data?.password || "");
  const siteUrl = String(data?.siteUrl || "").trim() || "https://example.com";
  const emailJs = data?.emailJs || {};

  if (!firstName || !lastName) {
    throw new functions.https.HttpsError("invalid-argument", "First name and last name are required.");
  }

  if (!isValidEmail(email)) {
    throw new functions.https.HttpsError("invalid-argument", "A valid email address is required.");
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Password must be at least 6 characters long.");
  }

  try {
    const fullName = `${firstName} ${lastName}`.trim();
    const createdUser = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: false,
    });

    await admin.firestore().doc(`users/${createdUser.uid}`).set(
      {
        authUid: createdUser.uid,
        firstName,
        lastName,
        fullName,
        email,
        createdBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    let emailSent = false;
    try {
      emailSent = await sendEmailJsMessage({
        serviceId: String(emailJs.serviceId || "").trim(),
        templateId: String(emailJs.templateId || "").trim(),
        publicKey: String(emailJs.publicKey || "").trim(),
        templateParams: {
          to_email: email,
          to_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          login_url: new URL("/login", siteUrl).toString(),
          message: `Your Pro-Dental BPO account has been created for ${fullName}.`,
        },
      });
    } catch (emailError) {
      logger.error("User invite email failed", emailError);
    }

    return {
      uid: createdUser.uid,
      email,
      fullName,
      emailSent,
      message: emailSent
        ? `User created and credentials sent to ${email}.`
        : `User created for ${email}, but the email template is not configured.`,
    };
  } catch (error) {
    logger.error("User invite creation failed", error);
    if (isExistingEmailError(error)) {
      throw new functions.https.HttpsError(
        "already-exists",
        "An account already exists with this email address."
      );
    }

    if (isWeakPasswordError(error)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The password does not meet Firebase Auth requirements."
      );
    }

    if (error?.code === "auth/invalid-email") {
      throw new functions.https.HttpsError("invalid-argument", "The email address is not valid.");
    }

    if (error?.code === "auth/permission-denied") {
      throw new functions.https.HttpsError("permission-denied", "The current account cannot create users.");
    }

    throw new functions.https.HttpsError("internal", "Unable to create the user.", {
      cause: error?.message || String(error),
      code: error?.code || "",
    });
  }
});
