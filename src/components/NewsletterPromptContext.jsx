import { createContext, useCallback, useContext, useMemo, useState } from "react";

const NewsletterPromptContext = createContext(null);

export function NewsletterPromptProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState("preview");
  const [closeEventId, setCloseEventId] = useState(0);
  const [closeReason, setCloseReason] = useState("");

  const openNewsletterPrompt = useCallback((nextSource = "preview") => {
    setSource(nextSource);
    setCloseReason("");
    setIsOpen(true);
  }, []);

  const closeNewsletterPrompt = useCallback((reason = "dismiss") => {
    setCloseReason(reason);
    setCloseEventId((current) => current + 1);
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      source,
      closeEventId,
      closeReason,
      openNewsletterPrompt,
      closeNewsletterPrompt,
    }),
    [closeEventId, closeReason, closeNewsletterPrompt, isOpen, openNewsletterPrompt, source]
  );

  return (
    <NewsletterPromptContext.Provider value={value}>
      {children}
    </NewsletterPromptContext.Provider>
  );
}

export function useNewsletterPrompt() {
  const context = useContext(NewsletterPromptContext);

  if (!context) {
    throw new Error("useNewsletterPrompt must be used inside NewsletterPromptProvider.");
  }

  return context;
}
