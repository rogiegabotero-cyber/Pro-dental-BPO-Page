import { useEffect } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import "../assets/Style/confirmModal.css";

export default function LogoutConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  title = "Log out?",
  description = "You will be signed out of your account and returned to the login page.",
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
          <FaSignOutAlt aria-hidden="true" />
        </div>
        <div className="confirm-modal__content">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="confirm-modal__actions">
          <button type="button" className="confirm-modal__button confirm-modal__button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="confirm-modal__button confirm-modal__button--danger" onClick={onConfirm}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
