import { useEffect, useMemo, useRef, useState } from "react";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { auth } from "../firebase";
import LogoutConfirmModal from "./LogoutConfirmModal";
import PasswordSetupModal from "./PasswordSetupModal";
import "../assets/Style/login.css";

const getReturnPath = (from) => {
  const pathname = from?.pathname || "/";
  const search = from?.search || "";

  if (pathname === "/login" || pathname === "/admin/login") {
    return "/";
  }

  return `${pathname}${search}`;
};

const getAuthErrorMessage = (error, provider) => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "this Firebase project";

  if (error?.code === "auth/operation-not-allowed") {
    return `${provider} is not enabled for ${projectId}. Check Firebase Authentication > Sign-in method for this exact project.`;
  }

  if (error?.code === "auth/account-exists-with-different-credential") {
    return "An account already exists with this email using a different sign-in method.";
  }

  if (error?.code === "auth/credential-already-in-use") {
    return "This Google account is already linked to another account.";
  }

  if (error?.code === "auth/email-already-in-use") {
    return "An account already exists with this email. Please sign in instead.";
  }

  if (error?.code === "auth/invalid-credential") {
    return "The email or password is incorrect.";
  }

  if (error?.code === "auth/weak-password") {
    return "Please use a password with at least 6 characters.";
  }

  return error?.message || "Unable to sign in.";
};

const hasPasswordProvider = (firebaseUser) =>
  Boolean(firebaseUser?.providerData?.some((provider) => provider.providerId === "password"));

export default function Login() {
  const {
    user,
    isAdmin,
    isOwner,
    accountRole,
    loading,
    login,
    loginWithGoogle,
    logout,
    signup,
  } = useAuth();
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false);
  const [passwordSetupPassword, setPasswordSetupPassword] = useState("");
  const [passwordSetupConfirm, setPasswordSetupConfirm] = useState("");
  const [passwordSetupError, setPasswordSetupError] = useState("");
  const [passwordSetupSaving, setPasswordSetupSaving] = useState(false);
  const googlePasswordLinkPending = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const returnPath = useMemo(
    () => getReturnPath(location.state?.from),
    [location.state]
  );
  const skipPath = returnPath.startsWith("/articles") ? returnPath : "/";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (loading || !user || passwordSetupOpen || googlePasswordLinkPending.current) {
      return;
    }

    if (isAdmin || isOwner) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    navigate(returnPath.startsWith("/admin") ? "/" : returnPath, { replace: true });
  }, [isAdmin, isOwner, loading, navigate, passwordSetupOpen, returnPath, user]);

  const resetPasswordSetup = () => {
    setPasswordSetupOpen(false);
    setPasswordSetupPassword("");
    setPasswordSetupConfirm("");
    setPasswordSetupError("");
    setPasswordSetupSaving(false);
  };

  const handlePasswordSetupSignOut = async () => {
    googlePasswordLinkPending.current = false;
    resetPasswordSetup();
    setLogoutOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handlePasswordSetupSubmit = async (event) => {
    event.preventDefault();
    setPasswordSetupError("");

    if (!auth.currentUser?.email) {
      setPasswordSetupError("We could not find your email address for this account.");
      return;
    }

    if (passwordSetupPassword !== passwordSetupConfirm) {
      setPasswordSetupError("Passwords do not match.");
      return;
    }

    setPasswordSetupSaving(true);

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordSetupPassword
      );
      await linkWithCredential(auth.currentUser, credential);
      googlePasswordLinkPending.current = false;
      resetPasswordSetup();
    } catch (linkError) {
      console.error("Password link failed:", {
        code: linkError.code,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      });
      setPasswordSetupError(getAuthErrorMessage(linkError, "Password setup"));
    } finally {
      setPasswordSetupSaving(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (authMode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (loginError) {
      console.error("Email auth failed:", {
        provider: authMode === "signup" ? "email/signup" : "email/signin",
        code: loginError.code,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      });
      setError(
        getAuthErrorMessage(
          loginError,
          authMode === "signup" ? "Email/password signup" : "Email/password sign-in"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSubmitting(true);
    googlePasswordLinkPending.current = true;

    try {
      const result = await loginWithGoogle();
      if (hasPasswordProvider(result?.user)) {
        googlePasswordLinkPending.current = false;
        resetPasswordSetup();
        return;
      }

      setPasswordSetupPassword("");
      setPasswordSetupConfirm("");
      setPasswordSetupError("");
      setPasswordSetupOpen(true);
    } catch (loginError) {
      googlePasswordLinkPending.current = false;
      console.error("Google auth failed:", {
        provider: "google",
        code: loginError.code,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      });
      setError(getAuthErrorMessage(loginError, "Google sign-in"));
    } finally {
      setSubmitting(false);
    }
  };

  const openLogoutConfirm = () => {
    setLogoutOpen(true);
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
  };

  const toggleAuthMode = () => {
    setError("");
    setAuthMode((current) => (current === "login" ? "signup" : "login"));
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <aside className="login-art" aria-label="Welcome back">
          <div className="login-brand-dot" />
          <span className="login-brand">Pro-Dental BPO</span>
          <div className="login-orbit login-orbit--one" />
          <div className="login-orbit login-orbit--two" />
          <div className="login-art-copy">
            <small>Nice to see you</small>
            <h1>Welcome to Pro-Dental BPO</h1>
            <p>
              Access articles, account tools, and be notify when new article is posted.
            </p>
          </div>
        </aside>

        <section className="login-panel">
          <span>Login Account</span>
          <h2>{authMode === "signup" ? "Sign up" : "Sign in"}</h2>

          {user && (
            <div className="login-account">
              {user.photoURL && <img src={user.photoURL} alt="" />}
              <div>
                <strong>{user.displayName || user.email}</strong>
                <small>{accountRole}</small>
              </div>
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <form className="login-form" onSubmit={handleEmailSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email ID"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <div className="login-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <span
                  className={`login-password-toggle__box ${showPassword ? "is-active" : ""}`}
                  aria-hidden="true"
                />
                <span className="login-password-toggle__text">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </button>
            </label>
            <button type="submit" disabled={loading || submitting}>
              {loading || submitting
                ? authMode === "signup"
                  ? "Creating..."
                  : "Signing in..."
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            className="login-secondary"
            onClick={handleGoogleSignIn}
            disabled={loading || submitting}
          >
            Continue with Google
          </button>

          {user && (
            <button type="button" className="login-secondary" onClick={openLogoutConfirm}>
              Sign out
            </button>
          )}

          <button type="button" className="login-link" onClick={toggleAuthMode}>
            {authMode === "signup" ? "Sign in" : "Sign up"}
          </button>

          <Link className="login-skip-link" to={skipPath} replace>
            Skip for now
          </Link>
        </section>
      </section>
      <LogoutConfirmModal
        isOpen={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
      <PasswordSetupModal
        isOpen={passwordSetupOpen}
        email={auth.currentUser?.email || user?.email || ""}
        password={passwordSetupPassword}
        confirmPassword={passwordSetupConfirm}
        onPasswordChange={setPasswordSetupPassword}
        onConfirmPasswordChange={setPasswordSetupConfirm}
        onSubmit={handlePasswordSetupSubmit}
        onSignOut={handlePasswordSetupSignOut}
        loading={passwordSetupSaving}
        error={passwordSetupError}
      />
    </main>
  );
}
