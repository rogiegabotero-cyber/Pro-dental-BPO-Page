import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaArrowLeft,
  FaArrowsAlt,
  FaBold,
  FaEraser,
  FaEye,
  FaEyeSlash,
  FaFont,
  FaHighlighter,
  FaItalic,
  FaPalette,
  FaPen,
  FaRedo,
  FaRulerCombined,
  FaSave,
  FaStrikethrough,
  FaTextHeight,
  FaTimesCircle,
  FaUnderline,
  FaUndo,
} from "react-icons/fa";
import { db } from "../firebase";
import { PublicHome, PublicFaq, PublicArticles } from "../App";
import { useAdminShell } from "./AdminShellContext";
import {
  useCmsLayout,
  useCmsCollection,
  useCmsDocument,
  normalizeSectionOrder,
  inferBackgroundType,
  customSectionKeys,
  CUSTOM_SECTION_PREFIX,
} from "../hooks/useCmsData";
import { LayoutEditorContext } from "../context/LayoutEditorContext";
import { DraftContentContext } from "../context/DraftContentContext";
import { DRAFTS_COLLECTION } from "../services/pageDrafts";
import { DeviceControls, ResponsiveStage } from "./ResponsivePreview";
import MobileSettingsPanel from "./MobileSettingsPanel";
import NavbarSettings from "./NavbarSettings";
import { mobileFieldKey, normalizeMobileSettings } from "../hooks/useMobileSettings";
import DiscardChangesModal from "../components/DiscardChangesModal";
import { fontOptions } from "../data/fontOptions";
import { fontSizeOptions } from "../data/fontSizeOptions";
import { uploadCmsImage } from "../utils/cmsImageUpload";
import { SPACING_KEYS, emptySpacing } from "../utils/spacing";
import {
  defaultServices,
  defaultBenefits,
  defaultNavbarContent,
  defaultHeroContent,
  defaultAboutContent,
  defaultContactContent,
  defaultServicesSectionContent,
  defaultBenefitsSectionContent,
  defaultFooterSectionContent,
  defaultFaqPageContent,
  defaultFaqs,
} from "../data/defaultContent";
import "../assets/Style/visualPageEditor.css";

// The header isn't part of the draggable/reorderable page flow (App.jsx
// renders it separately from the section order), but it still needs its own
// background/font/spacing bucket like every other section.
const ORDER_SECTION_KEYS = ["hero", "services", "about", "benefits", "contact", "footer"];
const STYLE_SECTION_KEYS = ["navbar", ...ORDER_SECTION_KEYS, "faq-hero", "faq-list", "articles"];

const SECTION_EDIT_ROUTES = {
  hero: "/admin/hero",
  services: "/admin/services",
  about: "/admin/about",
  benefits: "/admin/benefits",
  contact: "/admin/settings",
  footer: "/admin/settings",
};

// Pages the canvas can preview. Only Home is editable; the others are
// read-only views of the live site, each split into named segments the
// filmstrip can jump to.
const EDITOR_PAGES = [
  { id: "home", label: "Home", path: "/", Component: PublicHome },
  {
    id: "faq",
    label: "FAQ",
    path: "/faq",
    Component: PublicFaq,
    segments: ["navbar", "faq-hero", "faq-list", "footer"],
  },
  {
    id: "articles",
    label: "Articles",
    path: "/articles",
    Component: PublicArticles,
    segments: ["navbar", "articles", "footer"],
  },
];

const EXIT_EDIT_MODE = "__EXIT_EDIT_MODE__";

const SECTION_LABELS = {
  navbar: "Header",
  hero: "Hero",
  services: "Services",
  about: "About",
  benefits: "Benefits",
  contact: "Contact",
  footer: "Footer",
  "faq-hero": "FAQ intro",
  "faq-list": "Questions",
  articles: "Articles",
};

// A "standard PC" desktop viewport the canvas is rendered at, then scaled down
// to fit the available space — the same device-preview convention other page
// builders (Wix, Webflow, Framer) use.
const CANVAS_DEVICE_WIDTH = 1440;
const CANVAS_PADDING = 48;
const FILMSTRIP_THUMB_WIDTH = 220;

const CONTENT_DOC_KEYS = [
  "navbar",
  "hero",
  "about",
  "contact",
  "servicesSection",
  "benefitsSection",
  "footerSection",
  "faqPage",
];
const EDITABLE_COLLECTIONS = ["services", "benefits", "faqs"];

const CONTENT_DOC_FALLBACKS = {
  navbar: defaultNavbarContent,
  hero: defaultHeroContent,
  about: defaultAboutContent,
  contact: defaultContactContent,
  servicesSection: defaultServicesSectionContent,
  benefitsSection: defaultBenefitsSectionContent,
  footerSection: defaultFooterSectionContent,
  faqPage: defaultFaqPageContent,
};

const emptyStyle = () => ({
  backgroundColor: "",
  backgroundImage: "",
  fontFamily: "",
  ...emptySpacing(),
});

const GRADIENT_ANGLE_OPTIONS = [
  { label: "Top to bottom", value: "180deg" },
  { label: "Bottom to top", value: "0deg" },
  { label: "Left to right", value: "90deg" },
  { label: "Right to left", value: "270deg" },
  { label: "Diagonal ↘", value: "135deg" },
  { label: "Diagonal ↗", value: "45deg" },
];

const BACKGROUND_SIZE_OPTIONS = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
  { label: "Tile", value: "repeat" },
];

