import { useEffect, useState } from "react";
import { FaArrowRight, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "../assets/Style/newsletterPrompt.css";
import { useNewsletterPrompt } from "./NewsletterPromptContext";

const AUTO_CLOSE_MS = 15000;

export default function NewsletterPromptDrawer() {
  const [countdownMs, setCountdownMs] = useState(AUTO_CLOSE_MS);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, source, closeNewsletterPrompt } = useNewsletterPrompt();

  useEffect(() => {
    if (!isOpen || user) {
      setCountdownMs(AUTO_CLOSE_MS);
    }

    if (user && isOpen) {
      closeNewsletterPrompt("auth");
    }
  }, [closeNewsletterPrompt, isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const startedAt = window.performance.now();

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeNewsletterPrompt("dismiss");
      }
    };

    let frameId = 0;

    const tick = () => {
      const elapsed = window.performance.now() - startedAt;
      const remaining = Math.max(AUTO_CLOSE_MS - elapsed, 0);
      setCountdownMs(remaining);

      if (remaining <= 0) {
        closeNewsletterPrompt("timeout");
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    document.addEventListener("keydown", handleEscape);
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeNewsletterPrompt, isOpen]);

  if (!isOpen || user) {
    return null;
  }

  const signIn = () => {
    navigate("/login", {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    });
  };

  const subtitle =
    source === "detail"
      ? "You opened an article. Sign in to keep reading with the article panel open."
      : "You reached the article section. Sign in to keep this newsletter prompt and article access ready.";
  const countdownSeconds = Math.max(0, Math.ceil(countdownMs / 1000));
  const countdownProgress = Math.max(0, Math.min(1, countdownMs / AUTO_CLOSE_MS));

  return (
    <div className="newsletter-prompt__overlay">
      <section
        className="newsletter-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-prompt-title"
        style={{
          "--countdown-progress": countdownProgress,
        }}
      >
        <button
          type="button"
          className="newsletter-prompt__close"
          onClick={() => closeNewsletterPrompt("dismiss")}
          aria-label="Dismiss newsletter prompt"
          title="Dismiss"
        >
          <FaTimes aria-hidden="true" />
        </button>

        <div className="newsletter-prompt__content">
          <span>Article updates</span>
          <h2 id="newsletter-prompt-title">Sign in to continue with articles</h2>
          <p>{subtitle}</p>
        </div>

        <div className="newsletter-prompt__actions">
          <button
            type="button"
            className="newsletter-prompt__button newsletter-prompt__button--primary"
            onClick={signIn}
          >
            <FaArrowRight aria-hidden="true" />
            <span>Sign in</span>
          </button>
          <button
            type="button"
            className="newsletter-prompt__button newsletter-prompt__button--secondary"
            onClick={() => closeNewsletterPrompt("dismiss")}
          >
            Close
          </button>

          <div
            className="newsletter-prompt__countdown"
            aria-label={`${countdownSeconds} seconds remaining before this prompt closes`}
            title={`${countdownSeconds} seconds remaining`}
          >
            <span>{countdownSeconds}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
