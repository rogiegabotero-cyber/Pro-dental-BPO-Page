import { useEffect, useMemo, useRef, useState } from "react";
import "../assets/Style/faq.css";

const FAQ_DATA = [
  {
    id: "what-is-BPO",
    category: "General",
    question: "What is Pro-Dental BPO?",
    answer:
      "Pro-Dental BPO is a professional practice support organization that helps dental offices streamline operations, strengthen patient experience, and grow sustainably—so clinicians can focus more on care and less on admin work.",
  },
  {
    id: "who-can-join",
    category: "General",
    question: "Who can partner with Pro-Dental BPO?",
    answer:
      "Most commonly, independent dental practice owners who want operational support while maintaining clinical autonomy. Some partners are solo practices, while others are multi-location groups.",
  },
  {
    id: "clinical-control",
    category: "Partnership",
    question: "Do I keep clinical autonomy if I partner with Pro-Dental BPO?",
    answer:
      "Yes. In most BPO models, clinical decisions remain with the dentist(s). Pro-Dental BPO supports the non-clinical side such as billing systems, HR processes, marketing support, training, and reporting.",
  },
  {
    id: "services-included",
    category: "Services",
    question: "What services does Pro-Dental BPO provide to partner practices?",
    answer:
      "Common support areas include revenue cycle support, accounting/finance reporting, HR and recruiting support, operational playbooks, vendor negotiations, marketing assistance, and performance dashboards. Exact support depends on the partnership setup.",
  },
  {
    id: "onboarding-time",
    category: "Onboarding",
    question: "How long does onboarding typically take?",
    answer:
      "As the Employer of Record  Pro-Dental BPO will manage the entire Talent Management process, from hiring and training to payroll, taxes and compliance. Eliminate all the headaches of dealing with labor compliance, overtime, benefits, etc.  Think of Pro-Dental BPO as a 'Back-office staffing' agency that places well-trained agents to perform your back office function. Ultimately, this means your practice can focus on what matters most: patient care, allowing us to handle the heavy lifting on the backend.",
  },
  {
    id: "fees-and-structure",
    category: "Partnership",
    question: "What is EOR (Employer of Record)",
    answer:
      "Structures vary (service agreement, management support, equity partnership, etc.). The best approach depends on practice goals, desired support depth, and growth plans. Pro-Dental BPO typically aligns incentives around long-term practice health.",
  },
  {
    id: "tech",
    category: "Technology",
    question: "Does Pro-Dental BPO require us to change our software?",
    answer:
      "Keep existing systems, while others choose to migrate to standardized tools for better reporting and workflows. If changes happen, they’re planned to minimize disruption.",
  },
  {
    id: "marketing",
    category: "Services",
    question: "Can Pro-Dental BPO help with marketing and new patient growth?",
    answer:
      "Yes. As your premier BPO partner we can recruit talents in the US and abroad. Giving you full access to a Global talent pool. We can also help you deploy tech like Human Capital Management System to assist in managing talents and scale projects ",
  },
  {
    id: "staffing",
    category: "Operations",
    question: "How can Pro-Dental BPO help you save costs? (instead of 'how can a PBO partnership reduce costs?)",
    answer:
      "Pro-Dental BPO slashes overhead by moving administrative tasks to our specialized remote teams, freeing your staff to focus on clinical excellence and production. More importantly Pro-Dental BPO will improve your ROI by shortening your Revenue Cycle Management and in the long run allowing your practice to become cashflow-positive.",
  },
  {
    id: "cost-savings",
    category: "Operations",
    question: "How can a BPO partnership reduce costs?",
    answer:
      "Cost reductions often come from vendor negotiation, better procurement, process efficiencies, improved scheduling and recall systems, and cleaner revenue cycle workflows (reducing write-offs and delays).",
  },
  {
    id: "insurance",
    category: "Billing",
    question: "Does Pro-Dental BPO help with insurance and billing?",
    answer:
      "Often yes—support can include insurance verification workflows, claims submission processes, denial management, reporting, and training so collections become more consistent.",
  },
  {
    id: "multi-location",
    category: "Growth",
    question: "Can Pro-Dental BPO help me expand to multiple locations?",
    answer:
      "Yes. Partners often benefit from standardized operations, KPI tracking, leadership training, and site-launch playbooks that make growth more repeatable.",
  },
  {
    id: "patient-experience",
    category: "Operations",
    question: "How does a BPO partnership affect patient experience?",
    answer:
      "It improves consistency and service: smoother scheduling, clearer billing, stronger follow-up, and better-trained front desk processes—while clinicians stay focused on patient care.",
  },
  {
    id: "get-started",
    category: "Onboarding",
    question: "How do we get started with Pro-Dental BPO?",
    answer:
      "Typically the first step is a discovery conversation to understand your practice goals, systems, and challenges, followed by a proposal outlining support areas and partnership structure.",
  },
];

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openId, setOpenId] = useState(null);

  const topRef = useRef(null);

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
    const unique = Array.from(new Set(FAQ_DATA.map((x) => x.category)));
    return ["All", ...unique];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="faqv2" ref={topRef}>
      <div className="faqv2__shell">
        <header className="faqv2__hero">
          <div className="faqv2__heroCard">
            <h1 className="faqv2__title">FAQs</h1>
            <p className="faqv2__subtitle">
              Find quick answers about partnerships, services, onboarding, and
              operations—fast.
            </p>
          </div>

          <div className="faqv2__heroGlow" aria-hidden="true" />
        </header>

        <div className="faqv2__grid">
          {/* SIDEBAR */}
          <aside className="faqv2__side">
            <div className="faqv2__tip">
              <div className="faqv2__tipTitle">Tip</div>
              <div className="faqv2__tipBody">
                Try searching “billing” or “onboarding” to jump straight to the
                most relevant answers.
              </div>
            </div>
            <div className="faqv2__panel">
              <div className="faqv2__search">
                <span className="faqv2__searchIcon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="faqv2__searchInput"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search FAQs (e.g., billing, onboarding...)"
                  aria-label="Search FAQs"
                />
              </div>
              
                <div className="faqv2__cats faqv2__cats--desktop" role="tablist" aria-label="FAQ categories">
                {categories.map((cat) => (
                    <button
                    key={cat}
                    className={`faqv2__cat ${activeCategory === cat ? "is-active" : ""}`}
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
                    <span className="faqv2__filterIcon" aria-hidden="true">⎚</span>
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

                    <span className="faqv2__selectChevron" aria-hidden="true">▾</span>
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