import { useState } from "react";
import { FaLock } from "react-icons/fa";
import "../assets/Style/passwordSetupModal.css";

export default function ForcePasswordChangeModal({
  isOpen,
  email,
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onSignOut,
  loading,
  error,
}) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="password-modal__overlay">
      <div className="password-modal" onClick={(event) => event.stopPropagation()}>
        <div className="password-modal__icon">
          <FaLock aria-hidden="true" />
        </div>

        <div className="password-modal__content">
          <h3>Set a new password</h3>
          <p>
            An administrator reset your password. Enter the temporary password you
            were given, then choose a new password to finish signing in.
          </p>
        </div>

        {email && <div className="password-modal__email">{email}</div>}

        <form className="password-modal__form" onSubmit={onSubmit}>
          <label>
            Temporary password
            <div className="password-modal__field">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => onCurrentPasswordChange(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter the temporary password"
              />
            </div>
            <button
              type="button"
              className="password-modal__toggle"
              onClick={() => setShowCurrent((current) => !current)}
              aria-label={showCurrent ? "Hide temporary password" : "Show temporary password"}
              aria-pressed={showCurrent}
              title={showCurrent ? "Hide temporary password" : "Show temporary password"}
            >
              <span
                className={`password-modal__toggle-box ${showCurrent ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="password-modal__toggle-text">
                {showCurrent ? "Hide password" : "Show password"}
              </span>
            </button>
          </label>

          <label>
            New password
            <div className="password-modal__field">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="Create a new password"
              />
            </div>
            <button
              type="button"
              className="password-modal__toggle"
              onClick={() => setShowNew((current) => !current)}
              aria-label={showNew ? "Hide new password" : "Show new password"}
              aria-pressed={showNew}
              title={showNew ? "Hide new password" : "Show new password"}
            >
              <span
                className={`password-modal__toggle-box ${showNew ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="password-modal__toggle-text">
                {showNew ? "Hide password" : "Show password"}
              </span>
            </button>
          </label>

          <label>
            Confirm new password
            <div className="password-modal__field">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="Repeat the new password"
              />
            </div>
            <button
              type="button"
              className="password-modal__toggle"
              onClick={() => setShowConfirm((current) => !current)}
              aria-label={showConfirm ? "Hide confirm password" : "Show password"}
              aria-pressed={showConfirm}
              title={showConfirm ? "Hide confirm password" : "Show password"}
            >
              <span
                className={`password-modal__toggle-box ${showConfirm ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="password-modal__toggle-text">
                {showConfirm ? "Hide password" : "Show password"}
              </span>
            </button>
          </label>

          {error && <p className="password-modal__error">{error}</p>}

          <p className="password-modal__hint">
            You must set a new password before you can continue.
          </p>

          <div className="password-modal__actions">
            <button
              type="button"
              className="password-modal__button password-modal__button--secondary"
              onClick={onSignOut}
              disabled={loading}
            >
              Sign out
            </button>
            <button
              type="submit"
              className="password-modal__button password-modal__button--primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Set password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
