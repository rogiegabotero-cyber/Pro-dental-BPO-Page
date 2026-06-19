import { useEffect, useState } from "react";
import { FaKey } from "react-icons/fa";
import "../assets/Style/passwordSetupModal.css";

export default function PasswordSetupModal({
  isOpen,
  email,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onSignOut,
  loading,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div className="password-modal__overlay">
      <div className="password-modal" onClick={(event) => event.stopPropagation()}>
        <div className="password-modal__icon">
          <FaKey aria-hidden="true" />
        </div>

        <div className="password-modal__content">
          <h3>Set a custom password</h3>
          <p>
            You signed in with Google. Add a password now so you can later sign in
            with your Gmail address and this password.
          </p>
        </div>

        {email && <div className="password-modal__email">{email}</div>}

        <form className="password-modal__form" onSubmit={onSubmit}>
          <label>
            New password
            <div className="password-modal__field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="Create a password"
              />
            </div>
            <button
              type="button"
              className="password-modal__toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <span
                className={`password-modal__toggle-box ${showPassword ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="password-modal__toggle-text">
                {showPassword ? "Hide password" : "Show password"}
              </span>
            </button>
          </label>

          <label>
            Confirm password
            <div className="password-modal__field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="Repeat the password"
              />
            </div>
            <button
              type="button"
              className="password-modal__toggle"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show password"}
              aria-pressed={showConfirmPassword}
              title={showConfirmPassword ? "Hide confirm password" : "Show password"}
            >
              <span
                className={`password-modal__toggle-box ${showConfirmPassword ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="password-modal__toggle-text">
                {showConfirmPassword ? "Hide password" : "Show password"}
              </span>
            </button>
          </label>

          {error && <p className="password-modal__error">{error}</p>}

          <p className="password-modal__hint">
            This will link email/password login to the same Google account.
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