const BACKGROUND_POSITION_OPTIONS = [
  { label: "Center", value: "center" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const emptyFieldStyle = {
  fontFamily: "",
  fontWeight: "",
  fontStyle: "",
  fontSize: "",
  textDecoration: "",
  color: "",
  backgroundColor: "",
  textAlign: "",
  ...emptySpacing(),
};

function emptyPendingExtras() {
  return {
    content: CONTENT_DOC_KEYS.reduce((acc, docId) => {
      acc[docId] = {};
      return acc;
    }, {}),
    collections: EDITABLE_COLLECTIONS.reduce((acc, name) => {
      acc[name] = { order: null, items: {} };
      return acc;
    }, {}),
  };
}

function cloneSnapshot(snapshot) {
  return {
    order: [...snapshot.order],
    customSections: Object.fromEntries(
      Object.entries(snapshot.customSections).map(([id, value]) => [id, { ...value }])
    ),
    mobile: normalizeMobileSettings(snapshot.mobile),
    styles: Object.fromEntries(
      Object.entries(snapshot.styles).map(([key, value]) => [key, { ...value }])
    ),
    content: Object.fromEntries(
      Object.entries(snapshot.content).map(([docId, patch]) => [docId, { ...patch }])
    ),
    collections: Object.fromEntries(
      Object.entries(snapshot.collections).map(([name, entry]) => [
        name,
        {
          order: entry.order ? [...entry.order] : null,
          items: Object.fromEntries(
            Object.entries(entry.items).map(([itemId, patch]) => [itemId, { ...patch }])
          ),
        },
      ])
    ),
  };
}

function snapshotFromLayout(layout) {
  const customSections = Object.fromEntries(
    Object.entries(layout.customSections || {}).map(([id, value]) => [id, { ...value }])
  );
  const customKeys = customSectionKeys(customSections);

  return {
    order: normalizeSectionOrder(layout.order, [...ORDER_SECTION_KEYS, ...customKeys]),
    customSections,
    mobile: normalizeMobileSettings(layout.mobile),
    styles: [...STYLE_SECTION_KEYS, ...customKeys].reduce((acc, key) => {
      acc[key] = { ...emptyStyle(), ...(layout.styles?.[key] || {}) };
      return acc;
    }, {}),
    ...emptyPendingExtras(),
  };
}

// Local draft + commit-on-blur/Enter, matching the contentEditable text commit
// convention elsewhere in this editor (never commits mid-keystroke, which would
// otherwise spam the undo/redo history for every digit typed).
function SpacingNumberInput({ label, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    if (draft === (value ?? "")) return;
    onCommit(draft === "" ? "" : String(parseInt(draft, 10) || 0));
  };

  return (
    <label className="layout-editor-spacing-field">
      <span>{label}</span>
      <input
        type="number"
        step="1"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function SpacingFields({ value, onChange }) {
  const clearSpacing = () => onChange(SPACING_KEYS.reduce((acc, key) => ({ ...acc, [key]: "" }), {}));

  return (
    <div className="layout-editor-spacing-panel">
      <span className="layout-editor-ribbon__caption">Margin (px)</span>
      <div className="layout-editor-spacing-grid">
        <SpacingNumberInput label="Top" value={value.marginTop} onCommit={(v) => onChange({ marginTop: v })} />
        <SpacingNumberInput label="Right" value={value.marginRight} onCommit={(v) => onChange({ marginRight: v })} />
        <SpacingNumberInput label="Bottom" value={value.marginBottom} onCommit={(v) => onChange({ marginBottom: v })} />
        <SpacingNumberInput label="Left" value={value.marginLeft} onCommit={(v) => onChange({ marginLeft: v })} />
      </div>
      <span className="layout-editor-ribbon__caption">Padding (px)</span>
      <div className="layout-editor-spacing-grid">
        <SpacingNumberInput label="Top" value={value.paddingTop} onCommit={(v) => onChange({ paddingTop: v })} />
        <SpacingNumberInput label="Right" value={value.paddingRight} onCommit={(v) => onChange({ paddingRight: v })} />
        <SpacingNumberInput label="Bottom" value={value.paddingBottom} onCommit={(v) => onChange({ paddingBottom: v })} />
        <SpacingNumberInput label="Left" value={value.paddingLeft} onCommit={(v) => onChange({ paddingLeft: v })} />
      </div>
      <button type="button" className="layout-editor-popover__reset" onClick={clearSpacing}>
        Clear spacing
      </button>
    </div>
  );
}

const PAGE_LIST_PATH = "/admin/page-content";
// URL segment that opens the published page itself instead of a draft copy.
const LIVE_PAGE_ID = "live";

// Loads the draft named in the URL and serves it as the content source for
// everything inside the editor, so the published page is never read-modified.
export default function VisualPageEditor() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("loading");
  const isLive = draftId === LIVE_PAGE_ID;

  useEffect(() => {
    if (isLive) return undefined;
    return onSnapshot(
      doc(db, DRAFTS_COLLECTION, draftId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatus("missing");
          return;
        }
        setDraft({ id: snapshot.id, ...snapshot.data() });
        setStatus("ready");
      },
      () => setStatus("missing")
    );
  }, [draftId, isLive]);

  const contentSource = useMemo(
    () => (draft ? { docs: draft.docs || {}, collections: draft.collections || {} } : null),
    [draft]
  );

  useEffect(() => {
    if (!isLive && status === "missing") navigate(PAGE_LIST_PATH, { replace: true });
  }, [status, navigate, isLive]);

  if (isLive) {
    return <DraftEditor draftId={LIVE_PAGE_ID} draftName="Published page (live)" isLive />;
  }

  if (status !== "ready") {
    return <div className="admin-loading">Loading draft…</div>;
  }

  return (
    <DraftContentContext.Provider value={contentSource}>
      <DraftEditor key={draft.id} draftId={draft.id} draftName={draft.name} />
    </DraftContentContext.Provider>
  );
}

function DraftEditor({ draftId, draftName, isLive = false }) {
  const navigate = useNavigate();
  const adminShell = useAdminShell();
  const { data: layout } = useCmsLayout();
  const { items: liveServices } = useCmsCollection("services", defaultServices);
  const { items: liveBenefits } = useCmsCollection("benefits", defaultBenefits);
  const { items: liveFaqs } = useCmsCollection("faqs", defaultFaqs);
  const liveCollectionItems = { services: liveServices, benefits: liveBenefits, faqs: liveFaqs };
  const { data: liveNavbar } = useCmsDocument("navbar", CONTENT_DOC_FALLBACKS.navbar);
  const { data: liveHero } = useCmsDocument("hero", CONTENT_DOC_FALLBACKS.hero);
  const { data: liveAbout } = useCmsDocument("about", CONTENT_DOC_FALLBACKS.about);
  const { data: liveContact } = useCmsDocument("contact", CONTENT_DOC_FALLBACKS.contact);
  const { data: liveServicesSection } = useCmsDocument(
    "servicesSection",
    CONTENT_DOC_FALLBACKS.servicesSection
  );
  const { data: liveBenefitsSection } = useCmsDocument(
    "benefitsSection",
    CONTENT_DOC_FALLBACKS.benefitsSection
  );
  const { data: liveFooterSection } = useCmsDocument(
    "footerSection",
    CONTENT_DOC_FALLBACKS.footerSection
  );
  const { data: liveFaqPage } = useCmsDocument("faqPage", CONTENT_DOC_FALLBACKS.faqPage);
  const liveContentDocs = {
    navbar: liveNavbar,
    hero: liveHero,
    about: liveAbout,
    contact: liveContact,
    servicesSection: liveServicesSection,
    benefitsSection: liveBenefitsSection,
    footerSection: liveFooterSection,
    faqPage: liveFaqPage,
  };
  const fileInputRef = useRef(null);
  const dragKeyRef = useRef(null);
  const cardDragKeyRef = useRef(null);
  const elementDragKeyRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const canvasFrameRef = useRef(null);

  const [editorState, setEditorState] = useState(() => ({
    history: [snapshotFromLayout(layout)],
    index: 0,
  }));
  const [editMode, setEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [dragKey, setDragKey] = useState(null);
  const [cardDragKey, setCardDragKey] = useState(null);
  const [elementDragKey, setElementDragKey] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasContentHeight, setCanvasContentHeight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingNav, setPendingNav] = useState(null);

  const current = editorState.history[editorState.index];
  const hasUnsavedChanges = editorState.index > 0;

  useEffect(() => {
    setEditorState((prev) =>
      prev.index === 0 ? { history: [snapshotFromLayout(layout)], index: 0 } : prev
    );
  }, [layout]);

  // Renders the page at a fixed "desktop" width, then scales the whole frame
  // down to fit the available canvas — matches the device-preview convention
  // used by other page builders.
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return undefined;

    const recompute = () => {
      const available = wrap.clientWidth - CANVAS_PADDING;
      setCanvasScale(available > 0 ? Math.min(1, available / CANVAS_DEVICE_WIDTH) : 1);
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // A CSS transform doesn't reflow the parent's box, so the scroll container
  // needs the scaled height tracked separately (re-measured whenever edits
  // change the page's content height).
  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return undefined;

    const updateHeight = () => setCanvasContentHeight(frame.scrollHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Filmstrip order: the header, then every section in its current
  // (possibly reordered) order.
  const [activePageId, setActivePageId] = useState("home");
  // Responsive testing: null = the normal editable desktop canvas; otherwise a
  // read-only iframe of the real site at { width, height }.
  const [viewport, setViewport] = useState(null);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const previewFrameRef = useRef(null);
  const isResponsive = Boolean(viewport);
  const [sideTab, setSideTab] = useState("inspector");
  const activePage = EDITOR_PAGES.find((page) => page.id === activePageId) || EDITOR_PAGES[0];
  const isHomePage = activePage.id === "home";
  const ActivePageComponent = activePage.Component;
  // Editing on a device: the page is rendered inside an iframe (so its media
  // queries follow the device width) with editor state bridged from here.
  const editingOnDevice = isResponsive && editMode;
  const previewSrc = editingOnDevice
    ? `/editor-frame/${draftId}?page=${activePage.id}`
    : !isLive
    ? `/draft-preview/${draftId}?page=${activePage.id}`
    : activePage.path;
  const quickJumpKeys = useMemo(
    () => (isHomePage ? ["navbar", ...current.order] : activePage.segments),
    [isHomePage, activePage, current.order]
  );

  useEffect(() => {
    canvasWrapRef.current?.scrollTo({ top: 0 });
    setActiveJumpKey("navbar");
  }, [activePageId]);
  const [activeJumpKey, setActiveJumpKey] = useState("navbar");
  const sectionLabel = (key) =>
    SECTION_LABELS[key] ||
    current.customSections[key.slice(CUSTOM_SECTION_PREFIX.length)]?.title ||
    "New page";

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const frame = canvasFrameRef.current;
    if (!wrap || !frame) return undefined;

    const handleScroll = () => {
      const wrapTop = wrap.getBoundingClientRect().top;
      let next = quickJumpKeys[0];
      quickJumpKeys.forEach((key) => {
        const el = frame.querySelector(`[data-section="${key}"]`);
        if (el && el.getBoundingClientRect().top - wrapTop <= 32) {
          next = key;
        }
      });
      setActiveJumpKey(next);
    };

    handleScroll();
    wrap.addEventListener("scroll", handleScroll, { passive: true });
    return () => wrap.removeEventListener("scroll", handleScroll);
  }, [quickJumpKeys]);

  // Keep the responsive preview iframe in sync with unsaved mobile settings.
  const postMobileSettings = useCallback((mobile) => {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: "mobile-settings", mobile },
      window.location.origin
    );
  }, []);

  const scrollToPageSection = useCallback((key) => {
    const previewDoc = previewFrameRef.current?.contentDocument;
    if (previewDoc) {
      previewDoc
        .querySelector(`[data-section="${key}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const wrap = canvasWrapRef.current;
    const frame = canvasFrameRef.current;
    if (!wrap || !frame) return;
    const target = frame.querySelector(`[data-section="${key}"]`);
    if (!target) return;
    const wrapTop = wrap.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    wrap.scrollTo({ top: wrap.scrollTop + (targetTop - wrapTop) - 16, behavior: "smooth" });
  }, []);

  // Filmstrip thumbnails — a live, scaled-down *clone* of each section's
  // real DOM (the same technique the main canvas uses to fit the page at
  // any zoom level), not a rasterized screenshot. That sidesteps rasterizing
  // entirely: no cross-origin canvas tainting, no fighting an ancestor's
  // own scale transform, nothing that can silently produce a broken image.
  // Regenerated a beat after edits settle down.
  const thumbRefs = useRef({});

  const setThumbRef = useCallback(
    (key) => (el) => {
      thumbRefs.current[key] = el;
    },
    []
  );

  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return undefined;

    const timer = setTimeout(() => {
      quickJumpKeys.forEach((key) => {
        const container = thumbRefs.current[key];
        const source = frame.querySelector(`[data-section="${key}"]`);
        if (!container || !source) return;

        const clone = source.cloneNode(true);
        clone
          .querySelectorAll(
            ".section-frame__chrome, .cms-slot-handle, .cms-card-handle, .cms-move-handle"
          )
          .forEach((node) => node.remove());
        clone.classList.remove("section-frame--selected", "section-frame--drag-over");
        clone.style.width = `${CANVAS_DEVICE_WIDTH}px`;
        clone.style.transform = `scale(${FILMSTRIP_THUMB_WIDTH / CANVAS_DEVICE_WIDTH})`;
        clone.style.transformOrigin = "top left";
        clone.style.pointerEvents = "none";

        container.replaceChildren(clone);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [current, canvasContentHeight, quickJumpKeys]);

  const pushSnapshot = useCallback((mutate) => {
    setEditorState((prev) => {
      const base = prev.history[prev.index];
      const next = mutate(cloneSnapshot(base));
      const truncated = prev.history.slice(0, prev.index + 1);
      return { history: [...truncated, next], index: truncated.length };
    });
  }, []);

  const undo = useCallback(() => {
    setEditorState((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const redo = useCallback(() => {
    setEditorState((prev) =>
      prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
  }, []);

  const reorder = useCallback(
    (draggedKey, targetKey) => {
      if (!draggedKey || draggedKey === targetKey) return;
      pushSnapshot((snapshot) => {
        const order = [...snapshot.order];
        const fromIndex = order.indexOf(draggedKey);
        const toIndex = order.indexOf(targetKey);
        if (fromIndex === -1 || toIndex === -1) return snapshot;
        order.splice(fromIndex, 1);
        order.splice(toIndex, 0, draggedKey);
        return { ...snapshot, order };
      });
    },
    [pushSnapshot]
  );

  const addCustomSection = useCallback(
    (afterKey) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const key = `${CUSTOM_SECTION_PREFIX}${id}`;
      pushSnapshot((snapshot) => {
        const order = [...snapshot.order];
        const afterIndex = afterKey ? order.indexOf(afterKey) : -1;
        order.splice(afterIndex + 1, 0, key);
        return {
          ...snapshot,
          order,
          customSections: {
            ...snapshot.customSections,
            [id]: { title: "New page", body: "Click to edit this text." },
          },
          styles: { ...snapshot.styles, [key]: emptyStyle() },
        };
      });
      setSelectedSection(key);
      setSelectedField(null);
      // Wait for the new panel to render, then bring it into view.
      setTimeout(() => scrollToPageSection(key), 80);
    },
    [pushSnapshot, scrollToPageSection]
  );

  const removeCustomSection = useCallback(
    (key) => {
      const id = key.slice(CUSTOM_SECTION_PREFIX.length);
      pushSnapshot((snapshot) => {
        const customSections = { ...snapshot.customSections };
        const styles = { ...snapshot.styles };
        delete customSections[id];
        delete styles[key];
        return {
          ...snapshot,
          order: snapshot.order.filter((entry) => entry !== key),
          customSections,
          styles,
        };
      });
      setSelectedSection((prev) => (prev === key ? null : prev));
      setSelectedField(null);
    },
    [pushSnapshot]
  );

  const updateMobileSettings = useCallback(
    (mobile) => {
      pushSnapshot((snapshot) => ({ ...snapshot, mobile }));
    },
    [pushSnapshot]
  );

  const setFieldHiddenOnMobile = useCallback(
    (fieldRef, hidden) => {
      const key = mobileFieldKey(fieldRef);
      pushSnapshot((snapshot) => {
        const hiddenFields = { ...snapshot.mobile.hiddenFields };
        if (hidden) {
          hiddenFields[key] = true;
        } else {
          delete hiddenFields[key];
        }
        return { ...snapshot, mobile: { ...snapshot.mobile, hiddenFields } };
      });
    },
    [pushSnapshot]
  );

  const updateCustomSection = useCallback(
    (id, patch) => {
      pushSnapshot((snapshot) => {
        if (!snapshot.customSections[id]) return snapshot;
        return {
          ...snapshot,
          customSections: {
            ...snapshot.customSections,
            [id]: { ...snapshot.customSections[id], ...patch },
          },
        };
      });
    },
    [pushSnapshot]
  );

  const updateStyle = useCallback(
    (sectionKey, patch) => {
      pushSnapshot((snapshot) => ({
        ...snapshot,
        styles: {
          ...snapshot.styles,
          [sectionKey]: { ...snapshot.styles[sectionKey], ...patch },
        },
      }));
    },
    [pushSnapshot]
  );

  const updateFieldContent = useCallback(
    (docId, fieldName, value) => {
      pushSnapshot((snapshot) => ({
        ...snapshot,
        content: {
          ...snapshot.content,
          [docId]: { ...snapshot.content[docId], [fieldName]: value },
        },
      }));
    },
    [pushSnapshot]
  );

  const updateCollectionField = useCallback(
    (collectionName, itemId, fieldName, value) => {
      pushSnapshot((snapshot) => {
        const entry = snapshot.collections[collectionName];
        return {
          ...snapshot,
          collections: {
            ...snapshot.collections,
            [collectionName]: {
              ...entry,
              items: {
                ...entry.items,
                [itemId]: { ...entry.items[itemId], [fieldName]: value },
              },
            },
          },
        };
      });
    },
    [pushSnapshot]
  );

  const reorderCollectionItem = useCallback(
    (collectionName, draggedItemId, targetItemId) => {
      if (!draggedItemId || draggedItemId === targetItemId) return;
      pushSnapshot((snapshot) => {
        const entry = snapshot.collections[collectionName];
        const liveIds = liveCollectionItems[collectionName].map((item) => item.id);
        const order = entry.order ? [...entry.order] : [...liveIds];
        const fromIndex = order.indexOf(draggedItemId);
        const toIndex = order.indexOf(targetItemId);
        if (fromIndex === -1 || toIndex === -1) return snapshot;
        order.splice(fromIndex, 1);
        order.splice(toIndex, 0, draggedItemId);
        return {
          ...snapshot,
          collections: {
            ...snapshot.collections,
            [collectionName]: { ...entry, order },
          },
        };
      });
    },
    [pushSnapshot, liveCollectionItems]
  );

  const selectSection = useCallback((key) => {
    setSelectedSection(key);
    setSelectedField(null);
  }, []);

  const selectField = useCallback((key, fieldSelection) => {
    setSelectedSection(key);
    setSelectedField(fieldSelection);
  }, []);

  const handleDragStart = useCallback((key) => {
    dragKeyRef.current = key;
    setDragKey(key);
  }, []);
  const handleDragOver = useCallback(() => {}, []);
  const handleDragEnd = useCallback(() => {
    dragKeyRef.current = null;
    setDragKey(null);
  }, []);
  const handleDrop = useCallback(
    (targetKey) => {
      const activeDragKey = dragKeyRef.current;
      dragKeyRef.current = null;
      setDragKey(null);
      if (activeDragKey) reorder(activeDragKey, targetKey);
    },
    [reorder]
  );

  const handleCardDragStart = useCallback((collectionName, itemId) => {
    cardDragKeyRef.current = { collectionName, itemId };
    setCardDragKey({ collectionName, itemId });
  }, []);
  const handleCardDragOver = useCallback(() => {}, []);
  const handleCardDragEnd = useCallback(() => {
    cardDragKeyRef.current = null;
    setCardDragKey(null);
  }, []);
  const handleCardDrop = useCallback(
    (collectionName, targetItemId) => {
      const active = cardDragKeyRef.current;
      cardDragKeyRef.current = null;
      setCardDragKey(null);
      if (active && active.collectionName === collectionName) {
        reorderCollectionItem(collectionName, active.itemId, targetItemId);
      }
    },
    [reorderCollectionItem]
  );

  const reorderContentElement = useCallback(
    (docId, currentOrder, draggedKey, targetKey) => {
      if (!draggedKey || draggedKey === targetKey) return;
      pushSnapshot((snapshot) => {
        const order = [...currentOrder];
        const fromIndex = order.indexOf(draggedKey);
        const toIndex = order.indexOf(targetKey);
        if (fromIndex === -1 || toIndex === -1) return snapshot;
        order.splice(fromIndex, 1);
        order.splice(toIndex, 0, draggedKey);
        return {
          ...snapshot,
          content: {
            ...snapshot.content,
            [docId]: { ...snapshot.content[docId], elementOrder: order },
          },
        };
      });
    },
    [pushSnapshot]
  );

  const handleElementDragStart = useCallback((docId, slotKey) => {
    elementDragKeyRef.current = { docId, slotKey };
    setElementDragKey({ docId, slotKey });
  }, []);
  const handleElementDragOver = useCallback(() => {}, []);
  const handleElementDragEnd = useCallback(() => {
    elementDragKeyRef.current = null;
    setElementDragKey(null);
  }, []);
  const handleElementDrop = useCallback(
    (docId, targetKey, currentOrder) => {
      const active = elementDragKeyRef.current;
      elementDragKeyRef.current = null;
      setElementDragKey(null);
      if (active && active.docId === docId) {
        reorderContentElement(docId, currentOrder, active.slotKey, targetKey);
      }
    },
    [reorderContentElement]
  );

  const jumpToEdit = useCallback(
    (key) => {
      const to = SECTION_EDIT_ROUTES[key];
      if (!to) return;
      if (hasUnsavedChanges) {
        setPendingNav(to);
      } else {
        navigate(to);
      }
    },
    [hasUnsavedChanges, navigate]
  );

  const toggleEditMode = useCallback(() => {
    if (editMode && hasUnsavedChanges) {
      setPendingNav(EXIT_EDIT_MODE);
      return;
    }
    if (!editMode) {
      adminShell?.collapseSidebar();
    }
    setEditMode((prev) => !prev);
    setSelectedSection(null);
    setSelectedField(null);
  }, [editMode, hasUnsavedChanges, adminShell]);

  const goToPageList = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingNav(PAGE_LIST_PATH);
    } else {
      navigate(PAGE_LIST_PATH);
    }
  }, [hasUnsavedChanges, navigate]);

  const cancelDiscard = useCallback(() => setPendingNav(null), []);

  const confirmDiscard = useCallback(() => {
    setEditorState({ history: [snapshotFromLayout(layout)], index: 0 });
    setSelectedSection(null);
    setSelectedField(null);

    if (pendingNav === EXIT_EDIT_MODE) {
      setEditMode(false);
    } else if (pendingNav) {
      navigate(pendingNav);
    }

    setPendingNav(null);
  }, [layout, pendingNav, navigate]);

  // Writes the pending edits straight to the published documents.
  const saveToLivePage = useCallback(async () => {
    const writes = [
      setDoc(
        doc(db, "siteContent", "layout"),
        {
          order: current.order,
          styles: current.styles,
          customSections: current.customSections,
          mobile: current.mobile,
          updatedAt: serverTimestamp(),
        },
        // mergeFields replaces these fields wholesale, so a deleted page
        // (or its style bucket) doesn't linger in the stored document.
        { mergeFields: ["order", "styles", "customSections", "mobile", "updatedAt"] }
      ),
    ];

    CONTENT_DOC_KEYS.forEach((docId) => {
      const patch = current.content[docId];
      if (patch && Object.keys(patch).length > 0) {
        writes.push(
          setDoc(
            doc(db, "siteContent", docId),
            { ...patch, updatedAt: serverTimestamp() },
            { merge: true }
          )
        );
      }
    });

    EDITABLE_COLLECTIONS.forEach((collectionName) => {
      const entry = current.collections[collectionName];
      const liveItems = liveCollectionItems[collectionName];
      const liveIds = liveItems.map((item) => item.id);
      const finalOrder = entry.order ? normalizeSectionOrder(entry.order, liveIds) : liveIds;
      const liveOrderById = Object.fromEntries(
        liveItems.map((item) => [item.id, Number(item.order || 0)])
      );

      finalOrder.forEach((itemId, index) => {
        const fieldPatch = entry.items[itemId];
        const nextOrder = index + 1;
        const orderChanged = liveOrderById[itemId] !== nextOrder;
        const hasFieldPatch = Boolean(fieldPatch && Object.keys(fieldPatch).length > 0);

        if (!hasFieldPatch && !orderChanged) return;

        writes.push(
          setDoc(
            doc(db, collectionName, itemId),
            {
              ...(hasFieldPatch ? fieldPatch : {}),
              ...(orderChanged ? { order: nextOrder } : {}),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        );
      });
    });

    await Promise.all(writes);
  }, [current, liveCollectionItems]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage("");

    try {
      if (isLive) {
        await saveToLivePage();
        setMessage("Changes published.");
        setPreviewReloadKey((key) => key + 1);
        return;
      }

      // Everything is written to the draft; the published documents are only
      // touched when the draft is explicitly published from the page list.
      const docs = {
        layout: {
          ...layout,
          order: current.order,
          styles: current.styles,
          customSections: current.customSections,
          mobile: current.mobile,
        },
      };
      CONTENT_DOC_KEYS.forEach((docId) => {
        docs[docId] = { ...liveContentDocs[docId], ...(current.content[docId] || {}) };
      });

      const collections = {};
      EDITABLE_COLLECTIONS.forEach((collectionName) => {
        const entry = current.collections[collectionName];
        const liveItems = liveCollectionItems[collectionName];
        const liveIds = liveItems.map((item) => item.id);
        const finalOrder = entry.order ? normalizeSectionOrder(entry.order, liveIds) : liveIds;
        const byId = Object.fromEntries(liveItems.map((item) => [item.id, item]));

        collections[collectionName] = finalOrder.map((itemId, index) => ({
          ...byId[itemId],
          ...(entry.items[itemId] || {}),
          id: itemId,
          order: index + 1,
        }));
      });

      // mergeFields replaces these fields wholesale, so removed pages and
      // styles don't linger in the stored draft.
      await setDoc(
        doc(db, DRAFTS_COLLECTION, draftId),
        { docs, collections, updatedAt: serverTimestamp() },
        { mergeFields: ["docs", "collections", "updatedAt"] }
      );

      setEditorState({
        history: [
          {
            order: current.order,
            styles: current.styles,
            customSections: current.customSections,
            mobile: current.mobile,
            ...emptyPendingExtras(),
          },
        ],
        index: 0,
      });
      setMessage("Draft saved.");
      setPreviewReloadKey((key) => key + 1);
    } catch {
      setMessage("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [current, layout, liveContentDocs, liveCollectionItems, draftId, isLive, saveToLivePage]);

  const keyboardNudgeStateRef = useRef(null);

  useEffect(() => {
    if (!editMode) return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement &&
          !["color", "checkbox", "radio", "range"].includes(target.type)) ||
        target?.isContentEditable;

      if (isTextInput) return;

      const key = event.key.toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;

      if (withModifier && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (withModifier && ((key === "z" && event.shiftKey) || key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!ARROW_KEYS.includes(event.key)) return;

      const isFormControl =
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLInputElement && ["color", "range"].includes(target.type));
      if (isFormControl) return;

      const state = keyboardNudgeStateRef.current;
      if (!state.selectedField && !state.selectedSection) return;

      const step = event.shiftKey ? 10 : 1;
      const base = state.selectedField
        ? state.resolveFieldStyle(state.selectedField)
        : state.current.styles[state.selectedSection] || {};
      const apply = state.selectedField
        ? state.updateSelectedFieldStyle
        : (patch) => state.updateStyle(state.selectedSection, patch);

      if (event.key === "ArrowUp") {
        apply({ marginTop: String((parseInt(base.marginTop, 10) || 0) - step) });
      } else if (event.key === "ArrowDown") {
        apply({ marginTop: String((parseInt(base.marginTop, 10) || 0) + step) });
      } else if (event.key === "ArrowLeft") {
        apply({ marginLeft: String((parseInt(base.marginLeft, 10) || 0) - step) });
      } else if (event.key === "ArrowRight") {
        apply({ marginLeft: String((parseInt(base.marginLeft, 10) || 0) + step) });
      }
      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editMode, undo, redo]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectedRaw = selectedSection ? current.styles[selectedSection] : emptyStyle();
  const selectedBackgroundType = inferBackgroundType(selectedRaw);

  const setBackgroundType = (type) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundType: type });
  };

  const handleColorChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundType: "color", backgroundColor: event.target.value });
  };

  const clearBackground = () => {
    if (!selectedSection) return;
    updateStyle(selectedSection, {
      backgroundType: "",
      backgroundColor: "",
      backgroundImage: "",
      backgroundSize: "",
      backgroundPosition: "",
      gradientFrom: "",
      gradientTo: "",
      gradientAngle: "",
      overlayColor: "",
      overlayOpacity: "",
    });
  };

  const handleGradientFromChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundType: "gradient", gradientFrom: event.target.value });
  };

  const handleGradientToChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundType: "gradient", gradientTo: event.target.value });
  };

  const handleGradientAngleChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { gradientAngle: event.target.value });
  };

  const clearBackgroundImage = () => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundImage: "" });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedSection) return;

    setUploading(true);
    try {
      const url = await uploadCmsImage(file, `layout-sections/${selectedSection}`);
      updateStyle(selectedSection, { backgroundType: "image", backgroundImage: url });
    } catch (error) {
      setMessage("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundSizeChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundSize: event.target.value });
  };

  const handleBackgroundPositionChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { backgroundPosition: event.target.value });
  };

  const handleOverlayColorChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, {
      overlayColor: event.target.value,
      overlayOpacity: selectedRaw.overlayOpacity || "0.4",
    });
  };

  const handleOverlayOpacityChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, {
      overlayColor: selectedRaw.overlayColor || "#000000",
      overlayOpacity: event.target.value,
    });
  };

  const clearOverlay = () => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { overlayColor: "", overlayOpacity: "" });
  };

  const handleFontChange = (event) => {
    if (!selectedSection) return;
    updateStyle(selectedSection, { fontFamily: event.target.value });
  };

  const resolveFieldStyle = (fieldRef) => {
    if (!fieldRef) return emptyFieldStyle;
    const styleKey = `${fieldRef.fieldName}Style`;
    if (fieldRef.kind === "content") {
      const live = liveContentDocs[fieldRef.docId]?.[styleKey] || {};
      const pending = current.content[fieldRef.docId]?.[styleKey];
      return { ...emptyFieldStyle, ...live, ...pending };
    }
    const liveItems = liveCollectionItems[fieldRef.collectionName] || [];
    const liveItem = liveItems.find((item) => item.id === fieldRef.itemId);
    const live = liveItem?.[styleKey] || {};
    const pending = current.collections[fieldRef.collectionName]?.items[fieldRef.itemId]?.[styleKey];
    return { ...emptyFieldStyle, ...live, ...pending };
  };

  const fieldStyle = resolveFieldStyle(selectedField);
  const fieldDecorationTokens = (fieldStyle.textDecoration || "").split(" ").filter(Boolean);
  const hasFieldDecoration = (token) => fieldDecorationTokens.includes(token);

  const updateFieldStyle = (fieldRef, patch) => {
    if (!fieldRef) return;
    const styleKey = `${fieldRef.fieldName}Style`;
    const merged = { ...resolveFieldStyle(fieldRef), ...patch };
    if (fieldRef.kind === "content") {
      updateFieldContent(fieldRef.docId, styleKey, merged);
    } else {
      updateCollectionField(fieldRef.collectionName, fieldRef.itemId, styleKey, merged);
    }
  };

  const updateSelectedFieldStyle = (patch) => updateFieldStyle(selectedField, patch);

  keyboardNudgeStateRef.current = {
    selectedField,
    selectedSection,
    resolveFieldStyle,
    updateSelectedFieldStyle,
    updateStyle,
    current,
  };

  const handleFieldFontChange = (event) => {
    updateSelectedFieldStyle({ fontFamily: event.target.value });
  };

  const handleFieldSizeChange = (event) => {
    updateSelectedFieldStyle({ fontSize: event.target.value });
  };

  const toggleFieldBold = () => {
    updateSelectedFieldStyle({ fontWeight: fieldStyle.fontWeight === "700" ? "" : "700" });
  };

  const toggleFieldItalic = () => {
    updateSelectedFieldStyle({
      fontStyle: fieldStyle.fontStyle === "italic" ? "" : "italic",
    });
  };

  const toggleFieldDecoration = (token) => {
    const nextTokens = hasFieldDecoration(token)
      ? fieldDecorationTokens.filter((entry) => entry !== token)
      : [...fieldDecorationTokens, token];
    updateSelectedFieldStyle({ textDecoration: nextTokens.join(" ") });
  };

  const handleFieldColorChange = (event) => {
    updateSelectedFieldStyle({ color: event.target.value });
  };

  const clearFieldColor = () => updateSelectedFieldStyle({ color: "" });

  const handleFieldHighlightChange = (event) => {
    updateSelectedFieldStyle({ backgroundColor: event.target.value });
  };

  const clearFieldHighlight = () => updateSelectedFieldStyle({ backgroundColor: "" });

  const toggleFieldAlign = (align) => {
    updateSelectedFieldStyle({ textAlign: fieldStyle.textAlign === align ? "" : align });
  };

  const clearFieldFormatting = () => {
    updateSelectedFieldStyle({ ...emptyFieldStyle });
  };

  // --- Bridge to the editable iframe used when editing on a phone/tablet ---
  const liveFieldStylesJson = JSON.stringify(
    (() => {
      const pickStyles = (source) =>
        Object.fromEntries(
          Object.entries(source || {}).filter(
            ([key, value]) => key.endsWith("Style") && value && typeof value === "object"
          )
        );
      return {
        content: Object.fromEntries(
          Object.entries(liveContentDocs).map(([docId, data]) => [docId, pickStyles(data)])
        ),
        collections: Object.fromEntries(
          Object.entries(liveCollectionItems).map(([name, items]) => [
            name,
            Object.fromEntries(items.map((item) => [item.id, pickStyles(item)])),
          ])
        ),
      };
    })()
  );

  const sendEditorState = useCallback(() => {
    const frameWindow = previewFrameRef.current?.contentWindow;
    if (!frameWindow) return;
    try {
      frameWindow.postMessage(
        {
          type: "editor-state",
          state: {
            editMode: true,
            deviceFrame: true,
            mobile: current.mobile,
            pendingOrder: current.order,
            pendingCustomSections: current.customSections,
            pendingStyles: current.styles,
            pendingContent: current.content,
            pendingCollections: current.collections,
            selectedSection,
            selectedField,
            dragKey,
            cardDragKey,
            elementDragKey,
            liveFieldStyles: JSON.parse(liveFieldStylesJson),
          },
        },
        window.location.origin
      );
    } catch {
      // A value that cannot be cloned should never break editing.
    }
  }, [
    current,
    selectedSection,
    selectedField,
    dragKey,
    cardDragKey,
    elementDragKey,
    liveFieldStylesJson,
  ]);

  const sendEditorStateRef = useRef(sendEditorState);
  sendEditorStateRef.current = sendEditorState;
  const bridgeActionsRef = useRef({});

  useEffect(() => {
    if (!editingOnDevice) return undefined;

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      const data = event.data;
      if (data?.type === "editor-frame-ready") {
        sendEditorStateRef.current();
      } else if (data?.type === "editor-call") {
        const action = bridgeActionsRef.current[data.fn];
        if (typeof action === "function") action(...(data.args || []));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editingOnDevice]);

  useEffect(() => {
    if (editingOnDevice) sendEditorState();
  }, [editingOnDevice, sendEditorState]);

  useEffect(() => {
    if (isResponsive) postMobileSettings(current.mobile);
  }, [isResponsive, current.mobile, postMobileSettings]);

  const mobileNavLinks = useMemo(() => {
    const navbarDoc = { ...liveNavbar, ...(current.content.navbar || {}) };
    const extras = Array.isArray(navbarDoc.extraLinks) ? navbarDoc.extraLinks : [];
    return [
      { id: "services", label: navbarDoc.servicesLabel || "Services" },
      { id: "about", label: navbarDoc.aboutLabel || "About" },
      { id: "benefits", label: navbarDoc.benefitsLabel || "Benefits" },
      { id: "articles", label: navbarDoc.articlesLabel || "Articles" },
      { id: "contact", label: navbarDoc.contactLabel || "Contact" },
      { id: "faq", label: navbarDoc.faqLabel || "FAQ" },
      ...extras.map((link) => ({ id: `extra-${link.id}`, label: link.label })),
    ];
  }, [liveNavbar, current.content.navbar]);

  const mobileSections = current.order.map((key) => ({
    key,
    label:
      SECTION_LABELS[key] ||
      current.customSections[key.slice(CUSTOM_SECTION_PREFIX.length)]?.title ||
      "New page",
  }));

  const contextValue = useMemo(
    () => ({
      editMode,
      canvasScale,
      pendingOrder: current.order,
      pendingCustomSections: current.customSections,
      addCustomSection,
      removeCustomSection,
      updateCustomSection,
      pendingStyles: current.styles,
      pendingContent: current.content,
      pendingCollections: current.collections,
      selectedSection,
      selectSection,
      selectedField,
      selectField,
      dragKey,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      jumpToEdit,
      updateFieldContent,
      updateCollectionField,
      updateStyle,
      resolveFieldStyle,
      updateFieldStyle,
      cardDragKey,
      handleCardDragStart,
      handleCardDragOver,
      handleCardDrop,
      handleCardDragEnd,
      elementDragKey,
      handleElementDragStart,
      handleElementDragOver,
      handleElementDrop,
      handleElementDragEnd,
    }),
    [
      editMode,
      canvasScale,
      current,
      addCustomSection,
      removeCustomSection,
      updateCustomSection,
      selectedSection,
      selectSection,
      selectedField,
      selectField,
      dragKey,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      jumpToEdit,
      updateFieldContent,
      updateCollectionField,
      updateStyle,
      resolveFieldStyle,
      updateFieldStyle,
      cardDragKey,
      handleCardDragStart,
      handleCardDragOver,
      handleCardDrop,
      handleCardDragEnd,
      elementDragKey,
      handleElementDragStart,
      handleElementDragOver,
      handleElementDrop,
      handleElementDragEnd,
    ]
  );

  bridgeActionsRef.current = contextValue;

  // Mobile settings are only reachable while editing on a device.
  const showMobileTab = editingOnDevice && sideTab === "mobile";

  const inspectorTitle = selectedField
    ? selectedField.fieldName
    : selectedSection
    ? SECTION_LABELS[selectedSection] || selectedSection
    : "Nothing selected";

  return (
    <LayoutEditorContext.Provider value={contextValue}>
      <div className="layout-editor">
        <header className="layout-editor-topbar">
          <div className="layout-editor-toolbar__group">
            <button
              type="button"
              className="layout-editor-toolbar__button"
              onClick={goToPageList}
              title="Back to the page list"
            >
              <FaArrowLeft /> Pages
            </button>
            <span
              className="layout-editor-toolbar__hint"
              title={
                isLive
                  ? "Saving publishes changes to the live site immediately"
                  : "You are editing a draft copy"
              }
            >
              {isLive ? "Editing the live page" : `Draft: ${draftName}`}
            </span>
            <button
              type="button"
              className="layout-editor-toolbar__button layout-editor-toolbar__button--primary"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
            >
              <FaSave /> {saving ? "Saving…" : isLive ? "Save & publish" : "Save"}
            </button>
            <button
              type="button"
              className="layout-editor-toolbar__button"
              onClick={undo}
              disabled={!editMode || editorState.index === 0}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <FaUndo />
            </button>
            <button
              type="button"
              className="layout-editor-toolbar__button"
              onClick={redo}
              disabled={!editMode || editorState.index === editorState.history.length - 1}
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <FaRedo />
            </button>
            {message && <span className="layout-editor-toolbar__hint">{message}</span>}
          </div>

          <DeviceControls
            viewport={viewport}
            onChange={setViewport}
            onReload={() => setPreviewReloadKey((key) => key + 1)}
          />

          <button
            type="button"
            className={`layout-editor-toolbar__button layout-editor-toolbar__button--mode${
              editMode ? " is-active" : ""
            }`}
            onClick={toggleEditMode}
            aria-pressed={editMode}
            title={
              editMode
                ? "Exit edit mode"
                : "Edit this page"
            }
          >
            {editMode ? <FaEye /> : <FaPen />} {editMode ? "Preview" : "Edit this page"}
          </button>
        </header>

        <div className="layout-editor-body">
          {isResponsive && (
            <ResponsiveStage
              src={previewSrc}
              viewport={viewport}
              onResize={(width) =>
                setViewport((prev) => ({ ...prev, deviceId: "custom", width }))
              }
              reloadKey={previewReloadKey}
              iframeRef={previewFrameRef}
              onLoad={() => postMobileSettings(current.mobile)}
            />
          )}
          <div
            className="layout-editor-canvas"
            ref={canvasWrapRef}
            style={isResponsive ? { display: "none" } : undefined}
          >
            <div
              className="layout-editor-frame-shell"
              style={{
                width: CANVAS_DEVICE_WIDTH * canvasScale,
                height: canvasContentHeight * canvasScale,
              }}
            >
              <div
                ref={canvasFrameRef}
                className="layout-editor-frame"
                style={{ width: CANVAS_DEVICE_WIDTH, transform: `scale(${canvasScale})` }}
              >
                <ActivePageComponent />
              </div>
            </div>
          </div>

          <aside className="layout-editor-sidepanel">
            <div className="layout-editor-sidepanel__header">
              <div>
                <span className="layout-editor-sidepanel__eyebrow">
                  {showMobileTab
                    ? "Phones (768px and narrower)"
                    : selectedField
                    ? "Text"
                    : selectedSection
                    ? "Section"
                    : "Inspector"}
                </span>
                <h3 className="layout-editor-sidepanel__title">
                  {showMobileTab ? "Mobile settings" : inspectorTitle}
                </h3>
              </div>
              {editingOnDevice && (
                <div className="layout-editor-sidetabs" role="tablist" aria-label="Side panel">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!showMobileTab}
                    className={`layout-editor-sidetabs__button${showMobileTab ? "" : " is-active"}`}
                    onClick={() => setSideTab("inspector")}
                    title="Style the selected item"
                  >
                    Inspector
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showMobileTab}
                    className={`layout-editor-sidetabs__button${showMobileTab ? " is-active" : ""}`}
                    onClick={() => setSideTab("mobile")}
                  >
                    Mobile
                  </button>
                </div>
              )}
              {!showMobileTab && (selectedSection || selectedField) && (
                <button
                  type="button"
                  className="layout-editor-sidepanel__close"
                  onClick={() => {
                    setSelectedSection(null);
                    setSelectedField(null);
                  }}
                  aria-label="Deselect"
                  title="Deselect"
                >
                  <FaTimesCircle />
                </button>
              )}
            </div>

            {showMobileTab && (
              <MobileSettingsPanel
                mobile={current.mobile}
                sections={mobileSections}
                navLinks={mobileNavLinks}
                onChange={updateMobileSettings}
              />
            )}

            <div
              className="layout-editor-sidepanel__body"
              style={showMobileTab ? { display: "none" } : undefined}
            >
              {editMode && !selectedSection && !selectedField && (
                <p className="layout-editor-sidepanel__hint">
                  Click a section, image, or piece of text on the page to edit it.
                </p>
              )}

              {selectedField && editingOnDevice && (
                <div className="layout-editor-panel-section">
                  <span className="layout-editor-panel-section__label">
                    <FaEyeSlash /> Phone visibility
                  </span>
                  <label className="layout-editor-check">
                    <input
                      type="checkbox"
                      checked={Boolean(current.mobile.hiddenFields[mobileFieldKey(selectedField)])}
                      onChange={(event) => setFieldHiddenOnMobile(selectedField, event.target.checked)}
                    />
                    <span>Hide this {selectedField.isImage ? "image" : "element"} on phones</span>
                  </label>
                </div>
              )}

              {selectedField && (
                <>
                  {!selectedField.isImage && (
                    <>
                      <div className="layout-editor-panel-section">
                        <span className="layout-editor-panel-section__label">Font</span>
                        <div className="layout-editor-panel-section__row">
                          <select
                            className="layout-editor-ribbon__select"
                            value={fieldStyle.fontFamily || ""}
                            onChange={handleFieldFontChange}
                            aria-label="Font family"
                          >
                            {fontOptions.map((option) => (
                              <option key={option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="layout-editor-ribbon__select layout-editor-ribbon__select--narrow"
                            value={fieldStyle.fontSize || ""}
                            onChange={handleFieldSizeChange}
                            aria-label="Font size"
                          >
                            {fontSizeOptions.map((option) => (
                              <option key={option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="layout-editor-panel-section">
                        <span className="layout-editor-panel-section__label">Style</span>
                        <div className="layout-editor-panel-section__row">
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              fieldStyle.fontWeight === "700" ? " is-active" : ""
                            }`}
                            onClick={toggleFieldBold}
                            aria-pressed={fieldStyle.fontWeight === "700"}
                            title="Bold"
                          >
                            <FaBold />
                          </button>
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              fieldStyle.fontStyle === "italic" ? " is-active" : ""
                            }`}
                            onClick={toggleFieldItalic}
                            aria-pressed={fieldStyle.fontStyle === "italic"}
                            title="Italic"
                          >
                            <FaItalic />
                          </button>
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              hasFieldDecoration("underline") ? " is-active" : ""
                            }`}
                            onClick={() => toggleFieldDecoration("underline")}
                            aria-pressed={hasFieldDecoration("underline")}
                            title="Underline"
                          >
                            <FaUnderline />
                          </button>
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              hasFieldDecoration("line-through") ? " is-active" : ""
                            }`}
                            onClick={() => toggleFieldDecoration("line-through")}
                            aria-pressed={hasFieldDecoration("line-through")}
                            title="Strikethrough"
                          >
                            <FaStrikethrough />
                          </button>
                        </div>
                      </div>

                      <div className="layout-editor-panel-section">
                        <span className="layout-editor-panel-section__label">Color</span>
                        <div className="layout-editor-panel-section__row">
                          <label className="layout-editor-ribbon__color" title="Text color">
                            <FaFont />
                            <input
                              type="color"
                              value={fieldStyle.color || "#000000"}
                              onChange={handleFieldColorChange}
                              aria-label="Text color"
                            />
                          </label>
                          {fieldStyle.color && (
                            <button
                              type="button"
                              className="layout-editor-ribbon__mini-reset"
                              onClick={clearFieldColor}
                              aria-label="Clear text color"
                              title="Clear text color"
                            >
                              <FaTimesCircle />
                            </button>
                          )}
                          <label className="layout-editor-ribbon__color" title="Highlight color">
                            <FaHighlighter />
                            <input
                              type="color"
                              value={fieldStyle.backgroundColor || "#ffff00"}
                              onChange={handleFieldHighlightChange}
                              aria-label="Highlight color"
                            />
                          </label>
                          {fieldStyle.backgroundColor && (
                            <button
                              type="button"
                              className="layout-editor-ribbon__mini-reset"
                              onClick={clearFieldHighlight}
                              aria-label="Clear highlight color"
                              title="Clear highlight color"
                            >
                              <FaTimesCircle />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="layout-editor-panel-section">
                        <span className="layout-editor-panel-section__label">Align</span>
                        <div className="layout-editor-panel-section__row">
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              fieldStyle.textAlign === "left" ? " is-active" : ""
                            }`}
                            onClick={() => toggleFieldAlign("left")}
                            aria-pressed={fieldStyle.textAlign === "left"}
                            title="Align left"
                          >
                            <FaAlignLeft />
                          </button>
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              fieldStyle.textAlign === "center" ? " is-active" : ""
                            }`}
                            onClick={() => toggleFieldAlign("center")}
                            aria-pressed={fieldStyle.textAlign === "center"}
                            title="Align center"
                          >
                            <FaAlignCenter />
                          </button>
                          <button
                            type="button"
                            className={`layout-editor-ribbon__button${
                              fieldStyle.textAlign === "right" ? " is-active" : ""
                            }`}
                            onClick={() => toggleFieldAlign("right")}
                            aria-pressed={fieldStyle.textAlign === "right"}
                            title="Align right"
                          >
                            <FaAlignRight />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="layout-editor-panel-section">
                    <span className="layout-editor-panel-section__label">Spacing</span>
                    <SpacingFields value={fieldStyle} onChange={updateSelectedFieldStyle} />
                  </div>

                  <div className="layout-editor-panel-section">
                    <button
                      type="button"
                      className="layout-editor-toolbar__button"
                      onClick={clearFieldFormatting}
                    >
                      <FaEraser /> Clear formatting
                    </button>
                  </div>
                </>
              )}

              {!selectedField && (
                <div
                  className={`layout-editor-panel-groups${
                    editMode && selectedSection ? "" : " is-disabled"
                  }`}
                  aria-disabled={!(editMode && selectedSection)}
                >
                  <div className="layout-editor-panel-section">
                    <span className="layout-editor-panel-section__label">
                      <FaPalette /> Background
                    </span>
                    <div className="layout-editor-bg-types">
                      <button
                        type="button"
                        className={`layout-editor-bg-type${
                          selectedBackgroundType === "" ? " is-active" : ""
                        }`}
                        onClick={clearBackground}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        className={`layout-editor-bg-type${
                          selectedBackgroundType === "color" ? " is-active" : ""
                        }`}
                        onClick={() => setBackgroundType("color")}
                      >
                        Color
                      </button>
                      <button
                        type="button"
                        className={`layout-editor-bg-type${
                          selectedBackgroundType === "gradient" ? " is-active" : ""
                        }`}
                        onClick={() => setBackgroundType("gradient")}
                      >
                        Gradient
                      </button>
                      <button
                        type="button"
                        className={`layout-editor-bg-type${
                          selectedBackgroundType === "image" ? " is-active" : ""
                        }`}
                        onClick={() => setBackgroundType("image")}
                      >
                        Image
                      </button>
                    </div>

                    {selectedBackgroundType === "color" && (
                      <div className="layout-editor-popover__row">
                        <input
                          type="color"
                          value={selectedRaw.backgroundColor || "#ffffff"}
                          onChange={handleColorChange}
                        />
                        <button
                          type="button"
                          className="layout-editor-popover__reset"
                          onClick={clearBackground}
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {selectedBackgroundType === "gradient" && (
                      <>
                        <div className="layout-editor-popover__row">
                          <label className="layout-editor-popover__label">
                            From
                            <input
                              type="color"
                              value={selectedRaw.gradientFrom || "#0b8f9e"}
                              onChange={handleGradientFromChange}
                            />
                          </label>
                          <label className="layout-editor-popover__label">
                            To
                            <input
                              type="color"
                              value={selectedRaw.gradientTo || "#ffffff"}
                              onChange={handleGradientToChange}
                            />
                          </label>
                        </div>
                        <select
                          value={selectedRaw.gradientAngle || "180deg"}
                          onChange={handleGradientAngleChange}
                        >
                          {GRADIENT_ANGLE_OPTIONS.map((option) => (
                            <option key={option.label} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="layout-editor-popover__reset"
                          onClick={clearBackground}
                        >
                          Clear gradient
                        </button>
                      </>
                    )}

                    {selectedBackgroundType === "image" && (
                      <>
                        {selectedRaw.backgroundImage && (
                          <div
                            className="layout-editor-popover__thumb"
                            style={{ backgroundImage: `url(${selectedRaw.backgroundImage})` }}
                          />
                        )}
                        <button
                          type="button"
                          className="layout-editor-toolbar__button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? "Uploading…" : "Upload image"}
                        </button>
                        {selectedRaw.backgroundImage && (
                          <button
                            type="button"
                            className="layout-editor-popover__reset"
                            onClick={clearBackgroundImage}
                          >
                            Remove image
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleImageUpload}
                        />
                        <div className="layout-editor-popover__row">
                          <select
                            value={selectedRaw.backgroundSize || "cover"}
                            onChange={handleBackgroundSizeChange}
                          >
                            {BACKGROUND_SIZE_OPTIONS.map((option) => (
                              <option key={option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedRaw.backgroundPosition || "center"}
                            onChange={handleBackgroundPositionChange}
                          >
                            {BACKGROUND_POSITION_OPTIONS.map((option) => (
                              <option key={option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {(selectedBackgroundType === "image" || selectedBackgroundType === "gradient") && (
                      <div className="layout-editor-popover__overlay">
                        <span className="layout-editor-ribbon__caption">Overlay tint</span>
                        <div className="layout-editor-popover__row">
                          <input
                            type="color"
                            value={selectedRaw.overlayColor || "#000000"}
                            onChange={handleOverlayColorChange}
                          />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedRaw.overlayOpacity || 0}
                            onChange={handleOverlayOpacityChange}
                          />
                          {selectedRaw.overlayColor && (
                            <button
                              type="button"
                              className="layout-editor-popover__reset"
                              onClick={clearOverlay}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="layout-editor-panel-section">
                    <span className="layout-editor-panel-section__label">
                      <FaFont /> Font
                    </span>
                    <select value={selectedRaw.fontFamily || ""} onChange={handleFontChange}>
                      {fontOptions.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="layout-editor-panel-section">
                    <span className="layout-editor-panel-section__label">
                      <FaRulerCombined /> Spacing
                    </span>
                    <SpacingFields
                      value={selectedRaw}
                      onChange={(patch) => updateStyle(selectedSection, patch)}
                    />
                  </div>

                  {selectedSection === "navbar" && (
                    <NavbarSettings
                      value={selectedRaw}
                      navLinks={mobileNavLinks}
                      onChange={(patch) => updateStyle("navbar", patch)}
                    />
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="layout-editor-pagebar" role="tablist" aria-label="Preview a page">
          <span className="layout-editor-pagebar__label">Pages</span>
          {EDITOR_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={page.id === activePage.id}
              className={`layout-editor-pagebar__button${
                page.id === activePage.id ? " is-active" : ""
              }`}
              onClick={() => {
                setSelectedSection(null);
                setSelectedField(null);
                setActivePageId(page.id);
              }}
              title={`Show ${page.path}`}
            >
              {page.label} <small>{page.path}</small>
            </button>
          ))}
        </div>

        <nav
          className="layout-editor-filmstrip"
          aria-label="Jump to a section"
        >
          {quickJumpKeys.map((key, index) => (
            <button
              key={key}
              type="button"
              className={`layout-editor-filmstrip__item${
                activeJumpKey === key ? " is-active" : ""
              }`}
              onClick={() => scrollToPageSection(key)}
              title={`Jump to ${sectionLabel(key)}`}
            >
              <span className="layout-editor-filmstrip__thumb" ref={setThumbRef(key)} />
              <span className="layout-editor-filmstrip__caption">
                <span className="layout-editor-filmstrip__index">{index + 1}</span>
                {sectionLabel(key)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <DiscardChangesModal
        isOpen={Boolean(pendingNav)}
        onCancel={cancelDiscard}
        onConfirm={confirmDiscard}
      />
    </LayoutEditorContext.Provider>
  );
}
