import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  FaArrowLeft,
  FaCheck,
  FaCog,
  FaChartLine,
  FaChartBar,
  FaEye,
  FaImage,
  FaLayerGroup,
  FaChevronDown,
  FaChevronUp,
  FaNewspaper,
  FaPen,
  FaPlus,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import { db, storage } from "../firebase";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import ArticleDeleteConfirmModal from "../components/ArticleDeleteConfirmModal";
import ArticleEditor from "../components/ArticleEditor";
import { sendArticleNotificationEmails } from "../services/emailService";
import {
  defaultAboutContent,
  defaultBenefits,
  defaultContactContent,
  defaultFaqs,
  defaultHeroContent,
  defaultServices,
  defaultSettingsContent,
} from "../data/defaultContent";
import "../assets/Style/admin.css";

const adminLinks = [
  { to: "/", label: "Preview Page", icon: FaEye, end: true },
  { to: "/admin/dashboard", label: "Dashboard", icon: FaLayerGroup },
  { to: "/admin/articles", label: "Articles", icon: FaNewspaper },
  { to: "/admin/page-content", label: "Page Content", icon: FaPen },
  { to: "/admin/settings", label: "Settings", icon: FaCog },
  { to: "/admin/media", label: "Media", icon: FaImage },
  { to: "/admin/users", label: "Admins", icon: FaUsers, ownerOnly: true },
];

const pageContentLinks = [
  {
    to: "/admin/hero",
    label: "Hero",
    description: "Main homepage headline, benefits, and hero media.",
  },
  {
    to: "/admin/services",
    label: "Services",
    description: "Service cards and modal details shown on the homepage.",
  },
  {
    to: "/admin/benefits",
    label: "Benefits",
    description: "Practice benefit cards and highlighted support messages.",
  },
  {
    to: "/admin/faq",
    label: "FAQ",
    description: "Public frequently asked questions and answers.",
  },
  {
    to: "/admin/about",
    label: "About",
    description: "About section paragraphs and supporting image.",
  },
  {
    to: "/admin/contact",
    label: "Contact",
    description: "Contact copy, form text, and consultation submissions.",
  },
];

const blankArticle = {
  title: "",
  excerpt: "",
  body: "",
  writerName: "",
  writerTitle: "",
  writerBio: "",
  writerPhotoUrl: "",
  writerPhotoAlt: "",
  writerInstagramUrl: "",
  writerFacebookUrl: "",
  writerLinkedinUrl: "",
  writerWebsiteUrl: "",
  mediaUrl: "",
  mediaAlt: "",
  mediaCaption: "",
  mediaPosition: "top",
  published: true,
};

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const normalizeOptionalUrl = (value = "") => {
  const nextValue = String(value || "").trim();
  if (!nextValue) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(nextValue)) return nextValue;
  return `https://${nextValue}`;
};

const stripHtmlTags = (value = "") =>
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

const getLocalDateIdFromDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalDateId = () => getLocalDateIdFromDate(new Date());

const getStartOfWeek = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const getCurrentMonthDateIds = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dates = [];

  const cursor = new Date(firstDay);
  while (cursor <= lastDay) {
    dates.push(getLocalDateIdFromDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const formatDashboardDateLabel = (dateId) => {
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

const formatTrafficTimeLabel = (date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

const formatEngagementTimestamp = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const timestampToMillis = (timestamp) => {
  if (timestamp?.toMillis) return timestamp.toMillis();
  if (timestamp?.toDate) return timestamp.toDate().getTime();
  return 0;
};

const valuesByDateId = (items, key = "totalVisits") =>
  items.reduce((lookup, item) => {
    const id = item.id || item.date;
    lookup.set(id, Number(item[key] || 0));
    return lookup;
  }, new Map());

const buildDateRangeSeries = (items, startDate, endDate, key = "totalVisits") => {
  const counts = valuesByDateId(items, key);
  const series = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const id = getLocalDateIdFromDate(cursor);
    series.push({
      id,
      label: formatDashboardDateLabel(id),
      value: counts.get(id) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

const buildTrafficTimeSeries = (items, spanMinutes, bucketMinutes, labelFormatter) => {
  const bucketCount = Math.max(1, Math.ceil(spanMinutes / bucketMinutes));
  const bucketMs = bucketMinutes * 60 * 1000;
  const nowMs = Date.now();
  const startMs = nowMs - bucketCount * bucketMs;

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = startMs + index * bucketMs;
    return {
      id: String(bucketStart),
      start: bucketStart,
      label: labelFormatter(new Date(bucketStart), index, bucketCount),
      value: 0,
    };
  }).map((bucket, index, buckets) => {
    const nextBucket = buckets[index + 1];
    const bucketEnd = nextBucket ? nextBucket.start : nowMs + 1;
    const value = items.reduce((count, item) => {
      const timestamp = Number(item.capturedAtMs || item.createdAtMs || timestampToMillis(item.createdAt));
      if (!Number.isFinite(timestamp) || timestamp < bucket.start || timestamp >= bucketEnd) {
        return count;
      }
      return count + 1;
    }, 0);

    return {
      id: bucket.id,
      label: bucket.label,
      value,
    };
  });
};

const TRAFFIC_RANGE_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "week", label: "This week" },
  { value: "24h", label: "Last 24 hours" },
  { value: "60m", label: "Last 60 minutes" },
];

const CONSULTATION_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "archived", label: "Archived" },
];

const CONSULTATION_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  archived: "Archived",
};

