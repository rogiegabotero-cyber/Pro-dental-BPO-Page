import { useState } from "react";
import { FaCopy, FaEye, FaEyeSlash, FaKey, FaSyncAlt } from "react-icons/fa";
import "../assets/Style/confirmModal.css";
import "../assets/Style/adminResetPasswordModal.css";

export default function AdminResetPasswordModal({
  isOpen,
  email,
  password,
  onPasswordChange,
  onRegenerate,
  onCancel,
  onConfirm,
  loading,
  error,
}) {
  const [reveal, setReveal] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="confirm-modal__overlay" onClick={onCancel}>
      <div className="confirm-modal reset-password-modal" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal__icon confirm-modal__icon--brand">
          <FaKey aria-hidden="true" />
        </div>

        <div className="confirm-modal__content">
          <h3>Reset password</h3>
          <p>
            Generate a temporary password for <strong>{email}</strong>. They will be
            required to set their own password the next time they sign in.
          </p>
        </div>

        <div className="reset-password-field">
          <input
            type={reveal ? "text" : "password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            minLength={8}
            aria-label="Temporary password"
          />
          <button
            type="button"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? "Hide password" : "Show password"}
            title={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
          </button>
          <button type="button" onClick={handleCopy} aria-label="Copy password" title="Copy password">
            <FaCopy aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            aria-label="Generate a new password"
            title="Generate a new password"
          >
            <FaSyncAlt aria-hidden="true" />
          </button>
        </div>
        {copied && <span className="reset-password-copied">Copied to clipboard.</span>}
        {password.length < 8 && (
          <p className="reset-password-hint">Use at least 8 characters.</p>
        )}

        {error && <p className="reset-password-error">{error}</p>}

        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="confirm-modal__button confirm-modal__button--danger"
            onClick={onConfirm}
            disabled={loading || password.length < 8}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
