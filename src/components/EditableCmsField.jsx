import { cloneElement, createElement, useRef, useState } from "react";
import { FaImage } from "react-icons/fa";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { coerceValue, fieldToInputValue } from "../utils/cmsFieldTypes";
import { uploadCmsImage } from "../utils/cmsImageUpload";
import { buildSpacingStyle } from "../utils/spacing";

export function buildFieldStyle(raw) {
  if (!raw) return undefined;
  const style = {};
  if (raw.fontFamily) style.fontFamily = raw.fontFamily;
  if (raw.fontWeight) style.fontWeight = raw.fontWeight;
  if (raw.fontStyle) style.fontStyle = raw.fontStyle;
  if (raw.fontSize) style.fontSize = raw.fontSize;
  if (raw.textDecoration) style.textDecoration = raw.textDecoration;
  if (raw.color) style.color = raw.color;
  if (raw.backgroundColor) style.backgroundColor = raw.backgroundColor;
  if (raw.textAlign) style.textAlign = raw.textAlign;
  return { ...style, ...buildSpacingStyle(raw) };
}

export function EditableCmsField({
  as = "span",
  renderView,
  className,
  type = "text",
  value,
  onCommit,
  sectionKey,
  styleValue,
  fieldRef,
  ariaLabel,
}) {
  const ctx = useLayoutEditorContext();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  const resolvedStyle = buildFieldStyle(styleValue);
  const isListType = type === "lines" || type === "blocks";

  const buildView = () =>
    renderView
      ? renderView(value)
      : createElement(as, { className, style: resolvedStyle }, value);

  if (!ctx?.editMode) {
    return buildView();
  }

  const selectThisField = () => {
    ctx.selectField(sectionKey, fieldRef);
  };

  // --- List-type fields (lines/blocks): swap to a textarea while editing, as before. ---
  if (isListType) {
    const startEditing = () => {
      setDraftValue(fieldToInputValue({ type }, value));
      setIsEditing(true);
    };

    const commit = () => {
      setIsEditing(false);
      const coerced = coerceValue({ type }, draftValue);
      if (JSON.stringify(coerced) === JSON.stringify(value)) return;
      onCommit(coerced);
    };

    if (isEditing) {
      return (
        <textarea
          autoFocus
          rows={4}
          className={["cms-editable-field", "cms-editable-field--editing", className]
            .filter(Boolean)
            .join(" ")}
          style={resolvedStyle}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setIsEditing(false);
            }
          }}
          onClick={(event) => event.stopPropagation()}
          data-cms-interactive="true"
          aria-label={ariaLabel}
        />
      );
    }

    const view = buildView();

    return cloneElement(view, {
      className: ["cms-editable-field", view.props.className, className].filter(Boolean).join(" "),
      style: { ...view.props.style, ...resolvedStyle },
      "data-cms-interactive": "true",
      "aria-label": ariaLabel,
      onClick: (event) => {
        event.stopPropagation();
        selectThisField();
        startEditing();
      },
    });
  }

  // --- Scalar fields (text/textarea): edit directly in place, no visual swap. ---
  const commitFromNode = (node) => {
    const raw = type === "text" ? node.textContent : node.innerText;
    const coerced = coerceValue({ type }, raw);
    if (JSON.stringify(coerced) === JSON.stringify(value)) return;
    onCommit(coerced);
  };

  const handleBlur = (event) => {
    commitFromNode(event.currentTarget);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.textContent = value;
      event.currentTarget.blur();
    } else if (event.key === "Enter" && type === "text") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const view = buildView();

  return cloneElement(view, {
    className: ["cms-editable-field", view.props.className, className].filter(Boolean).join(" "),
    style: { ...view.props.style, ...resolvedStyle },
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-cms-interactive": "true",
    "aria-label": ariaLabel,
    onClick: (event) => {
      event.stopPropagation();
      selectThisField();
    },
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
  });
}

export function EditableCmsImage({
  src,
  alt,
  className,
  sectionKey,
  storagePathPrefix,
  onCommit,
  fieldRef,
  styleValue,
}) {
  const ctx = useLayoutEditorContext();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const resolvedStyle = buildFieldStyle(styleValue);

  if (!ctx?.editMode) {
    return <img src={src} alt={alt} className={className} style={resolvedStyle} />;
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadCmsImage(file, storagePathPrefix);
      onCommit(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <span
      className="cms-editable-image"
      data-cms-interactive="true"
      onClick={(event) => {
        event.stopPropagation();
        if (fieldRef) {
          ctx.selectField(sectionKey, fieldRef);
        } else {
          ctx.selectSection(sectionKey);
        }
      }}
    >
      <img src={src} alt={alt} className={className} style={resolvedStyle} />
      <button
        type="button"
        className="cms-editable-image__overlay"
        data-cms-interactive="true"
        onClick={(event) => {
          event.stopPropagation();
          ctx.selectSection(sectionKey);
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        aria-label="Replace image"
      >
        <FaImage />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleUpload}
      />
    </span>
  );
}