const getConsultationName = (item = {}) =>
  item.fullName?.trim() ||
  `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
  item.email ||
  "Unnamed request";

const getConsultationStatus = (item = {}) => {
  const status = item.status || "new";
  return CONSULTATION_STATUS_LABELS[status] ? status : "new";
};

const formatConsultationTimestamp = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function DashboardGraphCard({
  icon,
  title,
  subtitle,
  total,
  totalLabel,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`admin-graph-card ${className}`.trim()}>
      <div className="admin-graph-card__header">
        <div className="admin-graph-card__title">
          <span className="admin-graph-card__icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="admin-graph-card__header-actions">
          {actions}
          <div className="admin-graph-card__total">
            <strong>{total}</strong>
            {totalLabel && <span>{totalLabel}</span>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function TrendChart({ series }) {
  const pointSpacing = 18;
  const width = Math.max(320, series.length * pointSpacing + 28 + 12);
  const height = 160;
  const padding = { top: 10, right: 12, bottom: 28, left: 28 };
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const maxValue = Math.max(1, ...series.map((point) => Number(point.value || 0)));
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const currentDateId = getLocalDateId();
  const cutoffIndex = Math.max(
    0,
    series.findIndex((point) => point.id === currentDateId)
  );
  const points = series.map((point, index) => {
    const value = Number(point.value || 0);
    const x =
      series.length > 1
        ? padding.left + (chartWidth * index) / (series.length - 1)
        : padding.left + chartWidth / 2;
    const y = padding.top + chartHeight - (chartHeight * value) / maxValue;

    return { ...point, x, y, value };
  });
  const visiblePoints = points.slice(0, cutoffIndex + 1);
  const linePath = visiblePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const index = Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1))));
    setHoveredPoint(points[index] || null);
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
  };

  const yTicks = [0.25, 0.5, 0.75, 1];
  const tickValues = yTicks.map((tick) => Math.round(maxValue * tick));
  const tooltipPoint = hoveredPoint;
  const tooltipLeft = tooltipPoint ? Math.min(tooltipPoint.x + 20, width - 172) : 0;
  const tooltipTop = tooltipPoint ? Math.min(Math.max(tooltipPoint.y - 24, 10), height - 82) : 0;

  return (
    <div className="admin-trend-chart">
      <div className="admin-trend-chart__scroll">
        <svg
          className="admin-trend-chart__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Visits by date for the current month"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {yTicks.map((tick, index) => {
            const y = padding.top + chartHeight - chartHeight * tick;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className={`admin-trend-chart__grid${index === yTicks.length - 1 ? " admin-trend-chart__grid--base" : ""}`}
                />
                <text x={10} y={y + 4} className="admin-trend-chart__axis-label">
                  {tickValues[index]}
                </text>
              </g>
            );
          })}

          {linePath && <path d={linePath} className="admin-trend-chart__line" />}
          {tooltipPoint && (
            <circle
              cx={tooltipPoint.x}
              cy={tooltipPoint.y}
              r="3.1"
              className="admin-trend-chart__hover-point"
            />
          )}
        </svg>

        {tooltipPoint && (
          <div
            className="admin-trend-chart__tooltip"
            style={{
              left: `${tooltipLeft}px`,
              top: `${tooltipTop}px`,
            }}
          >
            <span className="admin-trend-chart__tooltip-label">{tooltipPoint.label}</span>
            <strong>{tooltipPoint.value}</strong>
            <small>visits</small>
          </div>
        )}

        <div
          className="admin-trend-chart__labels"
          aria-hidden="true"
          style={{ width: "100%" }}
        >
          {series.map((point) => (
            <span key={point.id}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusGraph({ items, emptyLabel }) {
  const total = Math.max(
    1,
    items.reduce((sum, item) => sum + Number(item.value || 0), 0)
  );

  return (
    <div className="admin-status-graph">
      {items.map((item) => {
        const value = Number(item.value || 0);
        const percentage = Math.round((value / total) * 100);

        return (
          <div className="admin-status-graph__row" key={item.label}>
            <div className="admin-status-graph__meta">
              <span className="admin-status-graph__swatch" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
            <strong>{value}</strong>
            <div className="admin-status-graph__bar" aria-hidden="true">
              <span
                className="admin-status-graph__fill"
                style={{ background: item.color, width: `${percentage}%` }}
              />
            </div>
            <small>{percentage}%</small>
          </div>
        );
      })}
      {items.every((item) => Number(item.value || 0) === 0) && (
        <p className="admin-status-graph__empty">{emptyLabel}</p>
      )}
    </div>
  );
}

function EngagementTable({ items, emptyLabel }) {
  const [expandedId, setExpandedId] = useState("");
  const hasEntries = items.some((item) => Number(item.value || 0) > 0);

  return (
    <div className="admin-engagement-list">
      {hasEntries ? (
        <>
          <div className="admin-engagement-list__hint">
            <span>Tap a row for recent engagement times.</span>
            <span>Sorted by total engagements.</span>
          </div>
          <div className="admin-engagement-list__rows">
            {items.map((item, index) => {
              const value = Number(item.value || 0);
              const isOpen = expandedId === item.id;

              return (
                <div
                  className={`admin-engagement-list__item${isOpen ? " is-open" : ""}`}
                  key={item.id || item.label}
                >
                  <div className="admin-engagement-list__body">
                    <span className="admin-engagement-list__rank">{index + 1}</span>
                    <div className="admin-engagement-list__copy">
                      <strong className="admin-engagement-list__label">{item.label}</strong>
                      <small className="admin-engagement-list__subtitle">
                        {item.engagements?.length || 0} recent entries
                      </small>
                    </div>
                    <button
                      type="button"
                      className="admin-engagement-list__action"
                      onClick={() => setExpandedId((current) => (current === item.id ? "" : item.id))}
                      aria-expanded={isOpen}
                      aria-controls={`engagement-panel-${item.id}`}
                      aria-label={`${isOpen ? "Hide" : "View"} engagement details for ${item.label}`}
                    >
                      <span className="admin-engagement-list__value">{value} engagements</span>
                    </button>
                  </div>
                  {isOpen && (
                    <div className="admin-engagement-list__panel" id={`engagement-panel-${item.id}`}>
                      <div className="admin-engagement-list__panel-title">Recent engagements</div>
                      <div className="admin-engagement-list__entries">
                        {item.engagements && item.engagements.length > 0 ? (
                          item.engagements.slice(0, 5).map((engagement, entryIndex) => (
                            <div
                              className="admin-engagement-list__entry"
                              key={engagement.id || `${item.id}-${entryIndex}`}
                            >
                              <span className="admin-engagement-list__entry-index">{entryIndex + 1}</span>
                              <div className="admin-engagement-list__entry-copy">
                                <strong>{formatEngagementTimestamp(engagement.engagedAt)}</strong>
                                <small>{engagement.articleTitle || item.label}</small>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="admin-status-graph__empty">No engagement details yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="admin-status-graph__empty">{emptyLabel}</p>
      )}
    </div>
  );
}

function DashboardMetric({ label, value, detail }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const collectionConfigs = {
  services: {
    title: "Services",
    collectionName: "services",
    defaults: defaultServices,
    fields: [
      { name: "title", label: "Title" },
      { name: "shortDescription", label: "Short Description", type: "textarea" },
      { name: "description", label: "Modal Description", type: "textarea" },
      { name: "order", label: "Order", type: "number" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  benefits: {
    title: "Benefits",
    collectionName: "benefits",
    defaults: defaultBenefits,
    fields: [
      { name: "title", label: "Title" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "order", label: "Order", type: "number" },
      { name: "highlight", label: "Highlight card", type: "checkbox" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  faqs: {
    title: "FAQ",
    collectionName: "faqs",
    defaults: defaultFaqs,
    fields: [
      { name: "category", label: "Category" },
      { name: "question", label: "Question" },
      { name: "answer", label: "Answer", type: "textarea" },
      { name: "order", label: "Order", type: "number" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
};

const siteContentConfigs = {
  hero: {
    title: "Hero",
    docId: "hero",
    fallback: defaultHeroContent,
    fields: [
      { name: "tag", label: "Tag" },
      { name: "title", label: "Title" },
      { name: "benefits", label: "Benefits", type: "lines" },
      { name: "primaryButtonLabel", label: "Primary Button" },
      { name: "secondaryButtonLabel", label: "Secondary Button" },
      { name: "backgroundImageUrl", label: "Background Image URL" },
      { name: "foregroundImageUrl", label: "Foreground Image URL" },
      { name: "foregroundImageAlt", label: "Foreground Image Alt" },
    ],
  },
  about: {
    title: "About",
    docId: "about",
    fallback: defaultAboutContent,
    fields: [
      { name: "tag", label: "Tag" },
      { name: "title", label: "Title" },
      { name: "paragraphs", label: "Paragraphs", type: "blocks" },
      { name: "imageUrl", label: "Image URL" },
      { name: "imageAlt", label: "Image Alt" },
    ],
  },
  contact: {
    title: "Contact",
    docId: "contact",
    fallback: defaultContactContent,
    fields: [
      { name: "tag", label: "Tag" },
      { name: "title", label: "Title", type: "textarea" },
      { name: "body", label: "Body", type: "textarea" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email" },
      { name: "hours", label: "Hours" },
      { name: "formTitle", label: "Form Title" },
      { name: "successMessage", label: "Success Message", type: "textarea" },
    ],
  },
  settings: {
    title: "Site Settings",
    docId: "settings",
    fallback: defaultSettingsContent,
    fields: [
      { name: "siteName", label: "Site Name" },
      { name: "instagramUrl", label: "Instagram URL" },
      { name: "facebookUrl", label: "Facebook URL" },
      { name: "linkedinUrl", label: "LinkedIn URL" },
    ],
  },
};

const emptyFromFields = (fields) =>
  fields.reduce((values, field) => {
    values[field.name] =
      field.type === "checkbox" ? field.name === "published" : "";
    return values;
  }, {});

const coerceValue = (field, value) => {
  if (field.type === "number") return Number(value || 0);
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "lines") {
    return String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (field.type === "blocks") {
    return String(value || "")
      .split(/\n\s*\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return value || "";
};

const fieldToInputValue = (field, value) => {
  if (field.type === "lines") return (value || []).join("\n");
  if (field.type === "blocks") return (value || []).join("\n\n");
  return value ?? "";
};

const INLINE_IMAGE_MAX_BYTES = 650 * 1024;

const sanitizeStorageFileName = (name = "") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "image";

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Unable to prepare image."));
      },
      "image/jpeg",
      quality
    );
  });

const createInlineImageUrl = (imageFile) =>
  new Promise((resolve, reject) => {
    if (!imageFile?.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    image.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const maxWidths = [1400, 1100, 900, 720];
        const qualities = [0.78, 0.68, 0.58, 0.48];
        let fallbackBlob = null;

        for (const maxWidth of maxWidths) {
          const scale = Math.min(
            1,
            maxWidth / image.naturalWidth,
            maxWidth / image.naturalHeight
          );
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = width;
          canvas.height = height;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

          for (const quality of qualities) {
            const blob = await canvasToBlob(canvas, quality);
            fallbackBlob = blob;

            if (blob.size <= INLINE_IMAGE_MAX_BYTES) {
              resolve(await blobToDataUrl(blob));
              return;
            }
          }
        }

        resolve(await blobToDataUrl(fallbackBlob));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image file."));
    };

    image.src = objectUrl;
  });

function AdminShell() {
  const { user, adminProfile, isOwner, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isArticlesRoute = location.pathname === "/admin/articles";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const openLogoutConfirm = () => {
    setLogoutOpen(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen((current) => !current);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      {sidebarOpen && <button type="button" className="admin-sidebar-backdrop" onClick={closeSidebar} aria-label="Close admin menu" />}
      <button
        type="button"
        className={`admin-sidebar-toggle${sidebarOpen ? " admin-sidebar-toggle--open" : ""}`}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close admin menu" : "Open admin menu"}
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>
      <aside className={`admin-sidebar${sidebarOpen ? " admin-sidebar--open" : ""}`}>
        <Link className="admin-brand" to="/admin/dashboard">
          Pro-Dental CMS
        </Link>
        <nav className="admin-nav">
          {adminLinks
            .filter((link) => !link.ownerOnly || isOwner)
            .map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={closeSidebar}>
                <span className="admin-nav__icon" aria-hidden="true">
                  <link.icon />
                </span>
                {link.label}
              </NavLink>
            ))}
        </nav>
        <div className="admin-user">
          <span>{user?.email}</span>
          <span>{adminProfile?.role || "admin"}</span>
          <button type="button" onClick={openLogoutConfirm}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={`admin-main${isArticlesRoute ? " admin-main--articles" : ""}`}>
        <Outlet />
      </main>
      <LogoutConfirmModal
        isOpen={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="admin-loading">Checking access...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function AdminLayout() {
  return (
    <RequireAdmin>
      <AdminShell />
    </RequireAdmin>
  );
}

export function AdminLogin() {
  const {
    user,
    isAdmin,
    adminCheckError,
    loading,
    login,
    loginWithGoogle,
    logout,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError("");

    try {
      await loginWithGoogle();
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrapAdmin = async () => {
    if (!user) return;

    setSubmitting(true);
    setError("");
    setSetupMessage("");

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, "admins", user.uid), {
        email: user.email || "",
        role: "owner",
        createdAt: serverTimestamp(),
        bootstrap: true,
      });

      batch.set(doc(db, "siteContent", "adminBootstrap"), {
        adminUid: user.uid,
        adminEmail: user.email || "",
        completedAt: serverTimestamp(),
      });

      await batch.commit();
      setSetupMessage("Admin document created. Refreshing access...");
      window.location.reload();
    } catch (bootstrapError) {
      setError(
        bootstrapError.message ||
          "Unable to create the first admin document. Check Firestore rules are deployed."
      );
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

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        {user && !isAdmin && !loading && (
          <div className="admin-error admin-setup">
            <p>This account is signed in but is not listed in the admins collection.</p>
            <p>
              Connected Firebase project:
              <code>{import.meta.env.VITE_FIREBASE_PROJECT_ID}</code>
            </p>
            <p>
              In Firebase Console, create this Firestore document:
              <code>admins/{user.uid}</code>
            </p>
            <p>
              Add any field, for example <code>role: "owner"</code>, then refresh
              this page.
            </p>
            <button
              type="button"
              onClick={handleBootstrapAdmin}
              disabled={submitting}
            >
              Create this first admin document
            </button>
            {adminCheckError && (
              <p>
                Admin check error:
                <code>{adminCheckError}</code>
              </p>
            )}
            {setupMessage && <p>{setupMessage}</p>}
            <button type="button" onClick={openLogoutConfirm}>
              Sign out
            </button>
          </div>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in with email"}
        </button>
        <button
          type="button"
          className="admin-google-signin"
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <LogoutConfirmModal
          isOpen={logoutOpen}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={handleLogout}
        />
      </form>
    </main>
  );
}

export function AdminDashboard() {
  const { isOwner } = useAuth();
  const [dailyVisits, setDailyVisits] = useState([]);
  const [visitorEvents, setVisitorEvents] = useState([]);
  const [articles, setArticles] = useState([]);
  const [articleEngagements, setArticleEngagements] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [trafficRange, setTrafficRange] = useState("month");

  useEffect(() => {
    const visitsQuery = query(
      collection(db, "visitorStats"),
      orderBy("date", "desc"),
      limit(31)
    );
    const unsubscribeVisits = onSnapshot(visitsQuery, (snapshot) => {
      setDailyVisits(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    const visitorEventsQuery = query(
      collection(db, "visitorEvents"),
      orderBy("capturedAtMs", "desc"),
      limit(1000)
    );
    const unsubscribeVisitorEvents = onSnapshot(visitorEventsQuery, (snapshot) => {
      setVisitorEvents(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    const unsubscribeArticles = onSnapshot(collection(db, "articles"), (snapshot) => {
      setArticles(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    const unsubscribeEngagements = onSnapshot(
      collection(db, "articleEngagements"),
      (snapshot) => {
        setArticleEngagements(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      }
    );

    const unsubscribeSubscribers = onSnapshot(
      collection(db, "articleSubscribers"),
      (snapshot) => {
        setSubscribers(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      }
    );

    const unsubscribeConsultations = onSnapshot(
      collection(db, "consultations"),
      (snapshot) => {
        setConsultations(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      }
    );

    return () => {
      unsubscribeVisits();
      unsubscribeVisitorEvents();
      unsubscribeArticles();
      unsubscribeEngagements();
      unsubscribeSubscribers();
      unsubscribeConsultations();
    };
  }, []);

  const todayId = getLocalDateId();
  const todayDate = useMemo(() => new Date(), [todayId]);
  const monthStartDate = useMemo(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
    [todayDate]
  );
  const monthEndDate = useMemo(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0),
    [todayDate]
  );
  const visitSeries = useMemo(
    () => buildDateRangeSeries(dailyVisits, monthStartDate, monthEndDate),
    [dailyVisits, monthStartDate, monthEndDate]
  );
  const activeVisitSeries = useMemo(() => {
    const todayIndex = visitSeries.findIndex((item) => item.id === todayId);
    return todayIndex >= 0 ? visitSeries.slice(0, todayIndex + 1) : visitSeries;
  }, [todayId, visitSeries]);
  const todayVisits = visitSeries.find((item) => item.id === todayId)?.value || 0;
  const monthVisitsTotal = visitSeries.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const recentVisitDays = useMemo(() => activeVisitSeries.slice(-5).reverse(), [activeVisitSeries]);
  const peakVisitDay = useMemo(
    () =>
      activeVisitSeries.reduce(
        (best, item) => (Number(item.value || 0) > Number(best.value || 0) ? item : best),
        activeVisitSeries[0] || { label: "No data", value: 0 }
      ),
    [activeVisitSeries]
  );
  const trafficView = useMemo(() => {
    const selectedRange = TRAFFIC_RANGE_OPTIONS.find((option) => option.value === trafficRange) || TRAFFIC_RANGE_OPTIONS[0];

    switch (selectedRange.value) {
      case "week": {
        const startOfWeek = getStartOfWeek(todayDate);
        const series = buildDateRangeSeries(dailyVisits, startOfWeek, todayDate);
        return {
          label: selectedRange.label,
          subtitle: "Daily visit totals across the current week.",
          series,
        };
      }
      case "24h": {
        const series = buildTrafficTimeSeries(
          visitorEvents,
          24 * 60,
          60,
          (date) => new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(date)
        );
        return {
          label: selectedRange.label,
          subtitle: "Hourly visit totals across the last 24 hours.",
          series,
        };
      }
      case "60m": {
        const series = buildTrafficTimeSeries(visitorEvents, 60, 5, (date) => formatTrafficTimeLabel(date));
        return {
          label: selectedRange.label,
          subtitle: "Five-minute visit totals across the last 60 minutes.",
          series,
        };
      }
      default:
        return {
          label: selectedRange.label,
          subtitle: "Daily visit totals across the current month.",
          series: visitSeries,
        };
    }
  }, [dailyVisits, todayDate, trafficRange, visitSeries, visitorEvents]);
  const trafficTotal = useMemo(
    () => trafficView.series.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [trafficView.series]
  );
  const articleCounts = useMemo(
    () =>
      articles.reduce(
        (counts, article) => {
          if (article.published) {
            counts.published += 1;
          } else {
            counts.drafts += 1;
          }
          return counts;
        },
        { published: 0, drafts: 0 }
      ),
    [articles]
  );
  const subscriberCounts = useMemo(
    () =>
      subscribers.reduce(
        (counts, subscriber) => {
          if (subscriber.status === "paused") {
            counts.paused += 1;
          } else {
            counts.active += 1;
          }
          return counts;
        },
        { active: 0, paused: 0 }
      ),
    [subscribers]
  );
  const consultationCounts = useMemo(
    () =>
      consultations.reduce(
        (counts, consultation) => {
          const status = consultation.status || "new";
          if (status === "contacted") {
            counts.contacted += 1;
          } else if (status === "archived") {
            counts.archived += 1;
          } else {
            counts.new += 1;
          }
          return counts;
        },
        { new: 0, contacted: 0, archived: 0 }
      ),
    [consultations]
  );
  const recentConsultationEmails = useMemo(
    () =>
      [...consultations]
        .sort((first, second) => timestampToMillis(second.createdAt) - timestampToMillis(first.createdAt))
        .slice(0, 5),
    [consultations]
  );
  const articleOpenTotal = useMemo(
    () => articleEngagements.length,
    [articleEngagements]
  );
  const articleOpenItems = useMemo(() => {
    const publishedArticles = articles.filter((article) => article.published);
    const articleById = new Map(publishedArticles.map((article) => [article.id, article]));
    const sortedEngagements = [...articleEngagements].sort(
      (first, second) => timestampToMillis(second.engagedAt) - timestampToMillis(first.engagedAt)
    );
    const grouped = new Map(
      publishedArticles.map((article) => [
        article.id,
        {
          id: article.id,
          label: article.title?.trim() || "Untitled article",
          value: 0,
          engagements: [],
        },
      ])
    );

    sortedEngagements.forEach((engagement) => {
      const articleId = engagement.articleId || "";
      if (!articleId) {
        return;
      }

      if (!grouped.has(articleId)) {
        const article = articleById.get(articleId);
        grouped.set(articleId, {
          id: articleId,
          label: article?.title?.trim() || engagement.articleTitle?.trim() || "Untitled article",
          value: 0,
          engagements: [],
        });
      }

      const item = grouped.get(articleId);
      item.value += 1;
      item.engagements.push(engagement);
    });

    return Array.from(grouped.values())
      .sort(
        (first, second) =>
          second.value - first.value || first.label.localeCompare(second.label, undefined, { sensitivity: "base" })
      );
  }, [articleEngagements, articles]);

  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-page-header admin-page-header--hero">
        <h3>Dashboard</h3>
      </div>
      <div className="admin-stat-flex">
        <DashboardMetric label="Today" value={todayVisits} detail="tracked visits" />
        <DashboardMetric label="This Month" value={monthVisitsTotal} detail="tracked visits" />
        <DashboardMetric label="Published" value={articleCounts.published} detail="live articles" />
        <DashboardMetric
          label="Active Subscribers"
          value={subscriberCounts.active}
          detail="email readers"
        />
        <DashboardMetric
          label="New Consultations"
          value={consultationCounts.new}
          detail="waiting to be reviewed"
        />
        <DashboardMetric label="Article Engagements" value={articleOpenTotal} detail="total engagements" />
      </div>
      <div className="admin-dashboard-flex">
        <DashboardGraphCard
          icon={<FaChartLine aria-hidden="true" />}
          title="Traffic"
          subtitle={trafficView.subtitle}
          total={trafficTotal}
          totalLabel="visits"
          actions={
            <select
              className="admin-graph-card__filter"
              aria-label="Filter traffic range"
              value={trafficRange}
              onChange={(event) => setTrafficRange(event.target.value)}
            >
              {TRAFFIC_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          }
          className="admin-graph-card--wide"
        >
          <TrendChart series={trafficView.series} />
        </DashboardGraphCard>
        <section className="admin-engagement-panel">
          <div className="admin-engagement-panel__header">
            <div className="admin-engagement-panel__title">
              <span className="admin-engagement-panel__icon" aria-hidden="true">
                <FaChartBar />
              </span>
              <div>
                <h3>Article engagements</h3>
                <p>Engagement totals for each published article.</p>
              </div>
            </div>
            <div className="admin-engagement-panel__total">
              <strong>{articleOpenTotal}</strong>
              <span>engagements</span>
            </div>
          </div>
          <EngagementTable
            items={articleOpenItems}
            emptyLabel="No article engagements yet."
          />
        </section>
        <DashboardGraphCard
          icon={<FaUsers aria-hidden="true" />}
          title="Consultation Review"
          subtitle="Recent consultation emails and booked dates."
          total={consultations.length}
          totalLabel="booked"
          actions={
            <Link className="admin-secondary" to="/admin/contact#consultation-review">
              Open review
            </Link>
          }
          className="admin-graph-card--wide"
        >
          <div className="admin-consultation-preview">
            <div className="admin-consultation-preview__header">
              <span>Recent emails</span>
              <small>
                {recentConsultationEmails.length > 0
                  ? `${recentConsultationEmails.length} shown`
                  : "No consultation emails yet"}
              </small>
            </div>
            <div className="admin-consultation-preview__list">
              {recentConsultationEmails.length > 0 ? (
                recentConsultationEmails.map((item) => {
                  const status = getConsultationStatus(item);

                  return (
                    <Link
                      key={item.id}
                      className="admin-consultation-preview__item"
                      to="/admin/contact#consultation-review"
                    >
                      <div className="admin-consultation-preview__copy">
                        <strong>{item.email || "No email supplied"}</strong>
                        <span>Booked for {item.scheduleDate || "no date"}</span>
                      </div>
                      <span
                        className={`admin-consultation-status-badge admin-consultation-status-badge--${status}`}
                      >
                        {CONSULTATION_STATUS_LABELS[status]}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="admin-status-graph__empty">No consultation emails yet.</p>
              )}
            </div>
          </div>
        </DashboardGraphCard>
        <DashboardGraphCard
          icon={<FaEye aria-hidden="true" />}
          title="Website visitors"
          subtitle="Daily visitors recorded this month."
          total={monthVisitsTotal}
          totalLabel="visits"
        >
          <div className="admin-visitor-list">
            <div className="admin-visitor-list__summary">
              <span>Peak day</span>
              <strong>{peakVisitDay.label}</strong>
              <small>{peakVisitDay.value} visits</small>
            </div>
            <div className="admin-visitor-list__rows">
              {recentVisitDays.length > 0 ? (
                recentVisitDays.map((item) => (
                  <div className="admin-visitor-list__row" key={item.id}>
                    <div className="admin-visitor-list__meta">
                      <strong>{item.label}</strong>
                      <small>Daily visitor total</small>
                    </div>
                    <span className="admin-visitor-list__count">{item.value}</span>
                  </div>
                ))
              ) : (
                <p className="admin-status-graph__empty">No visitor records yet.</p>
              )}
            </div>
          </div>
        </DashboardGraphCard>
      </div>
    </section>
  );
}

export function PageContentPanel() {
  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <span>Content Hub</span>
        <h1>Page Content</h1>
        <p>Choose a public page section to edit.</p>
      </div>

      <div className="admin-content-grid">
        {pageContentLinks.map((link) => (
          <Link className="admin-content-link" key={link.to} to={link.to}>
            <span>{link.label}</span>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdminUsersPage() {
  const { isOwner, user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState("");
  const [draft, setDraft] = useState({ uid: "", email: "", role: "admin" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "admins"), (snapshot) => {
      setAdmins(snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "articleSubscribers"), (snapshot) => {
      setSubscribers(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, []);

  const adminByUid = useMemo(
    () =>
      admins.reduce((lookup, admin) => {
        lookup.set(admin.uid, admin);
        return lookup;
      }, new Map()),
    [admins]
  );

  const selectedSubscriber = useMemo(
    () =>
      subscribers.find((subscriber) => subscriber.id === selectedSubscriberId) ||
      subscribers.find((subscriber) => subscriber.authUid === selectedSubscriberId) ||
      null,
    [selectedSubscriberId, subscribers]
  );

  const sortedAdmins = useMemo(() => {
    return [...admins].sort((left, right) => {
      const leftLabel = (left.email || left.uid || "").toLowerCase();
      const rightLabel = (right.email || right.uid || "").toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });
  }, [admins]);

  const sortedSubscribers = useMemo(() => {
    return [...subscribers].sort((left, right) => {
      const leftLabel = (left.email || left.displayName || left.id || "").toLowerCase();
      const rightLabel = (right.email || right.displayName || right.id || "").toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });
  }, [subscribers]);

  if (!isOwner) {
    return (
      <section className="admin-page">
        <div className="admin-page-header">
          <span>Owner Only</span>
          <h1>Admins</h1>
          <p>Only the owner can add or remove admin users.</p>
        </div>
      </section>
    );
  }

  const handleSelectSubscriber = (subscriber) => {
    const uid = subscriber.authUid || subscriber.uid || subscriber.id || "";
    const email = subscriber.email || "";
    const role = adminByUid.get(uid)?.role || "admin";

    setSelectedSubscriberId(subscriber.id || uid);
    setDraft({
      uid,
      email,
      role,
    });
    setMessage(`Loaded ${email || uid} into the admin form.`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await setDoc(
        doc(db, "admins", draft.uid.trim()),
        {
          email: draft.email.trim().toLowerCase(),
          role: draft.role,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setDraft({ uid: "", email: "", role: "admin" });
      setMessage("Admin saved.");
      setSelectedSubscriberId("");
    } catch (error) {
      setMessage(error.message || "Unable to save admin.");
    }
  };

  const handleRemoveRole = async () => {
    const targetUid = String(draft.uid || "").trim();

    if (!targetUid) {
      setMessage("Select a user before removing a role.");
      return;
    }

    if (targetUid === user?.uid) {
      setMessage("You cannot remove your own owner role from this screen.");
      return;
    }

    setMessage("");

    try {
      await deleteDoc(doc(db, "admins", targetUid));
      setMessage("Admin role removed.");
      setDraft({ uid: "", email: "", role: "admin" });
      setSelectedSubscriberId("");
    } catch (error) {
      setMessage(error.message || "Unable to remove the role.");
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Access</span>
          <h1>Users</h1>
          <p>Pick a logged-in user, load their details into the form, then assign a role.</p>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-list-header">
          <div>
            <span>Live list</span>
            <h2>Logged-in users</h2>
          </div>
          <p>These are the accounts that have signed in and written their profile records.</p>
        </div>
        <div className="admin-list">
          {sortedSubscribers.length === 0 ? (
            <p className="admin-empty">No logged-in users yet.</p>
          ) : (
            sortedSubscribers.map((subscriber) => {
              const uid = subscriber.authUid || subscriber.uid || subscriber.id;
              const adminRecord = adminByUid.get(uid);
              const isSelected = selectedSubscriberId === subscriber.id || selectedSubscriberId === uid;
              const label = subscriber.displayName || subscriber.email || uid;

              return (
                <article
                  className={`admin-list-item${isSelected ? " admin-list-item--selected" : ""}`}
                  key={subscriber.id}
                >
                  <div>
                    <h3>{label}</h3>
                    <p>{subscriber.email || uid}</p>
                    <span>{adminRecord?.role || subscriber.status || "user"}</span>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => handleSelectSubscriber(subscriber)}>
                      {isSelected ? "Loaded" : "Load"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="admin-two-column">
        <form className="admin-form" onSubmit={handleSubmit}>
          {selectedSubscriber && (
            <div className="admin-note">
              <strong>Selected user</strong>
              <p>
                {selectedSubscriber.displayName || selectedSubscriber.email || selectedSubscriber.id}
              </p>
            </div>
          )}
          <label>
            Firebase Auth UID
            <input
              value={draft.uid}
              onChange={(event) =>
                setDraft((current) => ({ ...current, uid: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <label>
            Role
            <select
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value }))
              }
            >
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          {message && <p className="admin-message">{message}</p>}
          <div className="admin-actions">
            <button type="submit">Save Admin</button>
            <button
              type="button"
              className="admin-secondary"
              onClick={handleRemoveRole}
              disabled={!draft.uid || draft.uid.trim() === user?.uid}
            >
              Remove Role
            </button>
          </div>
        </form>

        <div className="admin-list">
          {admins.map((admin) => (
            <article className="admin-list-item" key={admin.uid}>
              <div>
                <h3>{admin.email || admin.uid}</h3>
                <p>{admin.uid}</p>
                <span>{admin.role || "admin"}</span>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  disabled={admin.uid === user?.uid}
                  onClick={() => deleteDoc(doc(db, "admins", admin.uid))}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ArticlesAdminPage() {
  const [articles, setArticles] = useState([]);
  const [draft, setDraft] = useState(blankArticle);
  const [editingId, setEditingId] = useState("");
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [writerFile, setWriterFile] = useState(null);
  const [writerFilePreviewUrl, setWriterFilePreviewUrl] = useState("");
  const [writerProfileOpen, setWriterProfileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [articlePanel, setArticlePanel] = useState("saved");

  const publishedArticles = useMemo(
    () => articles.filter((article) => article.published),
    [articles]
  );
  const draftArticles = useMemo(
    () => articles.filter((article) => !article.published),
    [articles]
  );
  const hasArticleMedia = Boolean(filePreviewUrl || draft.mediaUrl);
  const hasWriterProfileMedia = Boolean(writerFilePreviewUrl || draft.writerPhotoUrl);

  useEffect(() => {
    const articlesQuery = query(collection(db, "articles"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      setArticles(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!writerFile) {
      setWriterFilePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(writerFile);
    setWriterFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [writerFile]);

  const resetDraft = () => {
    setDraft(blankArticle);
    setEditingId("");
    setFile(null);
    setWriterFile(null);
    setWriterProfileOpen(false);
  };

  const openCreatePanel = () => {
    resetDraft();
    setArticlePanel("create");
    setWriterProfileOpen(false);
  };

  const uploadArticleMedia = async () => {
    if (!file) return draft.mediaUrl;

    return createInlineImageUrl(file);
  };

  const uploadWriterProfileImage = async () => {
    if (!writerFile) return draft.writerPhotoUrl;

    return createInlineImageUrl(writerFile);
  };

  const saveArticle = async ({ published = draft.published } = {}) => {
    setSaving(true);
    setMessage("");

    try {
      let mediaUrl = draft.mediaUrl;
      let writerPhotoUrl = draft.writerPhotoUrl;
      let saveWarning = "";

      if (file) {
        mediaUrl = await uploadArticleMedia();
        saveWarning =
          " The image was compressed and saved with the article.";
      }

      if (writerFile) {
        writerPhotoUrl = await uploadWriterProfileImage();
        saveWarning += " The writer profile picture was compressed and saved too.";
      }

      const isPublished = Boolean(published);
      const title = draft.title.trim();
      const excerpt = draft.excerpt.trim();
      const body = draft.body.trim();
      const bodyText = stripHtmlTags(body);

      if (isPublished && (!title || !bodyText)) {
        throw new Error("Please add a title and body before publishing.");
      }

      const payload = {
        ...draft,
        published: isPublished,
        title,
        excerpt,
        body,
        writerName: draft.writerName.trim(),
        writerTitle: draft.writerTitle.trim(),
        writerBio: draft.writerBio.trim(),
        writerPhotoUrl,
        writerPhotoAlt: draft.writerPhotoAlt.trim(),
        writerInstagramUrl: normalizeOptionalUrl(draft.writerInstagramUrl),
        writerFacebookUrl: normalizeOptionalUrl(draft.writerFacebookUrl),
        writerLinkedinUrl: normalizeOptionalUrl(draft.writerLinkedinUrl),
        writerWebsiteUrl: normalizeOptionalUrl(draft.writerWebsiteUrl),
        mediaUrl,
        mediaAlt: draft.mediaAlt.trim(),
        mediaCaption: draft.mediaCaption.trim(),
        mediaPosition: draft.mediaPosition,
        updatedAt: serverTimestamp(),
      };

      if (isPublished && !draft.publishedAt) {
        payload.publishedAt = serverTimestamp();
      }

      const originalArticle = editingId
        ? articles.find((entry) => entry.id === editingId)
        : null;
      const shouldSendNotifications = isPublished && (!originalArticle || !originalArticle.published);
      let articleId = editingId;

      if (editingId) {
        await setDoc(doc(db, "articles", editingId), payload, { merge: true });
      } else {
        const created = await addDoc(collection(db, "articles"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        articleId = created.id;
      }

      let notificationSummary = null;
      if (shouldSendNotifications) {
        notificationSummary = await sendArticleNotificationEmails({
          article: {
            ...draft,
            ...payload,
            id: articleId,
          },
          articleId,
        });
      }

      resetDraft();
      setArticlePanel(isPublished ? "saved" : "drafts");
      const notificationNote = notificationSummary
        ? notificationSummary.sent > 0
          ? ` Notifications sent to ${notificationSummary.sent} active account${notificationSummary.sent === 1 ? "" : "s"}.`
          : " No active subscriber emails were found in Firestore."
        : "";
      setMessage(`Article saved.${saveWarning}${notificationNote}`);
    } catch (error) {
      setMessage(error.message || "Unable to save article.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await saveArticle();
  };

  const handleSaveDraft = async () => {
    await saveArticle({ published: false });
  };

  const handlePublishDraft = async () => {
    await saveArticle({ published: true });
  };

  const handleEdit = (article) => {
    setEditingId(article.id);
    setDraft({ ...blankArticle, ...article });
    setFile(null);
    setWriterFile(null);
    setWriterProfileOpen(false);
    setArticlePanel("create");
  };

  const handleDeleteArticle = (article) => {
    setDeleteTarget(article);
  };

  const confirmDeleteArticle = async () => {
    if (!deleteTarget) {
      return;
    }

    await deleteDoc(doc(db, "articles", deleteTarget.id));
    setDeleteTarget(null);
  };

  const cancelDeleteArticle = () => {
    setDeleteTarget(null);
  };

  const visibleArticles = articlePanel === "drafts" ? draftArticles : publishedArticles;
  const isDraftPanel = articlePanel === "drafts";
  const galleryTitle = isDraftPanel ? "Draft Articles" : "Published Articles";
  const galleryKicker = isDraftPanel ? "Drafts" : "Saved";
  const galleryDescription = isDraftPanel
    ? "Unpublished articles waiting for review or cleanup."
    : "Published articles are shown by default with their featured images.";

  return (
    <section className="admin-page admin-articles-page">
      <div className="admin-articles-workspace">
        <main className="admin-articles-stage">
          {articlePanel === "create" ? (
        <form id="admin-form" className="admin-form admin-article-form" onSubmit={handleSubmit}>
          <div className="admin-article-form__hero">
            <div>
              <span className="admin-form-kicker">{editingId ? "Edit article" : "Create article"}</span>
              <h2>{editingId ? "Refine this story" : "Compose a new story"}</h2>
              <p>
                Keep the body readable, attach media, and decide exactly how the image should sit
                inside the article.
              </p>
            </div>
            <div className="admin-article-form__status">
              <span>Current state</span>
              <strong>{draft.published ? "Ready to publish" : "Saved as draft"}</strong>
            </div>
          </div>

          {(filePreviewUrl || draft.mediaUrl) && (
            <figure className="admin-image-preview admin-image-preview--featured">
              <img
                src={filePreviewUrl || draft.mediaUrl}
                alt={draft.mediaAlt || draft.title || "Article image preview"}
              />
              <figcaption>
                {file ? "Preview of the uploaded image." : "Saved image from Firebase Storage."}
              </figcaption>
            </figure>
          )}

          <div className="admin-form-section">
            <div className="admin-form-section__header">
              <h3>Story details</h3>
              <p>Write the core article content first.</p>
            </div>
            <label>
              Title
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Excerpt
              <textarea
                value={draft.excerpt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, excerpt: event.target.value }))
                }
                rows={3}
              />
            </label>
            <div className="admin-article-body-field">
              <span className="admin-article-body-field__label">Body</span>
              <ArticleEditor
                value={draft.body}
                onChange={(nextBody) =>
                  setDraft((current) => ({ ...current, body: nextBody }))
                }
              />
            </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-section__header">
              <h3>Media studio</h3>
              <p>Upload or link imagery for the article.</p>
            </div>
            <label className="admin-file-drop">
              <span>Upload Media to Firebase Storage</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <p className="admin-help-text">
              The selected image uploads to Firebase Storage when you save the article, and the
              public URL is stored in Firestore so every reader can see it.
            </p>
            <div className="admin-grid-two">
              {!hasArticleMedia && (
                <label>
                  Media URL
                  <input
                    value={draft.mediaUrl}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, mediaUrl: event.target.value }))
                    }
                  />
                </label>
              )}
              <label>
                Media Alt Text
                <input
                  value={draft.mediaAlt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, mediaAlt: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-grid-two">
              <label>
                Media Caption
                <input
                  value={draft.mediaCaption}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mediaCaption: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Media Placement
                <select
                  value={draft.mediaPosition}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mediaPosition: event.target.value,
                    }))
                  }
                >
                  <option value="top">Top</option>
                  <option value="left">Left of text</option>
                  <option value="right">Right of text</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </div>
          </div>

          <button
            type="button"
            className="admin-form-section-toggle"
            onClick={() => setWriterProfileOpen((current) => !current)}
            aria-expanded={writerProfileOpen}
            aria-controls="writer-profile-section"
          >
            <span>Add Writer Profile (Optional)</span>
            <span className="admin-form-section-toggle__icon" aria-hidden="true">
              {writerProfileOpen ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>

          {writerProfileOpen && (
            <div
              className="admin-form-section admin-form-section--writer-profile"
              id="writer-profile-section"
            >
              <div className="admin-form-section__header">
                <h3>Writer Profile</h3>
                <p>Optional writer details, social links, and profile picture.</p>
              </div>
              {(writerFilePreviewUrl || draft.writerPhotoUrl) && (
                <figure className="admin-image-preview admin-image-preview--writer">
                  <img
                    src={writerFilePreviewUrl || draft.writerPhotoUrl}
                    alt={draft.writerPhotoAlt || draft.writerName || "Writer profile preview"}
                  />
                  <figcaption>
                    {writerFile
                      ? "Preview of the writer profile picture."
                      : "Saved writer profile picture."}
                  </figcaption>
                </figure>
              )}
              <label className="admin-file-drop">
                <span>Upload Writer Profile Picture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setWriterFile(event.target.files?.[0] || null)}
                />
              </label>
              <p className="admin-help-text">
                Optional. The selected writer picture uploads when you save the article, and the
                public URL is stored in Firestore with the article.
              </p>
              <div className="admin-grid-two">
                {!hasWriterProfileMedia && (
                  <label>
                    Profile Picture URL
                    <input
                      value={draft.writerPhotoUrl}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, writerPhotoUrl: event.target.value }))
                      }
                    />
                  </label>
                )}
                <label>
                  Profile Picture Alt Text
                  <input
                    value={draft.writerPhotoAlt}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerPhotoAlt: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="admin-grid-two">
                <label>
                  Writer Name
                  <input
                    value={draft.writerName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Writer Title
                  <input
                    value={draft.writerTitle}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerTitle: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label>
                Writer Bio
                <textarea
                  value={draft.writerBio}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, writerBio: event.target.value }))
                  }
                  rows={3}
                />
              </label>
              <div className="admin-grid-two">
                <label>
                  Instagram URL
                  <input
                    value={draft.writerInstagramUrl}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerInstagramUrl: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Facebook URL
                  <input
                    value={draft.writerFacebookUrl}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerFacebookUrl: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="admin-grid-two">
                <label>
                  LinkedIn URL
                  <input
                    value={draft.writerLinkedinUrl}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerLinkedinUrl: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Website URL
                  <input
                    value={draft.writerWebsiteUrl}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, writerWebsiteUrl: event.target.value }))
                    }
                  />
                </label>
              </div>
            </div>
          )}
          {false && (
          <details className="admin-form-section admin-form-section--subscribers">
            <summary className="admin-form-section__header admin-subscriber-toggle">
              <div className="admin-subscriber-toggle__row">
                <h3>Active subscriber preview</h3>
                <span className="admin-subscriber-toggle__icon" aria-hidden="true">
                  ▾
                </span>
              </div>
              <p>
                Live snapshot of active emails pulled from <code>articleSubscribers</code> in
                Firestore before you publish. Click to reveal the list.
              </p>
            </summary>
            <div className="admin-subscriber-summary">
              <div>
                <span>Active emails</span>
                <strong>{subscriberLoading ? "Loading..." : activeSubscribers.length}</strong>
              </div>
              <p>
                {subscriberLoading
                  ? "Fetching the latest active accounts from Firestore."
                  : "These are the recipients that would be targeted by the article notification flow."}
              </p>
            </div>
            {subscriberError && <p className="admin-message admin-message--error">{subscriberError}</p>}
            {!subscriberLoading && activeSubscribers.length === 0 ? (
              <p className="admin-empty">No active subscriber emails were found.</p>
            ) : (
              <div className="admin-subscriber-list">
                {activeSubscribers.map((subscriber) => (
                  <article className="admin-subscriber-item" key={subscriber.id}>
                    <strong>{subscriber.email}</strong>
                    <span>{subscriber.displayName || subscriber.authUid || subscriber.id}</span>
                  </article>
                ))}
              </div>
            )}
          </details>
          )}

          <div className="admin-form-section admin-form-section--footer">
            {message && <p className="admin-message admin-message--card">{message}</p>}
            <div className="admin-actions admin-actions--spaced">
              <button type="button" className="admin-secondary" onClick={handleSaveDraft} disabled={saving}>
                Save to draft
              </button>
              {!draft.published && (
                <button type="button" onClick={handlePublishDraft} disabled={saving}>
                  {saving ? "Publishing..." : "Publish Draft"}
                </button>
              )}
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Article"}
              </button>
              <button type="button" className="admin-secondary" onClick={resetDraft}>
                Clear
              </button>
            </div>
          </div>
        </form>
          ) : (
            <div className="admin-list admin-article-list admin-article-gallery">
              <div className="admin-list-header admin-article-gallery__header">
                <div>
                  <span>{galleryKicker}</span>
                  <h2>{galleryTitle}</h2>
                </div>
                <p>{galleryDescription}</p>
              </div>
              {visibleArticles.length === 0 ? (
                <p className="admin-empty">
                  {isDraftPanel ? "No draft articles yet." : "No published articles yet."}
                </p>
              ) : (
                <div className="admin-article-card-grid">
                  {visibleArticles.map((article) => (
                    <article className="admin-article-card" key={article.id}>
                      <div className="admin-article-card__media">
                        {article.mediaUrl ? (
                          <img
                            src={article.mediaUrl}
                            alt={article.mediaAlt || article.title || "Article image"}
                          />
                        ) : (
                          <div className="admin-article-card__placeholder">
                            <FaNewspaper aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="admin-article-card__body">
                        <div className="admin-list-item__meta">
                          <span>{article.published ? "Published" : "Draft"}</span>
                          {article.mediaUrl && <small>Has media</small>}
                        </div>
                        <h3>{article.title}</h3>
                        <p>{article.excerpt || "No excerpt added yet."}</p>
                        <div className="admin-row-actions">
                          <button type="button" onClick={() => handleEdit(article)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteArticle(article)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
        <aside className="admin-article-mode-rail" aria-label="Article workspace views">
          <button
            type="button"
            className={articlePanel === "saved" ? "is-active" : ""}
            onClick={() => setArticlePanel("saved")}
            aria-label="Show published articles"
            title="Published"
          >
            <FaNewspaper aria-hidden="true" />
          </button>
          <button
            type="button"
            className={articlePanel === "create" ? "is-active" : ""}
            onClick={openCreatePanel}
            aria-label="Create article"
            title="Create"
          >
            <FaPlus aria-hidden="true" />
          </button>
          <button
            type="button"
            className={articlePanel === "drafts" ? "is-active" : ""}
            onClick={() => setArticlePanel("drafts")}
            aria-label="Show draft articles"
            title="Drafts"
          >
            <FaPen aria-hidden="true" />
          </button>
        </aside>
        </div>
      <ArticleDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        articleTitle={deleteTarget?.title || ""}
        onCancel={cancelDeleteArticle}
        onConfirm={confirmDeleteArticle}
      />
    </section>
  );
}

export function SiteContentEditor({ configKey }) {
  const config = siteContentConfigs[configKey];
  const location = useLocation();
  const usesFieldActions = true;
  const [form, setForm] = useState(config.fallback);
  const [savedForm, setSavedForm] = useState(config.fallback);
  const [editableFields, setEditableFields] = useState({});
  const [savingFields, setSavingFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "siteContent", config.docId), (snapshot) => {
      const nextForm = snapshot.exists() ? { ...config.fallback, ...snapshot.data() } : config.fallback;
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditableFields({});
      setSavingFields({});
    });

    return unsubscribe;
  }, [config]);

  useEffect(() => {
    if (configKey !== "contact" || location.hash !== "#consultation-review") {
      return;
    }

    const element = document.getElementById("consultation-review");
    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [configKey, location.hash]);

  const handleSave = async (event) => {
    event.preventDefault();

    if (usesFieldActions) {
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = config.fields.reduce((values, field) => {
      values[field.name] = coerceValue(field, form[field.name]);
      return values;
    }, {});

    try {
      await setDoc(doc(db, "siteContent", config.docId), payload, { merge: true });
      setMessage("Saved.");
      setEditableFields({});
    } catch (error) {
      setMessage(error.message || "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldEdit = (fieldName) => {
    setEditableFields((current) => ({
      ...current,
      [fieldName]: true,
    }));
    setMessage("");
  };

  const handleFieldCancel = (fieldName) => {
    setForm((current) => ({
      ...current,
      [fieldName]: savedForm[fieldName],
    }));
    setEditableFields((current) => ({
      ...current,
      [fieldName]: false,
    }));
    setMessage("");
  };

  const handleFieldSave = async (field) => {
    setSavingFields((current) => ({
      ...current,
      [field.name]: true,
    }));
    setMessage("");

    try {
      const nextValue = coerceValue(field, form[field.name]);
      await setDoc(
        doc(db, "siteContent", config.docId),
        { [field.name]: nextValue },
        { merge: true }
      );
      setSavedForm((current) => ({
        ...current,
        [field.name]: nextValue,
      }));
      setEditableFields((current) => ({
        ...current,
        [field.name]: false,
      }));
      setMessage(`${field.label} saved.`);
    } catch (error) {
      setMessage(error.message || `Unable to save ${field.label}.`);
    } finally {
      setSavingFields((current) => ({
        ...current,
        [field.name]: false,
      }));
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <Link className="admin-back-link" to="/admin/page-content">
          <FaArrowLeft aria-hidden="true" />
          <span className="sr-only">Back to Page Content</span>
        </Link>
        <span>Site Content</span>
        <h1>{config.title}</h1>
      </div>
      <form className="admin-form" onSubmit={handleSave}>
        {config.fields.map((field) => (
          <AdminField
            key={field.name}
            field={field}
            value={fieldToInputValue(field, form[field.name])}
            onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            locked={usesFieldActions && !editableFields[field.name]}
            saving={Boolean(savingFields[field.name])}
            onEdit={
              usesFieldActions
                ? () => handleFieldEdit(field.name)
                : undefined
            }
            onSave={
              usesFieldActions
                ? () => handleFieldSave(field)
                : undefined
            }
            onCancel={
              usesFieldActions
                ? () => handleFieldCancel(field.name)
                : undefined
            }
          />
        ))}
        {message && <p className="admin-message">{message}</p>}
        {!usesFieldActions && (
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </form>
      {configKey === "contact" && <ConsultationsPanel />}
    </section>
  );
}

function AdminField({
  field,
  value,
  onChange,
  locked = false,
  saving = false,
  onEdit,
  onSave,
  onCancel,
}) {
  const actions = onEdit ? (
    <span className="admin-field-actions">
      {locked ? (
        <button
          type="button"
          className="admin-field-icon-button"
          onClick={onEdit}
          aria-label={`Edit ${field.label}`}
          title={`Edit ${field.label}`}
        >
          <FaPen aria-hidden="true" />
        </button>
      ) : (
        <>
          <button
            type="button"
            className="admin-field-icon-button admin-field-icon-button--save"
            onClick={onSave}
            disabled={saving}
            aria-label={`Save ${field.label}`}
            title={`Save ${field.label}`}
          >
            <FaCheck aria-hidden="true" />
          </button>
          <button
            type="button"
            className="admin-field-icon-button admin-field-icon-button--cancel"
            onClick={onCancel}
            disabled={saving}
            aria-label={`Cancel ${field.label}`}
            title={`Cancel ${field.label}`}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </>
      )}
    </span>
  ) : null;

  if (field.type === "checkbox") {
    return (
      <div className="admin-editable-field">
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={locked}
            onChange={(event) => onChange(event.target.checked)}
          />
          {field.label}
        </label>
        {actions}
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "lines" || field.type === "blocks") {
    return (
      <label className="admin-editable-field">
        {field.label}
        <span className="admin-editable-field__control">
          <textarea
            value={value}
            rows={field.type === "blocks" ? 8 : 4}
            disabled={locked}
            onChange={(event) => onChange(event.target.value)}
          />
          {actions}
        </span>
      </label>
    );
  }

  return (
    <label className="admin-editable-field">
      {field.label}
      <span className="admin-editable-field__control">
        <input
          type={field.type || "text"}
          value={value}
          disabled={locked}
          onChange={(event) => onChange(event.target.value)}
        />
        {actions}
      </span>
    </label>
  );
}

export function CollectionEditor({ configKey }) {
  const config = collectionConfigs[configKey];
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyFromFields(config.fields));
  const [savedDraft, setSavedDraft] = useState(emptyFromFields(config.fields));
  const [editingId, setEditingId] = useState("");
  const [editableFields, setEditableFields] = useState({});
  const [savingFields, setSavingFields] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const collectionQuery = query(
      collection(db, config.collectionName),
      orderBy("order", "asc")
    );
    const unsubscribe = onSnapshot(collectionQuery, (snapshot) => {
      setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, [config.collectionName]);

  const resetDraft = () => {
    const emptyDraft = emptyFromFields(config.fields);
    setDraft(emptyDraft);
    setSavedDraft(emptyDraft);
    setEditingId("");
    setEditableFields({});
    setSavingFields({});
  };

  const seedDefaults = async () => {
    setMessage("");
    await Promise.all(
      config.defaults.map((item) =>
        setDoc(doc(db, config.collectionName, item.id), item, { merge: true })
      )
    );
    setMessage("Default content seeded.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (editingId) {
      return;
    }

    const payload = config.fields.reduce((values, field) => {
      values[field.name] = coerceValue(field, draft[field.name]);
      return values;
    }, {});

    try {
      if (editingId) {
        await setDoc(doc(db, config.collectionName, editingId), payload, { merge: true });
      } else {
        await addDoc(collection(db, config.collectionName), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetDraft();
      setMessage("Saved.");
    } catch (error) {
      setMessage(error.message || "Unable to save.");
    }
  };

  const handleEdit = (item) => {
    const nextDraft = config.fields.reduce((values, field) => {
      values[field.name] = fieldToInputValue(field, item[field.name]);
      return values;
    }, {});

    setEditingId(item.id);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    setEditableFields({});
    setSavingFields({});
    setMessage("");
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, config.collectionName, id));
  };

  const handleFieldEdit = (fieldName) => {
    setEditableFields((current) => ({
      ...current,
      [fieldName]: true,
    }));
    setMessage("");
  };

  const handleFieldCancel = (fieldName) => {
    setDraft((current) => ({
      ...current,
      [fieldName]: savedDraft[fieldName],
    }));
    setEditableFields((current) => ({
      ...current,
      [fieldName]: false,
    }));
    setMessage("");
  };

  const handleFieldSave = async (field) => {
    if (!editingId) {
      return;
    }

    setSavingFields((current) => ({
      ...current,
      [field.name]: true,
    }));
    setMessage("");

    try {
      const nextValue = coerceValue(field, draft[field.name]);
      await setDoc(
        doc(db, config.collectionName, editingId),
        { [field.name]: nextValue, updatedAt: serverTimestamp() },
        { merge: true }
      );
      const displayValue = fieldToInputValue(field, nextValue);
      setDraft((current) => ({
        ...current,
        [field.name]: displayValue,
      }));
      setSavedDraft((current) => ({
        ...current,
        [field.name]: displayValue,
      }));
      setEditableFields((current) => ({
        ...current,
        [field.name]: false,
      }));
      setMessage(`${field.label} saved.`);
    } catch (error) {
      setMessage(error.message || `Unable to save ${field.label}.`);
    } finally {
      setSavingFields((current) => ({
        ...current,
        [field.name]: false,
      }));
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <Link className="admin-back-link" to="/admin/page-content">
          <FaArrowLeft aria-hidden="true" />
          <span className="sr-only">Back to Page Content</span>
        </Link>
        <span>Collection</span>
        <h1>{config.title}</h1>
      </div>

      <div className="admin-two-column">
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit item" : "Add item"}</h2>
          {config.fields.map((field) => (
            <AdminField
              key={field.name}
              field={field}
              value={draft[field.name]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, [field.name]: value }))
              }
              locked={Boolean(editingId) && !editableFields[field.name]}
              saving={Boolean(savingFields[field.name])}
              onEdit={
                editingId
                  ? () => handleFieldEdit(field.name)
                  : undefined
              }
              onSave={
                editingId
                  ? () => handleFieldSave(field)
                  : undefined
              }
              onCancel={
                editingId
                  ? () => handleFieldCancel(field.name)
                  : undefined
              }
            />
          ))}
          {message && <p className="admin-message">{message}</p>}
          <div className="admin-actions">
            {!editingId && <button type="submit">Create</button>}
            <button type="button" className="admin-secondary" onClick={resetDraft}>
              Clear
            </button>
            <button type="button" className="admin-secondary" onClick={seedDefaults}>
              Seed defaults
            </button>
          </div>
        </form>

        <div className="admin-list">
          {items.length === 0 ? (
            <p className="admin-empty">No saved items yet.</p>
          ) : (
            items.map((item) => (
              <article className="admin-list-item" key={item.id}>
                <div>
                  <h3>{item.title || item.question || item.category}</h3>
                  <p>{item.shortDescription || item.description || item.answer}</p>
                  <span>{item.published === false ? "Draft" : "Published"}</span>
                </div>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => handleEdit(item)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ConsultationsPanel() {
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [selectedConsultationId, setSelectedConsultationId] = useState("");
  const [reviewStatus, setReviewStatus] = useState("new");
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    const consultationQuery = query(
      collection(db, "consultations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(consultationQuery, (snapshot) => {
      setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, []);

  const statusCounts = useMemo(
    () =>
      items.reduce(
        (counts, item) => {
          const status = getConsultationStatus(item);
          counts[status] += 1;
          counts.all += 1;
          return counts;
        },
        { all: 0, new: 0, contacted: 0, archived: 0 }
      ),
    [items]
  );

  const filteredItems = useMemo(
    () => items.filter((item) => filter === "all" || getConsultationStatus(item) === filter),
    [filter, items]
  );

  const selectedConsultation = useMemo(
    () =>
      filteredItems.find((item) => item.id === selectedConsultationId) ||
      filteredItems[0] ||
      null,
    [filteredItems, selectedConsultationId]
  );

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedConsultationId("");
      return;
    }

    if (!filteredItems.some((item) => item.id === selectedConsultationId)) {
      setSelectedConsultationId(filteredItems[0].id);
    }
  }, [filteredItems, selectedConsultationId]);

  useEffect(() => {
    if (!selectedConsultation) {
      setReviewStatus("new");
      setReviewNotes("");
      setReviewMessage("");
      return;
    }

    const nextStatus = getConsultationStatus(selectedConsultation);
    setReviewStatus(nextStatus);
    setReviewNotes(selectedConsultation.reviewNotes || selectedConsultation.adminNotes || "");
  }, [selectedConsultation?.id]);

  const openConsultation = (item) => {
    setSelectedConsultationId(item.id);
    setReviewMessage("");
  };

  const updateConsultation = async (nextStatus, nextNotes = reviewNotes) => {
    if (!selectedConsultation) return;

    setSavingReview(true);
    setReviewMessage("");

    try {
      await updateDoc(doc(db, "consultations", selectedConsultation.id), {
        status: nextStatus,
        reviewNotes: String(nextNotes || "").trim(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.displayName || user?.email || user?.uid || "",
      });
      setReviewMessage(`Saved as ${CONSULTATION_STATUS_LABELS[nextStatus] || nextStatus}.`);
    } catch (error) {
      setReviewMessage(error.message || "Unable to save the review.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveReview = async () => {
    await updateConsultation(reviewStatus, reviewNotes);
  };

  const handleQuickStatus = async (nextStatus) => {
    setReviewStatus(nextStatus);
    await updateConsultation(nextStatus, reviewNotes);
  };

  const handleDeleteConsultation = async () => {
    if (!selectedConsultation) return;

    const confirmed = window.confirm(
      `Delete the consultation request from ${getConsultationName(selectedConsultation)}?`
    );

    if (!confirmed) {
      return;
    }

    setSavingReview(true);
    setReviewMessage("");

    try {
      await deleteDoc(doc(db, "consultations", selectedConsultation.id));
      setReviewMessage("Consultation deleted.");
      setSelectedConsultationId("");
    } catch (error) {
      setReviewMessage(error.message || "Unable to delete the consultation.");
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <section className="admin-panel admin-consultation-review" id="consultation-review">
      <div className="admin-page-header admin-consultation-review__header">
        <span>Submissions</span>
        <h1>Consultation Review</h1>
        <p>Filter consultations, review details, and keep internal notes for follow-up.</p>
      </div>

      <div className="admin-consultation-review__stats">
        <div className="admin-consultation-stat">
          <span>Total</span>
          <strong>{statusCounts.all}</strong>
          <small>requests</small>
        </div>
        <div className="admin-consultation-stat">
          <span>New</span>
          <strong>{statusCounts.new}</strong>
          <small>waiting</small>
        </div>
        <div className="admin-consultation-stat">
          <span>Contacted</span>
          <strong>{statusCounts.contacted}</strong>
          <small>followed up</small>
        </div>
        <div className="admin-consultation-stat">
          <span>Archived</span>
          <strong>{statusCounts.archived}</strong>
          <small>closed</small>
        </div>
      </div>

      <div className="admin-consultation-toolbar">
        <div className="admin-consultation-toolbar__copy">
          <span>Review queue</span>
          <strong>{filteredItems.length} shown</strong>
        </div>
        <div className="admin-consultation-filters" role="tablist" aria-label="Filter consultations">
          {CONSULTATION_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-consultation-filter${filter === option.value ? " is-active" : ""}`}
              onClick={() => setFilter(option.value)}
            >
              <span>{option.label}</span>
              <strong>{statusCounts[option.value]}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-consultation-review__workspace">
        <div className="admin-consultation-list">
          {filteredItems.length === 0 ? (
            <p className="admin-empty">No consultation requests match this filter.</p>
          ) : (
            filteredItems.map((item) => {
              const status = getConsultationStatus(item);
              const isSelected = selectedConsultation?.id === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`admin-consultation-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => openConsultation(item)}
                  aria-pressed={isSelected}
                >
                  <div className="admin-consultation-card__header">
                    <div className="admin-consultation-card__copy">
                      <strong>{item.email || "No email supplied"}</strong>
                      <span>Booked for {item.scheduleDate || "no date"}</span>
                    </div>
                    <span className={`admin-consultation-status-badge admin-consultation-status-badge--${status}`}>
                      {CONSULTATION_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="admin-consultation-card__meta">
                    <span>{formatConsultationTimestamp(item.createdAt)}</span>
                    <span>{item.phone || "No phone"}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <aside className="admin-consultation-drawer">
          {selectedConsultation ? (
            <>
              <div className="admin-consultation-drawer__header">
                <div>
                  <span>Selected consultation</span>
                  <h3>{selectedConsultation.email || "No email supplied"}</h3>
                  <p>Booked by {getConsultationName(selectedConsultation)}</p>
                </div>
                <span
                  className={`admin-consultation-status-badge admin-consultation-status-badge--${getConsultationStatus(
                    selectedConsultation
                  )}`}
                >
                  {CONSULTATION_STATUS_LABELS[getConsultationStatus(selectedConsultation)]}
                </span>
              </div>

              <div className="admin-consultation-drawer__details">
                <div className="admin-consultation-detail">
                  <span>Booked by</span>
                  <strong>{getConsultationName(selectedConsultation)}</strong>
                </div>
                <div className="admin-consultation-detail">
                  <span>Consultation date</span>
                  <strong>{selectedConsultation.scheduleDate || "Not set"}</strong>
                </div>
                <div className="admin-consultation-detail">
                  <span>Phone</span>
                  <strong>{selectedConsultation.phone || "Not provided"}</strong>
                </div>
                <div className="admin-consultation-detail">
                  <span>Submitted</span>
                  <strong>{formatConsultationTimestamp(selectedConsultation.createdAt)}</strong>
                </div>
                <div className="admin-consultation-detail">
                  <span>Reviewed</span>
                  <strong>{formatConsultationTimestamp(selectedConsultation.reviewedAt)}</strong>
                </div>
                <div className="admin-consultation-detail">
                  <span>Auth</span>
                  <strong>{selectedConsultation.authEmail || selectedConsultation.authUid || "Guest"}</strong>
                </div>
              </div>

              <label className="admin-consultation-field">
                Status
                <select
                  value={reviewStatus}
                  onChange={(event) => setReviewStatus(event.target.value)}
                >
                  {CONSULTATION_STATUS_OPTIONS.filter((option) => option.value !== "all").map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="admin-consultation-field">
                Internal notes
                <textarea
                  rows={7}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Add call notes, follow-up details, or any internal review context."
                />
              </label>

              {reviewMessage && <p className="admin-message admin-message--card">{reviewMessage}</p>}

              <div className="admin-consultation-drawer__actions">
                <button type="button" onClick={handleSaveReview} disabled={savingReview}>
                  {savingReview ? "Saving..." : "Save review"}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => handleQuickStatus("new")}
                  disabled={savingReview}
                >
                  Mark new
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => handleQuickStatus("contacted")}
                  disabled={savingReview}
                >
                  Contacted
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => handleQuickStatus("archived")}
                  disabled={savingReview}
                >
                  Archive
                </button>
                <button
                  type="button"
                  className="admin-secondary admin-secondary--danger"
                  onClick={handleDeleteConsultation}
                  disabled={savingReview}
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="admin-consultation-drawer__empty">
              <p className="admin-empty">Select a consultation to review its details.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export function MediaPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const mediaQuery = query(collection(db, "media"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      setMedia(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    });

    return unsubscribe;
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const storagePath = `media/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "media"), {
        name: file.name,
        path: storagePath,
        url,
        createdAt: serverTimestamp(),
      });
      setFile(null);
      setMessage("Uploaded.");
    } catch (error) {
      setMessage(error.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <span>Storage</span>
        <h1>Media</h1>
        <p>Upload images, then paste the generated URL into hero/about fields.</p>
      </div>

      <form className="admin-form" onSubmit={handleUpload}>
        <label>
          Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        {message && <p className="admin-message">{message}</p>}
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <div className="admin-media-grid">
        {media.map((item) => (
          <article className="admin-media-card" key={item.id}>
            <img src={item.url} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <input value={item.url} readOnly onFocus={(event) => event.target.select()} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
