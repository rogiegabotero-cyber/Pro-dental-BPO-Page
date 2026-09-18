import { createContext, useContext } from "react";

export const LayoutEditorContext = createContext(null);

export function useLayoutEditorContext() {
  return useContext(LayoutEditorContext);
}
