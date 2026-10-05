import { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import "../assets/Style/faq.css";
import { defaultFaqPageContent, defaultFaqs } from "../data/defaultContent";
import {
  useCmsCollectionOverride,
  useCmsDocumentOverride,
  useSectionStyleOverride,
} from "../hooks/useCmsData";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { EditableCmsField } from "./EditableCmsField";
import SectionFrame from "./SectionFrame";

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openId, setOpenId] = useState(null);
  const topRef = useRef(null);
  const { items: faqs } = useCmsCollectionOverride("faqs", defaultFaqs);
  const { data: page } = useCmsDocumentOverride("faqPage", defaultFaqPageContent);
  const { style: heroStyle } = useSectionStyleOverride("faq-hero");
  const { style: listStyle } = useSectionStyleOverride("faq-list");
  const ctx = useLayoutEditorContext();
  const editing = Boolean(ctx?.editMode);
  const updatePage = (fieldName, value) => ctx?.updateFieldContent("faqPage", fieldName, value);
  const pageFieldRef = (fieldName) => ({ kind: "content", docId: "faqPage", fieldName });
  const itemFieldRef = (itemId, fieldName) => ({
    kind: "collection",
    collectionName: "faqs",
    itemId,
    fieldName,
  });
  const updateItem = (itemId, fieldName, value) =>
    ctx?.updateCollectionField("faqs", itemId, fieldName, value);

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
        <SectionFrame sectionKey="faq-hero" reorderable={false}>
        <header className="faqv2__hero" style={heroStyle}>
          <div className="faqv2__heroCard">
            <EditableCmsField
              as="h1"
              className="faqv2__title"
              type="text"
              value={page.title}
              onCommit={(value) => updatePage("title", value)}
              sectionKey="faq-hero"
              ariaLabel="Edit FAQ title"
              styleValue={page.titleStyle}
              fieldRef={pageFieldRef("title")}
            />
            <EditableCmsField
              as="p"
              className="faqv2__subtitle"
              type="textarea"
              value={page.subtitle}
              onCommit={(value) => updatePage("subtitle", value)}
              sectionKey="faq-hero"
              ariaLabel="Edit FAQ subtitle"
              styleValue={page.subtitleStyle}
              fieldRef={pageFieldRef("subtitle")}
            />
          </div>

          <div className="faqv2__heroGlow" aria-hidden="true" />
        </header>
        </SectionFrame>

        <SectionFrame sectionKey="faq-list" reorderable={false}>
        <div className="faqv2__grid" style={listStyle}>
          <aside className="faqv2__side">
            <div className="faqv2__tip">
              <EditableCmsField
                as="div"
                className="faqv2__tipTitle"
                type="text"
                value={page.tipTitle}
                onCommit={(value) => updatePage("tipTitle", value)}
                sectionKey="faq-list"
                ariaLabel="Edit tip title"
                styleValue={page.tipTitleStyle}
                fieldRef={pageFieldRef("tipTitle")}
              />
              <EditableCmsField
                as="div"
                className="faqv2__tipBody"
                type="textarea"
                value={page.tipBody}
                onCommit={(value) => updatePage("tipBody", value)}
                sectionKey="faq-list"
                ariaLabel="Edit tip text"
                styleValue={page.tipBodyStyle}
                fieldRef={pageFieldRef("tipBody")}
              />
            </div>
            <div className="faqv2__panel">
              <div className="faqv2__search">
                <span className="faqv2__searchIcon" aria-hidden="true">
                  <FaSearch />
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
                  // While editing, every answer stays open so it can be edited.
                  const isOpen = editing || openId === item.id;
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
                          <EditableCmsField
                            as="div"
                            className="faqv2__qText"
                            type="text"
                            value={item.question}
                            onCommit={(value) => updateItem(item.id, "question", value)}
                            sectionKey="faq-list"
                            ariaLabel="Edit question"
                            styleValue={item.questionStyle}
                            fieldRef={itemFieldRef(item.id, "question")}
                          />
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
                          <EditableCmsField
                            as="div"
                            className="faqv2__aInner"
                            type="textarea"
                            value={item.answer}
                            onCommit={(value) => updateItem(item.id, "answer", value)}
                            sectionKey="faq-list"
                            ariaLabel="Edit answer"
                            styleValue={item.answerStyle}
                            fieldRef={itemFieldRef(item.id, "answer")}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        </div>
        </SectionFrame>
      </div>
    </section>
  );
}
