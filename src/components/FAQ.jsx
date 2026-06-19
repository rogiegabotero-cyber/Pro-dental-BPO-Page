import { useEffect, useMemo, useRef, useState } from "react";
import "../assets/Style/faq.css";
import { defaultFaqs } from "../data/defaultContent";
import { useCmsCollection } from "../hooks/useCmsData";

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openId, setOpenId] = useState(null);
  const topRef = useRef(null);
  const { items: faqs } = useCmsCollection("faqs", defaultFaqs);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(faqs.map((item) => item.category)));
    return ["All", ...unique];
  }, [faqs]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return faqs.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesQuery =
        !search ||
        item.question.toLowerCase().includes(search) ||
        item.answer.toLowerCase().includes(search);

      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, faqs]);

  const handleToggle = (id) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section id="faq" className="faqv2" ref={topRef}>
      <div className="faqv2__shell">
        <header className="faqv2__hero">
          <div className="faqv2__heroCard">
            <h1 className="faqv2__title">FAQs</h1>
            <p className="faqv2__subtitle">
              Find quick answers about partnerships, services, onboarding, and
              operations fast.
            </p>
          </div>

          <div className="faqv2__heroGlow" aria-hidden="true" />
        </header>

        <div className="faqv2__grid">
          <aside className="faqv2__side">
            <div className="faqv2__tip">
              <div className="faqv2__tipTitle">Tip</div>
              <div className="faqv2__tipBody">
                Try searching "billing" or "onboarding" to jump straight to the
                most relevant answers.
              </div>
            </div>
            <div className="faqv2__panel">
              <div className="faqv2__search">
                <span className="faqv2__searchIcon" aria-hidden="true">
                  Search
                </span>
                <input
                  className="faqv2__searchInput"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search FAQs (e.g., billing, onboarding...)"
                  aria-label="Search FAQs"
                />
              </div>

              <div
                className="faqv2__cats faqv2__cats--desktop"
                role="tablist"
                aria-label="FAQ categories"
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`faqv2__cat ${
                      activeCategory === cat ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setActiveCategory(cat);
                      setOpenId(null);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat}
                  >
                    <span className="faqv2__catDot" aria-hidden="true" />
                    <span className="faqv2__catText">{cat}</span>
                  </button>
                ))}
              </div>

              <div className="faqv2__catsMobile" aria-label="FAQ category filter">
                <label className="faqv2__filterLabel" htmlFor="faqCategorySelect">
                  <span className="faqv2__filterText">Filter</span>
                </label>

                <div className="faqv2__selectWrap">
                  <select
                    id="faqCategorySelect"
                    className="faqv2__select"
                    value={activeCategory}
                    onChange={(e) => {
                      setActiveCategory(e.target.value);
                      setOpenId(null);
                    }}
                    aria-label="Select FAQ category"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <span className="faqv2__selectChevron" aria-hidden="true">
                    v
                  </span>
                </div>
              </div>

              {(query || activeCategory !== "All") && (
                <button
                  className="faqv2__reset"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("All");
                    setOpenId(null);
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          </aside>

          <main className="faqv2__main">
            <div className="faqv2__topline">
              <div className="faqv2__crumb">
                Category: <b>{activeCategory}</b>
              </div>
              <div className="faqv2__count">
                Showing <b>{filtered.length}</b> item
                {filtered.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="faqv2__list">
              {filtered.length === 0 ? (
                <div className="faqv2__empty">
                  <div className="faqv2__emptyTitle">No matches found</div>
                  <div className="faqv2__emptyBody">
                    Try a different keyword or choose a different category.
                  </div>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isOpen = openId === item.id;
                  const panelId = `faq-panel-${item.id}`;

                  return (
                    <article
                      key={item.id}
                      className={`faqv2__item ${isOpen ? "is-open" : ""}`}
                      style={{ "--delay": `${idx * 45}ms` }}
                    >
                      <button
                        className="faqv2__q"
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                      >
                        <div className="faqv2__qTextWrap">
                          <div className="faqv2__pill">{item.category}</div>
                          <div className="faqv2__qText">{item.question}</div>
                        </div>

                        <span className="faqv2__icon" aria-hidden="true">
                          <span className="faqv2__iconLine" />
                          <span className="faqv2__iconLine faqv2__iconLine--v" />
                        </span>
                      </button>

                      <div
                        id={panelId}
                        className="faqv2__aWrap"
                        role="region"
                        aria-label="FAQ answer"
                      >
                        <div className="faqv2__a">
                          <div className="faqv2__aInner">{item.answer}</div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
