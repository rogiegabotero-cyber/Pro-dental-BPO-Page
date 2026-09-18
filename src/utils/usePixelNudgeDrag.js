import { useCallback, useRef } from "react";

// Continuous pointer-drag "move by pixel", distinct from the list-reorder drag
// mechanism used elsewhere. Live-previews via a CSS transform on targetRef
// (no re-render / history entry per pixel moved) and commits margin once on
// release, matching the "commit on drop" convention used by the other drag
// mechanisms in this editor.
//
// getScale reports the canvas's current zoom (the page is rendered at a fixed
// width and scaled down to fit — see VisualPageEditor). Pointer deltas are in
// real screen pixels, but targetRef sits inside that scaled frame, so any
// translation applied to it gets shrunk again by the same factor when it
// renders. Dividing by scale up front cancels that out, keeping the dragged
// element glued to the cursor at any zoom level.
export function usePixelNudgeDrag({ targetRef, getBase, onCommit, getScale }) {
  const dragRef = useRef(null);

  const onPointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const base = getBase();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        baseTop: parseInt(base.marginTop, 10) || 0,
        baseLeft: parseInt(base.marginLeft, 10) || 0,
      };

      const handleMove = (moveEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const scale = (getScale ? getScale() : 1) || 1;
        const dx = (moveEvent.clientX - drag.startX) / scale;
        const dy = (moveEvent.clientY - drag.startY) / scale;
        if (targetRef.current) {
          targetRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      };

      const handleUp = (upEvent) => {
        const drag = dragRef.current;
        dragRef.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        if (targetRef.current) {
          targetRef.current.style.transform = "";
        }
        if (!drag) return;
        const scale = (getScale ? getScale() : 1) || 1;
        const dx = Math.round((upEvent.clientX - drag.startX) / scale);
        const dy = Math.round((upEvent.clientY - drag.startY) / scale);
        if (dx === 0 && dy === 0) return;
        onCommit({
          marginTop: String(drag.baseTop + dy),
          marginLeft: String(drag.baseLeft + dx),
        });
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [targetRef, getBase, onCommit, getScale]
  );

  return { onPointerDown };
}
