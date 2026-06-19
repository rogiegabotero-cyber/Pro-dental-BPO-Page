import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const providerSource = (user) => {
  const providerId = user?.providerData?.find((provider) => provider?.providerId)?.providerId;

  if (!providerId) {
    return "auth";
  }

  return providerId === "google.com" ? "google" : providerId;
};

export async function saveArticleSubscriber(user, source = providerSource(user)) {
  if (!user?.uid || !user?.email) {
    throw new Error("A signed-in account with an email is required.");
  }

  const subscriberRef = doc(db, "articleSubscribers", user.uid);
  const snapshot = await getDoc(subscriberRef);
  const currentData = snapshot.exists() ? snapshot.data() : null;
  const nextStatus = currentData?.status === "paused" ? "paused" : "active";
  const nextSource = currentData?.source || source;

  await setDoc(
    subscriberRef,
    {
      authUid: user.uid,
      email: normalizeEmail(user.email),
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      source: nextSource,
      status: nextStatus,
      createdAt: currentData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
