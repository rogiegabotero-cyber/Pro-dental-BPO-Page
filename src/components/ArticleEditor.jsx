import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import {
  FaAlignCenter,
  FaAlignJustify,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaChevronDown,
  FaEraser,
  FaCode,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaQuoteRight,
  FaRedo,
  FaStrikethrough,
  FaTable,
  FaMinus,
  FaPlus,
  FaTrash,
  FaUnderline,
  FaUndo,
} from "react-icons/fa";
import "../assets/Style/articleEditor.css";

const TABLE_PICKER_ROWS = 8;
const TABLE_PICKER_COLS = 8;
const EMPTY_HTML = "<p></p>";
const TABLE_CELL_COLOR_OPTIONS = Object.freeze([
  "#ffffff",
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#fee2e2",
  "#ede9fe",
  "#f1f5f9",
]);
const TABLE_CELL_WIDTH_MIN = 80;
const TABLE_CELL_WIDTH_MAX = 900;
const TABLE_CELL_WIDTH_STEP = 10;
const TABLE_CELL_HEIGHT_MIN = 36;
const TABLE_CELL_HEIGHT_MAX = 360;
const TABLE_CELL_HEIGHT_STEP = 4;

const normalizeHtml = (html) => {
  const nextValue = String(html || "").trim();
  return nextValue ? nextValue : EMPTY_HTML;
};

const normalizeTableDimension = (value, min, max, fallback) => {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(nextValue)));
};

const parseTableDimension = (value) => {
  const nextValue = String(value || "").trim();
  if (!nextValue) return null;
  const parsed = Number.parseInt(nextValue.replace(/px$/i, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const readStyleDimension = (element, propertyName) => {
  if (!element) return null;
  const raw = element.style?.[propertyName] || element.getAttribute(`data-${propertyName}`);
  return parseTableDimension(raw);
};

const ArticleTableCellAttributes = Extension.create({
  name: "articleTableCellAttributes",
  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-cell-background") ||
              element.style.backgroundColor ||
              null,
            renderHTML: (attributes) =>
              attributes.backgroundColor
                ? {
                    "data-cell-background": attributes.backgroundColor,
                    style: `background-color: ${attributes.backgroundColor};`,
                  }
                : {},
          },
          cellWidth: {
            default: null,
            parseHTML: (element) => readStyleDimension(element, "width"),
            renderHTML: (attributes) =>
              attributes.cellWidth
                ? {
                    "data-cell-width": String(attributes.cellWidth),
                    style: `width: ${attributes.cellWidth}px;`,
                  }
                : {},
          },
          cellHeight: {
            default: null,
            parseHTML: (element) => readStyleDimension(element, "height"),
            renderHTML: (attributes) =>
              attributes.cellHeight
                ? {
                    "data-cell-height": String(attributes.cellHeight),
                    style: `height: ${attributes.cellHeight}px;`,
                  }
                : {},
          },
        },
      },
    ];
  },
});

const formatUrl = (value = "") => {
  const nextValue = String(value || "").trim();
  if (!nextValue) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(nextValue)) return nextValue;
  return `https://${nextValue}`;
};

const getBlockValue = (editor) => {
  if (!editor) return "p";
  if (editor.isActive("tableCell") || editor.isActive("tableHeader")) return null;
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("blockquote")) return "blockquote";
  if (editor.isActive("codeBlock")) return "pre";
  return "p";
};

