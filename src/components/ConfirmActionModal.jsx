import { useEffect } from "react";
import "../assets/Style/confirmModal.css";

// Generic yes/no confirmation dialog for any sensitive action (delete,
// promote, demote, ...). Reuses the same confirm-modal CSS as
// LogoutConfirmModal, but that component stays dedicated to logging out —
// this one takes the icon/copy/labels as props instead.
export default function ConfirmActionModal({
  isOpen,
  icon,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
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
      if (event.key === "Escape" && isOpen && !loading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-modal__overlay" onClick={loading ? undefined : onCancel}>
      <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className={`confirm-modal__icon${danger ? "" : " confirm-modal__icon--brand"}`}>
          {icon}
        </div>
        <div className="confirm-modal__content">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal__button confirm-modal__button--${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
