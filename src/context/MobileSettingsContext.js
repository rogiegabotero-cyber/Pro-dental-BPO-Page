import { createContext } from "react";

// Current mobile settings (see useMobileSettings), shared with every editable
// field so each one can hide itself on phones without its own data lookup.
export const MobileSettingsContext = createContext(null);
