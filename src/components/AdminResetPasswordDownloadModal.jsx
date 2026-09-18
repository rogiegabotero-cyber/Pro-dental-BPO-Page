import { FaCheckCircle, FaDownload } from "react-icons/fa";
import "../assets/Style/confirmModal.css";
import "../assets/Style/adminResetPasswordModal.css";

export default function AdminResetPasswordDownloadModal({
  isOpen,
  email,
  password,
  onDownload,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal__overlay" onClick={onClose}>
      <div className="confirm-modal reset-password-modal" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal__icon confirm-modal__icon--brand">
          <FaCheckCircle aria-hidden="true" />
        </div>

        <div className="confirm-modal__content">
          <h3>Password reset</h3>
          <p>
            Share these credentials with <strong>{email}</strong> securely. For your
            security, this password will not be shown again after you close this
            window.
          </p>
        </div>

        <div className="reset-password-summary">
          <div>
            <span>Email</span>
            <strong>{email}</strong>
          </div>
          <div>
            <span>Temporary password</span>
            <strong>{password}</strong>
          </div>
        </div>

        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--primary"
            onClick={onDownload}
          >
            <FaDownload aria-hidden="true" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
