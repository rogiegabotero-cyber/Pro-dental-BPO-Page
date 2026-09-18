import { useRef, useState } from "react";
import { FaArrowsAlt, FaGripVertical, FaMousePointer, FaPen } from "react-icons/fa";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { usePixelNudgeDrag } from "../utils/usePixelNudgeDrag";

export default function SectionFrame({ sectionKey, children, reorderable = true }) {
  const ctx = useLayoutEditorContext();
  const [hovered, setHovered] = useState(false);
  const [armed, setArmed] = useState(false);
  const frameRef = useRef(null);
  const { onPointerDown: onMoveHandlePointerDown } = usePixelNudgeDrag({
    targetRef: frameRef,
    getBase: () => ctx?.pendingStyles?.[sectionKey] || {},
    onCommit: (patch) => ctx?.updateStyle(sectionKey, patch),
    getScale: () => ctx?.canvasScale,
  });

  if (!ctx?.editMode) {
    return (
      <div className="section-frame" data-section={sectionKey}>
        {children}
      </div>
    );
  }

  const isSelected = ctx.selectedSection === sectionKey;
  const isDragOver = Boolean(ctx.dragKey) && ctx.dragKey !== sectionKey && hovered;

  const className = [
    "section-frame",
    "section-frame--editable",
    isSelected && "section-frame--selected",
    isDragOver && "section-frame--drag-over",
  ]
    .filter(Boolean)
    .join(" ");

  const disarm = () => setArmed(false);

  return (
    <div
      ref={frameRef}
      className={className}
      data-section={sectionKey}
      draggable={reorderable && armed}
      onClick={() => ctx.selectSection(sectionKey)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragStart={(event) => {
        if (!reorderable) return;
        event.dataTransfer.setData("text/plain", sectionKey);
        event.dataTransfer.effectAllowed = "move";
        ctx.handleDragStart(sectionKey);
      }}
      onDragOver={(event) => {
        if (!reorderable) return;
        event.preventDefault();
        ctx.handleDragOver(sectionKey, event);
      }}
      onDrop={(event) => {
        if (!reorderable) return;
        event.preventDefault();
        ctx.handleDrop(sectionKey);
      }}
      onDragEnd={() => {
        disarm();
        ctx.handleDragEnd();
      }}
    >
      <div className="section-frame__chrome">
        {reorderable ? (
          <button
            type="button"
            className="section-frame__handle"
            aria-label={`Drag to reorder the ${sectionKey} section`}
            onMouseDown={() => setArmed(true)}
            onMouseUp={disarm}
          >
            <FaGripVertical />
          </button>
        ) : (
          // Nearly all of a compact bar like the navbar is claimed by its own
          // editable text/image fields, leaving little empty space to click
          // through to the section itself — so give it one guaranteed,
          // unambiguous "select the whole section" target instead of the
          // (non-applicable) drag handle.
          <button
            type="button"
            className="section-frame__handle section-frame__handle--static"
            aria-label={`Select the ${sectionKey} section`}
            title={`Select the ${sectionKey} section`}
            onClick={(event) => {
              event.stopPropagation();
              ctx.selectSection(sectionKey);
            }}
          >
            <FaMousePointer />
          </button>
        )}
        <button
          type="button"
          className="cms-move-handle"
          data-cms-interactive="true"
          aria-label={`Move the ${sectionKey} section`}
          title="Drag to move (or select the section and use arrow keys)"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            onMoveHandlePointerDown(event);
          }}
        >
          <FaArrowsAlt />
        </button>
        {reorderable && (
          <button
            type="button"
            className="section-frame__edit-link"
            aria-label={`Edit ${sectionKey} content`}
            onClick={(event) => {
              event.stopPropagation();
              ctx.jumpToEdit(sectionKey);
            }}
          >
            <FaPen />
          </button>
        )}
      </div>

      <div className="section-frame__content">{children}</div>
    </div>
  );
}
