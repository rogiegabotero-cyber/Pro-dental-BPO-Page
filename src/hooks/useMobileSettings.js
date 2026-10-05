import { useSyncExternalStore } from "react";
import { useCmsLayout } from "./useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";

export const DEFAULT_MOBILE_SETTINGS = {
  navStyle: "burger", // "burger" | "bottom"
  hiddenSections: {}, // { [sectionKey]: true } - hidden on phones
  hiddenNavLinks: {}, // { [linkId]: true } - hidden in the phone menu
  hiddenFields: {}, // { [mobileFieldKey]: true } - text/images hidden on phones
};

// Stable id for an editable field, used as the key in hiddenFields.
export function mobileFieldKey(fieldRef) {
  if (!fieldRef) return "";
  return fieldRef.kind === "content"
    ? `${fieldRef.docId}.${fieldRef.fieldName}`
    : `${fieldRef.collectionName}.${fieldRef.itemId}.${fieldRef.fieldName}`;
}

export function normalizeMobileSettings(raw) {
  return {
    navStyle: raw?.navStyle === "bottom" ? "bottom" : "burger",
    hiddenSections: { ...(raw?.hiddenSections || {}) },
    hiddenNavLinks: { ...(raw?.hiddenNavLinks || {}) },
    hiddenFields: { ...(raw?.hiddenFields || {}) },
  };
}

// The page editor responsive preview is an iframe of the real site showing
// saved content. To reflect unsaved mobile-setting changes live, the editor
// posts them to the iframe, which keeps them here and layers them on top of
// whatever the layout document says.
let previewOverride = null;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => previewOverride;

if (typeof window !== "undefined" && window.self !== window.top) {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== "mobile-settings") return;
    previewOverride = event.data.mobile ? normalizeMobileSettings(event.data.mobile) : null;
    listeners.forEach((listener) => listener());
  });
}

export function useMobileSettings() {
  const { data: layout } = useCmsLayout();
  const override = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const editorContext = useLayoutEditorContext();
  // Inside the editable device frame the editor supplies the pending settings.
  if (editorContext?.mobile) return normalizeMobileSettings(editorContext.mobile);
  return override || normalizeMobileSettings(layout.mobile);
}
