import { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import "../assets/Style/confirmModal.css";

export default function DiscardChangesModal({
  isOpen,
  onCancel,
  onConfirm,
  title = "Discard unsaved changes?",
  description = "Your layout and style edits haven't been saved yet. Leaving now will discard them.",
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-modal__overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal__icon">
          <FaExclamationTriangle aria-hidden="true" />
        </div>
        <div className="confirm-modal__content">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="confirm-modal__actions">
          <button type="button" className="confirm-modal__button confirm-modal__button--secondary" onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className="confirm-modal__button confirm-modal__button--danger" onClick={onConfirm}>
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
