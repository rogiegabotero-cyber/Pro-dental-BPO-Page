import { useLocation, useNavigate } from "react-router-dom";
import "../assets/Style/newsletter.css";
import { useAuth } from "../auth/useAuth";
import { useNewsletterPrompt } from "./NewsletterPromptContext";

const getLoginState = (location) => ({
  from: {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  },
});

export default function NewsletterSignup({ compact = false, guestAction = "drawer" }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openNewsletterPrompt } = useNewsletterPrompt();

  const goToLogin = () => {
    navigate("/login", {
      state: getLoginState(location),
    });
  };

  const handleGuestAction = () => {
    if (guestAction === "login") {
      goToLogin();
      return;
    }

    openNewsletterPrompt("inline");
  };

  if (compact) {
    return (
      <div className={`newsletter ${compact ? "newsletter--compact" : ""}`}>
        {!user && (
          <button type="button" onClick={goToLogin}>
            Sign in
          </button>
        )}
        {user && (
          <button type="button" onClick={() => navigate("/settings")}>
            Manage notifications
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`newsletter ${compact ? "newsletter--compact" : ""}`}>
      <div>
        <span>Article Updates</span>
        <h2>Get notified when new articles are posted.</h2>
      </div>
      {!user && (
        <div className="newsletter__row">
          <button type="button" onClick={handleGuestAction}>
            Sign in
          </button>
        </div>
      )}
      {user && (
        <p className="newsletter__status newsletter__status--success">
          You are subscribed automatically. Use Settings to turn notifications on or off.
        </p>
      )}
    </div>
  );
}
