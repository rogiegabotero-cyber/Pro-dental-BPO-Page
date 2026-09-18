import { useRef, useState } from "react";
import { FaArrowsAlt, FaGripVertical } from "react-icons/fa";
import { useLayoutEditorContext } from "../context/LayoutEditorContext";
import { usePixelNudgeDrag } from "../utils/usePixelNudgeDrag";

export default function ReorderableSlot({ docId, sectionKey, slotKey, order, children, ariaLabel }) {
  const ctx = useLayoutEditorContext();
  const [armed, setArmed] = useState(false);
  const slotRef = useRef(null);
  const fieldRef = { kind: "content", docId, fieldName: slotKey };
  const { onPointerDown: onMoveHandlePointerDown } = usePixelNudgeDrag({
    targetRef: slotRef,
    getBase: () => ctx?.resolveFieldStyle(fieldRef) || {},
    onCommit: (patch) => ctx?.updateFieldStyle(fieldRef, patch),
    getScale: () => ctx?.canvasScale,
  });

  if (!ctx?.editMode) {
    return <div className="cms-slot">{children}</div>;
  }

  const isDragOver =
    Boolean(ctx.elementDragKey) &&
    ctx.elementDragKey.docId === docId &&
    ctx.elementDragKey.slotKey !== slotKey;

  const disarm = () => setArmed(false);

  return (
    <div
      ref={slotRef}
      className={`cms-slot cms-slot--editable${isDragOver ? " cms-slot--drag-over" : ""}`}
      data-cms-interactive="true"
      draggable={armed}
      onClick={(event) => {
        event.stopPropagation();
        ctx.selectField(sectionKey || docId, fieldRef);
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", slotKey);
        event.dataTransfer.effectAllowed = "move";
        ctx.handleElementDragStart(docId, slotKey);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        ctx.handleElementDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        ctx.handleElementDrop(docId, slotKey, order);
      }}
      onDragEnd={() => {
        disarm();
        ctx.handleElementDragEnd();
      }}
    >
      <button
        type="button"
        className="cms-slot-handle"
        data-cms-interactive="true"
        aria-label={ariaLabel || "Drag to reorder"}
        onMouseDown={() => setArmed(true)}
        onMouseUp={disarm}
      >
        <FaGripVertical />
      </button>
      <button
        type="button"
        className="cms-move-handle"
        data-cms-interactive="true"
        aria-label={`Move this block (or select it and use arrow keys)`}
        title="Drag to move (or select and use arrow keys)"
        onPointerDown={onMoveHandlePointerDown}
      >
        <FaArrowsAlt />
      </button>
      {children}
    </div>
  );
}
