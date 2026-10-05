import { FaPlus } from "react-icons/fa";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";

// Zero-height seam between two panels (edit mode only) with a button that
// inserts a new page right there. `afterKey` is the section it follows, or
// null for the slot directly under the header.
export default function InsertPageBar({ afterKey }) {
  const ctx = useLayoutEditorContext();
  if (!ctx?.editMode) return null;

  return (
    <div className="insert-page-bar" data-cms-interactive="true">
      <button
        type="button"
        className="insert-page-bar__button"
        onClick={(event) => {
          event.stopPropagation();
          ctx.addCustomSection(afterKey);
        }}
        title="Add a page here"
      >
        <FaPlus /> Add page
      </button>
    </div>
  );
}
