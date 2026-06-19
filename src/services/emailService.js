import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";
const ARTICLE_EMAIL_DELAY_MS = 900;

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const getEmailJsConfig = (templateId) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS is not configured.");
  }

  return { serviceId, templateId, publicKey };
};

async function sendEmailJsMessage({ templateId, templateParams }) {
  const { serviceId, publicKey } = getEmailJsConfig(templateId);

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
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getActiveArticleSubscribers() {
  const subscribersQuery = query(
    collection(db, "articleSubscribers"),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(subscribersQuery);
  const seen = new Set();
  const subscribers = [];

  snapshot.forEach((entry) => {
    const data = entry.data() || {};
    const email = normalizeEmail(data.email);

    if (!email || seen.has(email)) {
      return;
    }

    seen.add(email);
    subscribers.push({
      id: entry.id,
      email: data.email || "",
      displayName: data.displayName || "",
      authUid: data.authUid || "",
    });
  });

  return subscribers;
}

export async function sendArticleNotificationEmails({
  article,
  articleId,
  recipients,
}) {
  const templateId = import.meta.env.VITE_EMAILJS_ARTICLE_TEMPLATE_ID;
  const sourceRecipients = Array.isArray(recipients) ? recipients : await getActiveArticleSubscribers();
  const articleUrl = new URL(`/articles/${articleId}`, window.location.origin).toString();
  const unsubscribeUrl = new URL("/settings", window.location.origin).toString();

  let sent = 0;
  let failed = 0;

  for (let index = 0; index < sourceRecipients.length; index += 1) {
    const recipient = sourceRecipients[index];
    try {
      await sendEmailJsMessage({
        templateId,
        templateParams: {
          email: recipient.email,
          to_email: recipient.email,
          to_name: recipient.displayName || "there",
          article_title: article.title || "New Article",
          article_excerpt: article.excerpt || article.description || "",
          article_url: articleUrl,
          unsubscribe_url: unsubscribeUrl,
          message: `A new Pro-Dental BPO article is live: ${article.title || "New Article"}`,
        },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Article email failed:", recipient.email, error);
    }

    if (index < sourceRecipients.length - 1) {
      await wait(ARTICLE_EMAIL_DELAY_MS);
    }
  }

  return {
    total: sourceRecipients.length,
    sent,
    failed,
  };
}

export async function sendConsultationEmail({
  firstName,
  lastName,
  email,
  phone,
  scheduleDate,
  recipientEmail,
}) {
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

  const fullName = `${firstName || ""} ${lastName || ""}`.trim();

  await sendEmailJsMessage({
    templateId,
    templateParams: {
      to_email: recipientEmail,
      reply_to: email,
      from_name: fullName || "Website visitor",
      first_name: firstName || "",
      last_name: lastName || "",
      email: email || "",
      phone: phone || "",
      schedule_date: scheduleDate || "",
      message: `New consultation request from ${fullName || email || "a visitor"}.`,
    },
  });
}
