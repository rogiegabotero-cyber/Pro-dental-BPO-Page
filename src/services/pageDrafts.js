import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const DRAFTS_COLLECTION = "pageDrafts";

// Every siteContent document and collection the visual editor can change.
export const DRAFT_CONTENT_DOCS = [
  "layout",
  "navbar",
  "hero",
  "about",
  "contact",
  "servicesSection",
  "benefitsSection",
  "footerSection",
  "faqPage",
];
export const DRAFT_COLLECTIONS = ["services", "benefits", "faqs"];

// Copies the currently published page (content docs + card collections) into a
// new draft document. The live documents are only read, never written.
export async function createDraftFromLive(name, createdBy) {
  const docs = {};
  await Promise.all(
    DRAFT_CONTENT_DOCS.map(async (docId) => {
      const snapshot = await getDoc(doc(db, "siteContent", docId));
      if (snapshot.exists()) docs[docId] = snapshot.data();
    })
  );

  const collections = {};
  await Promise.all(
    DRAFT_COLLECTIONS.map(async (name) => {
      const snapshot = await getDocs(query(collection(db, name), orderBy("order", "asc")));
      if (!snapshot.empty) {
        collections[name] = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      }
    })
  );

  const ref = await addDoc(collection(db, DRAFTS_COLLECTION), {
    name,
    createdBy: createdBy || "",
    docs,
    collections,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function renameDraft(draftId, name) {
  return setDoc(doc(db, DRAFTS_COLLECTION, draftId), { name }, { merge: true });
}

export function deleteDraft(draftId) {
  return deleteDoc(doc(db, DRAFTS_COLLECTION, draftId));
}

// Promotes a draft to the live site by overwriting the published documents.
export async function publishDraft(draft) {
  const writes = [];

  Object.entries(draft.docs || {}).forEach(([docId, data]) => {
    const payload = { ...data, updatedAt: serverTimestamp() };
    if (docId === "layout") {
      payload.customSections = payload.customSections || {};
      // Replace these fields wholesale so pages removed in the draft don't
      // linger on the live layout.
      const mergeFields = ["order", "styles", "customSections", "mobile", "updatedAt"].filter(
        (field) => field in payload
      );
      writes.push(setDoc(doc(db, "siteContent", docId), payload, { mergeFields }));
    } else {
      writes.push(setDoc(doc(db, "siteContent", docId), payload, { merge: true }));
    }
  });

  Object.entries(draft.collections || {}).forEach(([name, items]) => {
    items.forEach(({ id, ...data }) => {
      writes.push(
        setDoc(doc(db, name, id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
      );
    });
  });

  await Promise.all(writes);
}
