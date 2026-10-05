import { createContext } from "react";

// When the page editor is editing a saved draft, this supplies the draft's
// copy of the site content ({ docs: { [docId]: data }, collections: { [name]: items[] } })
// so the CMS hooks read from it instead of the live, published documents.
export const DraftContentContext = createContext(null);
