import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { PublicHome, PublicFaq, PublicArticles } from "../App";

const PAGES = { home: PublicHome, faq: PublicFaq, articles: PublicArticles };
import { DraftContentContext } from "../context/DraftContentContext";
import { DRAFTS_COLLECTION } from "../services/pageDrafts";

// Renders the home page from a saved draft's content. Used as the thumbnail
// source on the Pages screen (loaded inside an iframe).
export default function DraftPreview() {
  const { draftId } = useParams();
  const [searchParams] = useSearchParams();
  const Page = PAGES[searchParams.get("page")] || PublicHome;
  const [draft, setDraft] = useState(null);

  useEffect(
    () =>
      onSnapshot(doc(db, DRAFTS_COLLECTION, draftId), (snapshot) =>
        setDraft(snapshot.exists() ? snapshot.data() : null)
      ),
    [draftId]
  );

  const source = useMemo(
    () => (draft ? { docs: draft.docs || {}, collections: draft.collections || {} } : null),
    [draft]
  );

  if (!source) return null;

  return (
    <DraftContentContext.Provider value={source}>
      <Page />
    </DraftContentContext.Provider>
  );
}