const ToolbarButton = ({ label, icon: Icon, active, onClick, className = "" }) => (
  <button
    type="button"
    className={`article-editor__button${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <Icon aria-hidden="true" />
  </button>
);

const TableColorSwatch = ({ color, active, onPick }) => (
  <button
    type="button"
    className={`article-editor__swatch${active ? " is-active" : ""}`}
    style={{ backgroundColor: color }}
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => onPick(color)}
    aria-label={`Set cell color ${color}`}
    aria-pressed={active}
    title={color === "#ffffff" ? "No fill" : color}
  />
);

export default function ArticleEditor({
  value,
  onChange,
  placeholder = "Write the body of the article here...",
}) {
  const tablePickerRef = useRef(null);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tablePickerHover, setTablePickerHover] = useState({ rows: 1, cols: 1 });
  const [editorVersion, bumpEditorVersion] = useReducer((state) => state + 1, 0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      ArticleTableCellAttributes,
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TableKit.configure({
        resizable: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizeHtml(value),
    editorProps: {
      attributes: {
        class: "article-editor__surface",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    onSelectionUpdate: () => {
      bumpEditorVersion();
    },
    onFocus: () => {
      bumpEditorVersion();
    },
    onBlur: () => {
      bumpEditorVersion();
    },
    injectCSS: false,
  });

  useEffect(() => {
    if (!editor) return;

    const nextValue = normalizeHtml(value);
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!tablePickerOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!tablePickerRef.current?.contains(event.target)) {
        setTablePickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [tablePickerOpen]);

  const isTableContext = Boolean(editor?.isActive("tableCell") || editor?.isActive("tableHeader"));
  const activeBlock = useMemo(() => {
    if (isTableContext) {
      return "";
    }

    return getBlockValue(editor);
  }, [editor, editorVersion, isTableContext]);

  const activeMarks = useMemo(
    () => ({
      bold: Boolean(editor?.isActive("bold")),
      italic: Boolean(editor?.isActive("italic")),
      underline: Boolean(editor?.isActive("underline")),
      strike: Boolean(editor?.isActive("strike")),
      bullet: Boolean(editor?.isActive("bulletList")),
      ordered: Boolean(editor?.isActive("orderedList")),
    }),
    [editor, editorVersion]
  );

  const activeAlignment = useMemo(() => {
    if (!editor) return "left";
    if (editor.isActive({ textAlign: "center" })) return "center";
    if (editor.isActive({ textAlign: "right" })) return "right";
    if (editor.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  }, [editor, editorVersion]);

  const activeTableCellAttrs = useMemo(() => {
    if (!editor) return null;
    if (editor.isActive("tableCell")) return editor.getAttributes("tableCell");
    if (editor.isActive("tableHeader")) return editor.getAttributes("tableHeader");
    return null;
  }, [editor, editorVersion]);

  const activeTableCellWidth = useMemo(() => {
    const colwidth = Array.isArray(activeTableCellAttrs?.colwidth) ? activeTableCellAttrs.colwidth : [];
    const rawWidth = Number(activeTableCellAttrs?.cellWidth ?? colwidth[0]);
    return normalizeTableDimension(rawWidth, TABLE_CELL_WIDTH_MIN, TABLE_CELL_WIDTH_MAX, 160);
  }, [activeTableCellAttrs]);

  const activeTableCellHeight = useMemo(() => {
    const rawHeight = Number(activeTableCellAttrs?.cellHeight);
    return normalizeTableDimension(rawHeight, TABLE_CELL_HEIGHT_MIN, TABLE_CELL_HEIGHT_MAX, 44);
  }, [activeTableCellAttrs]);

  const activeTableCellColor = useMemo(
    () => String(activeTableCellAttrs?.backgroundColor || "").trim(),
    [activeTableCellAttrs]
  );

  const insertTable = useCallback(
    (rows, cols) => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).createParagraphNear().run();
      setTablePickerOpen(false);
      setTablePickerHover({ rows: 1, cols: 1 });
    },
    [editor]
  );

  const applyTableCellAttribute = useCallback(
    (attributeName, value) => {
      if (!editor || !isTableContext) return;
      editor.chain().focus().setCellAttribute(attributeName, value).run();
    },
    [editor, isTableContext]
  );

  const applyTableWidth = useCallback(
    (value) => {
      if (!editor || !isTableContext) return;

      const nextWidth = normalizeTableDimension(
        value,
        TABLE_CELL_WIDTH_MIN,
        TABLE_CELL_WIDTH_MAX,
        TABLE_CELL_WIDTH_MIN
      );
      const colspan = Math.max(1, Number(activeTableCellAttrs?.colspan) || 1);
      const nextColwidth = Array.from({ length: colspan }, () => nextWidth);

      editor
        .chain()
        .focus()
        .setCellAttribute("colwidth", nextColwidth)
        .setCellAttribute("cellWidth", nextWidth)
        .run();
    },
    [activeTableCellAttrs?.colspan, editor, isTableContext]
  );

  const applyTableHeight = useCallback(
    (value) => {
      if (!editor || !isTableContext) return;

      const nextHeight = normalizeTableDimension(
        value,
        TABLE_CELL_HEIGHT_MIN,
        TABLE_CELL_HEIGHT_MAX,
        TABLE_CELL_HEIGHT_MIN
      );

      applyTableCellAttribute("cellHeight", nextHeight);
    },
    [applyTableCellAttribute, editor, isTableContext]
  );

  const applyTableColor = useCallback(
    (color) => {
      if (!editor || !isTableContext) return;

      const nextColor = String(color || "").trim();
      applyTableCellAttribute("backgroundColor", nextColor || null);
    },
    [applyTableCellAttribute, editor, isTableContext]
  );

  const applyBlockFormat = useCallback(
    (nextValue) => {
      if (!editor) return;

      const chain = editor.chain().focus();

      if (nextValue === "p") {
        chain.setParagraph().run();
        return;
      }

      if (nextValue === "h1") {
        chain.toggleHeading({ level: 1 }).run();
        return;
      }

      if (nextValue === "h2") {
        chain.toggleHeading({ level: 2 }).run();
        return;
      }

      if (nextValue === "h3") {
        chain.toggleHeading({ level: 3 }).run();
        return;
      }

      if (nextValue === "blockquote") {
        chain.toggleBlockquote().run();
        return;
      }

      if (nextValue === "pre") {
        chain.toggleCodeBlock().run();
      }
    },
    [editor]
  );

  const applyAlignment = useCallback(
    (alignment) => {
      if (!editor) return;
      editor.chain().focus().setTextAlign(alignment).run();
    },
    [editor]
  );

  const applyTableAction = useCallback(
    (action) => {
      if (!editor) return;

      const chain = editor.chain().focus();

      if (action === "add-row") {
        chain.addRowAfter().run();
      } else if (action === "delete-row") {
        chain.deleteRow().run();
      } else if (action === "add-column") {
        chain.addColumnAfter().run();
      } else if (action === "delete-column") {
        chain.deleteColumn().run();
      } else if (action === "delete-table") {
        chain.deleteTable().run();
      }
    },
    [editor]
  );

  const applyLink = useCallback(() => {
    if (!editor) return;

    const currentLink = editor.getAttributes("link")?.href || "";
    const nextUrl = window.prompt("Enter a link URL", currentLink);

    if (nextUrl === null) {
      return;
    }

    const formattedUrl = formatUrl(nextUrl);
    const chain = editor.chain().focus().extendMarkRange("link");

    if (!formattedUrl) {
      chain.unsetLink().run();
      return;
    }

    chain.setLink({ href: formattedUrl }).run();
  }, [editor]);

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }, [editor]);

  const toolbarButtons = useMemo(
    () => [
      {
        key: "undo",
        label: "Undo",
        icon: FaUndo,
        onClick: () => editor?.chain().focus().undo().run(),
      },
      {
        key: "redo",
        label: "Redo",
        icon: FaRedo,
        onClick: () => editor?.chain().focus().redo().run(),
      },
      {
        key: "italic",
        label: "Italic",
        icon: FaItalic,
        active: activeMarks.italic,
        onClick: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        key: "bold",
        label: "Bold",
        icon: FaBold,
        active: activeMarks.bold,
        onClick: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        key: "underline",
        label: "Underline",
        icon: FaUnderline,
        active: activeMarks.underline,
        onClick: () => editor?.chain().focus().toggleUnderline().run(),
      },
      {
        key: "strike",
        label: "Strikethrough",
        icon: FaStrikethrough,
        active: activeMarks.strike,
        onClick: () => editor?.chain().focus().toggleStrike().run(),
      },
      {
        key: "link",
        label: "Link",
        icon: FaLink,
        onClick: applyLink,
      },
      {
        key: "clear",
        label: "Clear formatting",
        icon: FaEraser,
        onClick: clearFormatting,
      },
      {
        key: "quote",
        label: "Quote",
        icon: FaQuoteRight,
        active: activeBlock === "blockquote",
        onClick: () => applyBlockFormat("blockquote"),
      },
      {
        key: "code",
        label: "Code block",
        icon: FaCode,
        active: activeBlock === "pre",
        onClick: () => applyBlockFormat("pre"),
      },
      {
        key: "align-left",
        label: "Align left",
        icon: FaAlignLeft,
        active: activeAlignment === "left",
        onClick: () => applyAlignment("left"),
      },
      {
        key: "align-center",
        label: "Align center",
        icon: FaAlignCenter,
        active: activeAlignment === "center",
        onClick: () => applyAlignment("center"),
      },
      {
        key: "align-right",
        label: "Align right",
        icon: FaAlignRight,
        active: activeAlignment === "right",
        onClick: () => applyAlignment("right"),
      },
      {
        key: "align-justify",
        label: "Justify",
        icon: FaAlignJustify,
        active: activeAlignment === "justify",
        onClick: () => applyAlignment("justify"),
      },
      {
        key: "bullet",
        label: "Bullets",
        icon: FaListUl,
        active: activeMarks.bullet,
        onClick: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        key: "number",
        label: "Numbers",
        icon: FaListOl,
        active: activeMarks.ordered,
        onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      },
    ],
    [activeAlignment, activeBlock, activeMarks, applyAlignment, applyBlockFormat, applyLink, clearFormatting, editor]
  );

  const tableActionButtons = useMemo(
    () => [
      {
        key: "add-row",
        label: "Add row",
        icon: FaPlus,
        onClick: () => applyTableAction("add-row"),
      },
      {
        key: "delete-row",
        label: "Delete row",
        icon: FaMinus,
        onClick: () => applyTableAction("delete-row"),
      },
      {
        key: "add-column",
        label: "Add column",
        icon: FaPlus,
        onClick: () => applyTableAction("add-column"),
      },
      {
        key: "delete-column",
        label: "Delete column",
        icon: FaMinus,
        onClick: () => applyTableAction("delete-column"),
      },
      {
        key: "delete-table",
        label: "Delete table",
        icon: FaTrash,
        className: "article-editor__button--danger",
        onClick: () => applyTableAction("delete-table"),
      },
    ],
    [applyTableAction]
  );

  const isTableCellContext = Boolean(isTableContext && activeTableCellAttrs);

  return (
    <div className="article-editor">
      <div className="article-editor__toolbar" role="toolbar" aria-label="Article formatting tools">
        <div className="article-editor__toolbar-row article-editor__toolbar-row--top">
          <label className="article-editor__field article-editor__field--wide">
            Block style
            <select
              value={activeBlock}
              onChange={(event) => applyBlockFormat(event.target.value)}
              disabled={isTableContext}
            >
              {isTableContext && (
                <option value="" disabled>
                  Table editing
                </option>
              )}
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
              <option value="pre">Code block</option>
            </select>
          </label>

          <div className="article-editor__group">
            {toolbarButtons
              .filter((button) =>
                ["undo", "redo", "italic", "bold", "underline", "strike", "link", "clear"].includes(
                  button.key
                )
              )
              .map((button) => (
                <ToolbarButton key={button.key} {...button} />
              ))}
          </div>
        </div>

        <div className="article-editor__toolbar-row article-editor__toolbar-row--bottom">
          <div className="article-editor__group">
            {toolbarButtons
              .filter((button) =>
                ["quote", "code", "align-left", "align-center", "align-right", "align-justify", "bullet", "number"].includes(
                  button.key
                )
              )
              .map((button) => (
                <ToolbarButton key={button.key} {...button} />
              ))}
          </div>

          <div className="article-editor__group article-editor__group--table">
            <div className="article-editor__table-picker" ref={tablePickerRef}>
              <button
                type="button"
                className={`article-editor__button article-editor__button--table${tablePickerOpen ? " is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setTablePickerOpen((current) => !current);
                  setTablePickerHover({ rows: 1, cols: 1 });
                }}
                aria-label="Insert table"
                aria-expanded={tablePickerOpen}
                aria-haspopup="grid"
                title="Insert table"
              >
                <FaTable aria-hidden="true" />
                <FaChevronDown aria-hidden="true" className="article-editor__button-caret" />
              </button>

              {tablePickerOpen && (
                <div className="article-editor__table-picker-popover" role="dialog" aria-label="Table size picker">
                  <div className="article-editor__table-picker-header">
                    <strong>Insert table</strong>
                    <span>
                      {tablePickerHover.rows} x {tablePickerHover.cols}
                    </span>
                  </div>

                  <div
                    className="article-editor__table-picker-grid"
                    role="grid"
                    aria-label="Choose table size"
                    style={{
                      gridTemplateColumns: `repeat(${TABLE_PICKER_COLS}, 14px)`,
                    }}
                    onMouseLeave={() => setTablePickerHover({ rows: 1, cols: 1 })}
                  >
                    {Array.from({ length: TABLE_PICKER_ROWS }).map((_, rowIndex) =>
                      Array.from({ length: TABLE_PICKER_COLS }).map((__, colIndex) => {
                        const rows = rowIndex + 1;
                        const cols = colIndex + 1;
                        const isActive =
                          rows <= tablePickerHover.rows && cols <= tablePickerHover.cols;

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`article-editor__table-picker-cell${isActive ? " is-active" : ""}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setTablePickerHover({ rows, cols })}
                            onClick={() => insertTable(rows, cols)}
                            aria-label={`${rows} by ${cols} table`}
                            role="gridcell"
                          />
                        );
                      })
                    )}
                  </div>

                  <div className="article-editor__table-picker-footer">
                    <span>Click to insert</span>
                    <strong>
                      {tablePickerHover.rows} x {tablePickerHover.cols}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {tableActionButtons.map((button) => (
              <ToolbarButton key={button.key} {...button} />
            ))}
          </div>
        </div>

        <div className="article-editor__toolbar-row article-editor__toolbar-row--table">
          <div className="article-editor__table-controls">
            <label className="article-editor__slider">
              Cell width
              <input
                type="range"
                min={TABLE_CELL_WIDTH_MIN}
                max={TABLE_CELL_WIDTH_MAX}
                step={TABLE_CELL_WIDTH_STEP}
                value={activeTableCellWidth}
                onChange={(event) => applyTableWidth(event.target.value)}
                disabled={!isTableCellContext}
              />
              <span>{activeTableCellWidth}px</span>
            </label>

            <label className="article-editor__slider">
              Cell height
              <input
                type="range"
                min={TABLE_CELL_HEIGHT_MIN}
                max={TABLE_CELL_HEIGHT_MAX}
                step={TABLE_CELL_HEIGHT_STEP}
                value={activeTableCellHeight}
                onChange={(event) => applyTableHeight(event.target.value)}
                disabled={!isTableCellContext}
              />
              <span>{activeTableCellHeight}px</span>
            </label>
          </div>

          <div className="article-editor__color-panel" aria-label="Cell fill colors">
            <div className="article-editor__color-panel-label">Cell color</div>
            <div className="article-editor__swatch-row">
              {TABLE_CELL_COLOR_OPTIONS.map((color) => (
                <TableColorSwatch
                  key={color}
                  color={color}
                  active={activeTableCellColor === color}
                  onPick={applyTableColor}
                />
              ))}
              <button
                type="button"
                className="article-editor__color-clear"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyTableColor("")}
                disabled={!isTableCellContext}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
