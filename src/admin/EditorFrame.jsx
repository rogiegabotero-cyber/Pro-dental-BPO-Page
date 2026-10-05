import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { PublicHome, PublicFaq, PublicArticles } from "../App";

const PAGES = { home: PublicHome, faq: PublicFaq, articles: PublicArticles };
import { LayoutEditorContext } from "../context/LayoutEditorContext";
import { DraftContentContext } from "../context/DraftContentContext";
import { DRAFTS_COLLECTION } from "../services/pageDrafts";
import "../assets/Style/visualPageEditor.css";

// Editor actions the page inside the frame may trigger. They run in the
// parent editor (which owns the undo history and selection state).
const BRIDGE_CALLS = [
  "selectSection",
  "selectField",
  "updateFieldContent",
  "updateCollectionField",
  "updateStyle",
  "updateFieldStyle",
  "updateCustomSection",
  "addCustomSection",
  "removeCustomSection",
  "jumpToEdit",
  "handleDragStart",
  "handleDrop",
  "handleDragEnd",
  "handleCardDragStart",
  "handleCardDrop",
  "handleCardDragEnd",
  "handleElementDragStart",
  "handleElementDrop",
  "handleElementDragEnd",
];

// Drag-over handlers only receive DOM events, which cannot cross frames.
const NOOP_CALLS = ["handleDragOver", "handleCardDragOver", "handleElementDragOver"];

const post = (message) => {
  try {
    window.parent.postMessage(message, window.location.origin);
  } catch {
    // The parent editor went away; nothing to report to.
  }
};

// Editable copy of the page rendered inside an iframe, so its CSS media
// queries follow the iframe width (phone / tablet). Editor state lives in the
// parent: this frame mirrors it and forwards every edit back.
function BridgedEditor() {
  const [searchParams] = useSearchParams();
  const Page = PAGES[searchParams.get("page")] || PublicHome;
  const [state, setState] = useState(null);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === "editor-state") setState(event.data.state);
    };
    window.addEventListener("message", onMessage);
    post({ type: "editor-frame-ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const value = useMemo(() => {
    if (!state) return null;

    const calls = {};
    BRIDGE_CALLS.forEach((fn) => {
      calls[fn] = (...args) => post({ type: "editor-call", fn, args });
    });
    NOOP_CALLS.forEach((fn) => {
      calls[fn] = () => {};
    });

    const resolveFieldStyle = (fieldRef) => {
      if (!fieldRef) return {};
      const styleKey = `${fieldRef.fieldName}Style`;
      if (fieldRef.kind === "content") {
        const live = state.liveFieldStyles.content[fieldRef.docId]?.[styleKey] || {};
        return { ...live, ...state.pendingContent[fieldRef.docId]?.[styleKey] };
      }
      const live =
        state.liveFieldStyles.collections[fieldRef.collectionName]?.[fieldRef.itemId]?.[
          styleKey
        ] || {};
      const pending =
        state.pendingCollections[fieldRef.collectionName]?.items[fieldRef.itemId]?.[styleKey];
      return { ...live, ...pending };
    };

    return {
      ...state,
      // Pointer coordinates inside the frame are already in unscaled pixels.
      canvasScale: 1,
      resolveFieldStyle,
      ...calls,
    };
  }, [state]);

  if (!value) return null;

  return (
    <LayoutEditorContext.Provider value={value}>
      <Page />
    </LayoutEditorContext.Provider>
  );
}

export default function EditorFrame() {
  const { draftId } = useParams();
  const isLive = draftId === "live";
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (isLive) return undefined;
    return onSnapshot(doc(db, DRAFTS_COLLECTION, draftId), (snapshot) =>
      setDraft(snapshot.exists() ? snapshot.data() : null)
    );
  }, [draftId, isLive]);

  const source = useMemo(
    () => (draft ? { docs: draft.docs || {}, collections: draft.collections || {} } : null),
    [draft]
  );

  if (isLive) return <BridgedEditor />;
  if (!source) return null;

  return (
    <DraftContentContext.Provider value={source}>
      <BridgedEditor />
    </DraftContentContext.Provider>
  );
}
