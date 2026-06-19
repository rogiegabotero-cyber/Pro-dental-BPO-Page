import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  increment,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import NewsletterSignup from "./NewsletterSignup";
import { useAuth } from "../auth/useAuth";
import { useNewsletterPrompt } from "./NewsletterPromptContext";
import "../assets/Style/articles.css";

const formatDate = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const timestampToMillis = (timestamp) => {
  if (timestamp?.toMillis) return timestamp.toMillis();
  if (timestamp?.toDate) return timestamp.toDate().getTime();
  return 0;
};

const sortArticlesByPublishedAt = (articles) =>
  [...articles].sort(
    (first, second) =>
      timestampToMillis(second.publishedAt) - timestampToMillis(first.publishedAt)
  );

const stripHtml = (value = "") =>
  String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const getArticleContent = (article) => {
  if (!article) return "";

  const value =
    article.fullBody ??
    article.fullbody ??
    article.content ??
    article.articleContent ??
    article.body ??
    "";

  if (Array.isArray(value)) return value.filter(Boolean).join("\n\n");
  return String(value || "");
};

const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

const getArticleOpenSessionKey = (articleId) => `article-open-counted:${articleId}`;

function ArticleContent({ content }) {
  if (!content.trim()) {
    return <p className="article-copy__empty">Article content has not been added yet.</p>;
  }

  if (looksLikeHtml(content)) {
    return (
      <div
        className="article-rich-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="article-rich-content article-rich-content--plain">
      {content
        .split(/\n\s*\n|\r\n\s*\r\n/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => (
          <p key={index}>{block}</p>
        ))}
    </div>
  );
}

function ArticleCard({ article }) {
  const navigate = useNavigate();
  const destination = `/articles/${article.id}`;
  const summary = article.excerpt || stripHtml(getArticleContent(article)).slice(0, 240);

  const handleActivate = () => {
    navigate(destination);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <article
      id={`article-${article.id}`}
      className="article-card article-card--faded"
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-label={`Read ${article.title}`}
    >
      {article.mediaUrl && (
        <img src={article.mediaUrl} alt={article.mediaAlt || article.title} />
      )}
      <div className="article-card__content">
        <span>{formatDate(article.publishedAt)}</span>
        <h2>{article.title}</h2>
        {summary && <p>{summary}</p>}
      </div>
    </article>
  );
}

export function ArticlesList() {
  const [articles, setArticles] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const articlesQuery = query(
      collection(db, "articles"),
      where("published", "==", true)
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        setArticles(
          sortArticlesByPublishedAt(
            snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
          )
        );
      },
      (error) => {
        console.error("Published articles load failed:", error);
        setArticles([]);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusId = params.get("focus");
    if (!focusId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`article-${focusId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);

    return () => clearTimeout(timer);
  }, [articles, location.search]);

  const gridClasses = `articles-grid ${articles.length === 1 ? "articles-grid--center" : ""}`;

  return (
    <section className="articles-page">
      <header className="articles-hero">
        <span>Articles</span>
        <h1>Dental operations insights from Pro-Dental BPO</h1>
      </header>

      <div className="articles-layout">
        <main className={gridClasses}>
          {articles.length === 0 ? (
            <div className="articles-empty">No articles published yet.</div>
          ) : (
            articles.map((article) => (
              <ArticleCard article={article} key={article.id} />
            ))
          )}
        </main>

        <aside>
          <NewsletterSignup />
        </aside>
      </div>
    </section>
  );
}

export function ArticlePreviewSection() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [showFollowupNewsletter, setShowFollowupNewsletter] = useState(false);
  const carouselRef = useRef(null);
  const sectionRef = useRef(null);
  const beltOffsetRef = useRef(0);
  const hoverPauseRef = useRef(false);
  const guestPromptedRef = useRef(false);
  const { user } = useAuth();
  const { openNewsletterPrompt, closeEventId, closeReason } = useNewsletterPrompt();

  useEffect(() => {
    const articlesQuery = query(
      collection(db, "articles"),
      where("published", "==", true)
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        setError("");
        setArticles(
          sortArticlesByPublishedAt(
            snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
          )
        );
      },
      (error) => {
        console.error("Article preview load failed:", error);
        setError("Articles could not load right now.");
        setArticles([]);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      guestPromptedRef.current = false;
      setShowFollowupNewsletter(false);
      return undefined;
    }

    const el = sectionRef.current;
    if (!el) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !guestPromptedRef.current) {
          openNewsletterPrompt("preview");
          guestPromptedRef.current = true;
        }
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [openNewsletterPrompt, user]);

  useEffect(() => {
    if (user) {
      return;
    }

    if (closeReason === "timeout" || closeReason === "dismiss") {
      setShowFollowupNewsletter(true);
    }
  }, [closeEventId, closeReason, user]);

  const canScroll = articles.length > 1;
  const carouselArticles = canScroll ? [...articles, ...articles, ...articles] : articles;

  useEffect(() => {
    const track = carouselRef.current;

    if (!track || !canScroll) {
      return undefined;
    }

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      return undefined;
    }

    let frameId = 0;
    const speed = 0.55;

    const tick = () => {
      const setWidth = track.scrollWidth / 3;

      if (setWidth > 0 && !hoverPauseRef.current) {
        beltOffsetRef.current += speed;

        if (beltOffsetRef.current >= setWidth) {
          beltOffsetRef.current -= setWidth;
        }

        track.style.transform = `translate3d(${-beltOffsetRef.current}px, 0, 0)`;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [canScroll, articles.length]);

  const getScrollStep = () => {
    const track = carouselRef.current;

    if (!track) {
      return 320;
    }

    const slide = track.querySelector(".article-preview__slide");
    const trackStyles = window.getComputedStyle(track);
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || "0") || 0;

    if (!slide) {
      return Math.max(280, track.clientWidth * 0.8);
    }

    return Math.max(280, slide.getBoundingClientRect().width + gap);
  };

  const handleArrow = (direction) => {
    const track = carouselRef.current;

    if (!track) {
      return;
    }

    const step = getScrollStep();
    const setWidth = track.scrollWidth / 3;

    if (setWidth <= 0) {
      return;
    }

    beltOffsetRef.current += direction * step;

    while (beltOffsetRef.current < 0) {
      beltOffsetRef.current += setWidth;
    }

    while (beltOffsetRef.current >= setWidth) {
      beltOffsetRef.current -= setWidth;
    }

    track.style.transform = `translate3d(${-beltOffsetRef.current}px, 0, 0)`;
  };

  return (
    <section className="article-preview" id="articles" ref={sectionRef}>
      <header className="article-preview__header">
        <span>Articles</span>
        <h2>Featured Articles & Insights</h2>
      </header>

      <div className="article-preview__carousel-shell">
        <button
          type="button"
          className="article-preview__control article-preview__control--left"
          onClick={() => handleArrow(-1)}
          disabled={!canScroll}
          aria-label="Scroll articles left"
        >
          {"<"}
        </button>

        <div
          className="article-preview__viewport"
          onMouseEnter={() => {
            hoverPauseRef.current = true;
          }}
          onMouseLeave={() => {
            hoverPauseRef.current = false;
          }}
          onFocusCapture={() => {
            hoverPauseRef.current = true;
          }}
          onBlurCapture={() => {
            hoverPauseRef.current = false;
          }}
        >
          <main
            ref={carouselRef}
            className={`article-preview__track ${
              !canScroll ? "article-preview__track--centered" : ""
            }`}
          >
            {carouselArticles.length === 0 ? (
              <div className="articles-empty">
                {error || "No articles posted yet."}
              </div>
            ) : (
              carouselArticles.map((article, index) => (
                <div className="article-preview__slide" key={`${article.id}-${index}`}>
                  <ArticleCard article={article} />
                </div>
              ))
            )}
          </main>
        </div>

        <button
          type="button"
          className="article-preview__control article-preview__control--right"
          onClick={() => handleArrow(1)}
          disabled={!canScroll}
          aria-label="Scroll articles right"
        >
          {">"}
        </button>
      </div>

      {showFollowupNewsletter && !user && (
        <div className="article-preview__newsletter">
          <NewsletterSignup guestAction="login" />
        </div>
      )}
    </section>
  );
}

export function ArticleDetail() {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { openNewsletterPrompt } = useNewsletterPrompt();
  const promptOpenedRef = useRef(false);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);

      try {
        const articleRef = doc(db, "articles", articleId);
        const snapshot = await getDoc(articleRef);
        const nextArticle = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;

        setArticle(nextArticle);

        if (nextArticle && nextArticle.published !== false && typeof window !== "undefined") {
          try {
            const sessionKey = getArticleOpenSessionKey(snapshot.id);
            if (!window.sessionStorage.getItem(sessionKey)) {
              window.sessionStorage.setItem(sessionKey, "pending");
              await Promise.all([
                updateDoc(articleRef, {
                  viewCount: increment(1),
                }),
                addDoc(collection(db, "articleEngagements"), {
                  articleId: snapshot.id,
                  articleTitle: nextArticle.title || "",
                  engagedAt: serverTimestamp(),
                }),
              ]);
              window.sessionStorage.setItem(sessionKey, "1");
            }
          } catch (sessionError) {
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem(getArticleOpenSessionKey(articleId));
            }
            console.warn("Unable to mark article open in session storage:", sessionError);
          }
        }
      } catch (error) {
        console.error("Article load failed:", error);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [articleId]);

  useEffect(() => {
    promptOpenedRef.current = false;
  }, [articleId]);

  useEffect(() => {
    if (loading || user || !article || article.published === false || promptOpenedRef.current) {
      return;
    }

    promptOpenedRef.current = true;
    openNewsletterPrompt("detail");
  }, [article, loading, openNewsletterPrompt, user]);

  if (loading) {
    return <section className="article-detail">Loading article...</section>;
  }

  if (!article || article.published === false) {
    return (
      <section className="article-detail">
        <h1>Article not found</h1>
        <Link to="/articles">Back to articles</Link>
      </section>
    );
  }

  const mediaPosition = article.mediaPosition || "top";
  const fullContent = getArticleContent(article);
  const visibleContent = fullContent;

  return (
    <article className={`article-detail article-detail--${mediaPosition}`}>
      <Link className="article-back" to="/">
         Back
      </Link>

      <header>
        <span>{formatDate(article.publishedAt)}</span>
        <h1>{article.title}</h1>
        {article.excerpt && <p>{article.excerpt}</p>}
      </header>

      <div className="article-body-layout">
        {article.mediaUrl && (
          <figure>
            <img src={article.mediaUrl} alt={article.mediaAlt || article.title} />
            {article.mediaCaption && <figcaption>{article.mediaCaption}</figcaption>}
          </figure>
        )}

        <div className="article-copy-shell">
          <div className="article-copy">
            <ArticleContent content={visibleContent} />
          </div>
        </div>
      </div>

      <NewsletterSignup />
    </article>
  );
}
