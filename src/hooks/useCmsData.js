import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import { defaultLayoutContent } from "../data/defaultContent";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { emptySpacing, buildSpacingStyle } from "../utils/spacing";

const sortByOrder = (items) =>
  [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const emptySectionStyle = {
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
  fontFamily: "",
  ...emptySpacing(),
};

export function useCmsDocument(documentId, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "siteContent", documentId),
      (snapshot) => {
        setData(snapshot.exists() ? { ...fallback, ...snapshot.data() } : fallback);
        setLoading(false);
      },
      () => {
        setData(fallback);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [documentId, fallback]);

  return { data, loading };
}

export function useCmsCollection(collectionName, fallback) {
  const [items, setItems] = useState(sortByOrder(fallback));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectionQuery = query(collection(db, collectionName), orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot) => {
        const docs = snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .filter((item) => item.published !== false);

        setItems(docs.length ? docs : sortByOrder(fallback));
        setLoading(false);
      },
      () => {
        setItems(sortByOrder(fallback));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName, fallback]);

  return { items, loading };
}

export function normalizeSectionOrder(order, knownKeys) {
  const seen = new Set();
  const filtered = (Array.isArray(order) ? order : []).filter((key) => {
    if (!knownKeys.includes(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  knownKeys.forEach((key) => {
    if (!seen.has(key)) filtered.push(key);
  });

  return filtered;
}

export function useCmsLayout() {
  return useCmsDocument("layout", defaultLayoutContent);
}

export function useCmsDocumentOverride(documentId, fallback) {
  const live = useCmsDocument(documentId, fallback);
  const editorContext = useLayoutEditorContext();

  if (!editorContext?.editMode) return live;

  const patch = editorContext.pendingContent?.[documentId] || {};
  return { data: { ...live.data, ...patch }, loading: live.loading };
}

export function useCmsCollectionOverride(collectionName, fallback) {
  const live = useCmsCollection(collectionName, fallback);
  const editorContext = useLayoutEditorContext();

  if (!editorContext?.editMode) return live;

  const pending = editorContext.pendingCollections?.[collectionName] || {
    order: null,
    items: {},
  };
  const merged = live.items.map((item) => ({ ...item, ...(pending.items[item.id] || {}) }));
  const orderedIds = normalizeSectionOrder(
    pending.order,
    merged.map((item) => item.id)
  );
  const byId = Object.fromEntries(merged.map((item) => [item.id, item]));

  return { items: orderedIds.map((id) => byId[id]), loading: live.loading };
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export function inferBackgroundType(raw) {
  if (raw?.backgroundType) return raw.backgroundType;
  if (raw?.backgroundColor) return "color";
  if (raw?.backgroundImage) return "image";
  return "";
}

// Shared by section backgrounds (buildSectionStyle below) and Hero.jsx, whose
// background lives on a separate inner `.hero-bg` layer instead of the section root.
export function buildBackgroundStyle(raw) {
  const style = {};
  const type = inferBackgroundType(raw);
  const layers = [];

  if (raw?.overlayColor && raw?.overlayOpacity) {
    const rgb = hexToRgb(raw.overlayColor);
    if (rgb) {
      const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${raw.overlayOpacity})`;
      layers.push(`linear-gradient(${rgba}, ${rgba})`);
    }
  }

  if (type === "gradient" && raw.gradientFrom && raw.gradientTo) {
    layers.push(`linear-gradient(${raw.gradientAngle || "180deg"}, ${raw.gradientFrom}, ${raw.gradientTo})`);
  } else if (type === "image" && raw.backgroundImage) {
    layers.push(`url(${raw.backgroundImage})`);
  }

  if (layers.length > 0) {
    style.backgroundImage = layers.join(", ");
  } else if (type === "color" && raw.backgroundColor) {
    style.backgroundImage = "none";
  }

  if (type === "color" && raw.backgroundColor) {
    style.backgroundColor = raw.backgroundColor;
  }

  if (type === "image") {
    style.backgroundSize = raw.backgroundSize === "repeat" ? "auto" : raw.backgroundSize || "cover";
    style.backgroundPosition = raw.backgroundPosition || "center";
    style.backgroundRepeat = raw.backgroundSize === "repeat" ? "repeat" : "no-repeat";
  } else if (layers.length > 0) {
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
  }

  return style;
}

function buildSectionStyle(raw) {
  const style = {};

  if (raw.fontFamily) style.fontFamily = raw.fontFamily;

  return { ...style, ...buildBackgroundStyle(raw), ...buildSpacingStyle(raw) };
}

export function useSectionStyleOverride(sectionKey) {
  const { data: layout } = useCmsLayout();
  const editorContext = useLayoutEditorContext();

  const raw =
    (editorContext?.editMode ? editorContext.pendingStyles?.[sectionKey] : null) ||
    layout.styles?.[sectionKey] ||
    emptySectionStyle;

  return { raw, style: buildSectionStyle(raw) };
}
