import { useCallback, useEffect, useRef, useState } from "react";
import { FaExchangeAlt as FaRotate, FaSyncAlt } from "react-icons/fa";

const MIN_VIEWPORT_WIDTH = 280;
const MAX_VIEWPORT_WIDTH = 1920;

// null width = "fit" (the normal editable desktop canvas).
const DEVICE_PRESETS = [
  { id: "desktop", label: "Desktop (fit to screen)", width: null, height: null },
  { id: "laptop", label: "Laptop - 1280", width: 1280, height: 800 },
  { id: "ipad-pro", label: "iPad Pro - 1024", width: 1024, height: 1366 },
  { id: "ipad-air", label: "iPad Air - 820", width: 820, height: 1180 },
  { id: "ipad", label: "iPad Mini - 768", width: 768, height: 1024 },
  { id: "pixel-7", label: "Pixel 7 - 412", width: 412, height: 915 },
  { id: "iphone-14", label: "iPhone 14 - 390", width: 390, height: 844 },
  { id: "iphone-se", label: "iPhone SE - 375", width: 375, height: 667 },
  { id: "galaxy-s20", label: "Galaxy S20 - 360", width: 360, height: 800 },
];

const clampWidth = (value) =>
  Math.min(MAX_VIEWPORT_WIDTH, Math.max(MIN_VIEWPORT_WIDTH, Math.round(value) || MIN_VIEWPORT_WIDTH));

// Toolbar controls: pick a device or type an exact size, rotate, reload.
export function DeviceControls({ viewport, onChange, onReload }) {
  const deviceId = viewport?.deviceId || "desktop";

  const selectDevice = (event) => {
    const preset = DEVICE_PRESETS.find((entry) => entry.id === event.target.value);
    if (!preset || preset.width === null) {
      onChange(null);
      return;
    }
    onChange({ deviceId: preset.id, width: preset.width, height: preset.height });
  };

  const setWidth = (value) =>
    onChange({
      deviceId: "custom",
      width: clampWidth(value),
      height: viewport?.height || 800,
    });

  const setHeight = (value) =>
    onChange({
      deviceId: "custom",
      width: viewport.width,
      height: Math.max(320, Math.round(value) || 320),
    });

  return (
    <div className="layout-editor-devices" role="group" aria-label="Responsive testing">
      <select
        className="layout-editor-devices__select"
        value={deviceId}
        onChange={selectDevice}
        aria-label="Device"
      >
        {DEVICE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
        {deviceId === "custom" && <option value="custom">Custom size</option>}
      </select>

      {viewport && (
        <>
          <input
            className="layout-editor-devices__size"
            type="number"
            min={MIN_VIEWPORT_WIDTH}
            max={MAX_VIEWPORT_WIDTH}
            value={viewport.width}
            onChange={(event) => setWidth(event.target.value)}
            aria-label="Viewport width in pixels"
          />
          <span aria-hidden="true">×</span>
          <input
            className="layout-editor-devices__size"
            type="number"
            min={320}
            value={viewport.height}
            onChange={(event) => setHeight(event.target.value)}
            aria-label="Viewport height in pixels"
          />
          <button
            type="button"
            className="layout-editor-toolbar__button layout-editor-devices__icon"
            onClick={() =>
              onChange({
                deviceId: "custom",
                width: clampWidth(viewport.height),
                height: viewport.width,
              })
            }
            title="Rotate (swap width and height)"
            aria-label="Rotate device"
          >
            <FaRotate />
          </button>
          <button
            type="button"
            className="layout-editor-toolbar__button layout-editor-devices__icon"
            onClick={onReload}
            title="Reload preview"
            aria-label="Reload preview"
          >
            <FaSyncAlt />
          </button>
        </>
      )}
    </div>
  );
}

// The page rendered in an iframe of the real site, so CSS media queries react
// to the chosen width exactly as they would on a visitor's device. Drag the
// handles on either side to narrow or widen it.
export function ResponsiveStage({
  src,
  viewport,
  onResize,
  reloadKey,
  iframeRef,
  onLoad,
}) {
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Leave room for the width label above and, on phones, the device bezel.
  const deviceKind = viewport.width <= 480 ? "phone" : viewport.width <= 1100 ? "tablet" : "desktop";
  const inset = deviceKind === "phone" ? 30 : deviceKind === "tablet" ? 26 : 16;
  const availableWidth = Math.max(0, stageSize.width - inset * 2 - 12);
  const availableHeight = Math.max(0, stageSize.height - inset * 2 - 22);
  // The whole device is scaled to fit the available area (width and height),
  // like a real device shown at reduced size.
  const scale =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(1, availableWidth / viewport.width, availableHeight / viewport.height)
      : 1;
  const boxWidth = viewport.width * scale;
  const boxHeight = viewport.height * scale;

  const startDrag = useCallback(
    (side) => (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = viewport.width;
      setDragging(true);

      const move = (moveEvent) => {
        // The box is centered, so each edge moves half of the width change.
        const delta = ((moveEvent.clientX - startX) / scale) * (side === "right" ? 2 : -2);
        onResize(clampWidth(startWidth + delta));
      };
      const stop = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [viewport.width, scale, onResize]
  );

  return (
    <div className="layout-editor-stage" ref={stageRef}>
      <div
        className={`layout-editor-stage__box${deviceKind === "desktop" ? "" : ` is-${deviceKind}`}`}
        style={{ width: boxWidth, height: boxHeight }}
      >
        <span className="layout-editor-stage__label">
          {viewport.width} px{scale < 1 ? ` (shown at ${Math.round(scale * 100)}%)` : ""}
        </span>
        <iframe
          key={reloadKey}
          ref={iframeRef}
          className="layout-editor-stage__frame"
          title="Responsive preview"
          src={src}
          onLoad={onLoad}
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
          }}
        />
        {/* Keeps the iframe from swallowing pointer events mid-drag. */}
        {dragging && <div className="layout-editor-stage__shield" />}
        {["left", "right"].map((side) => (
          <div
            key={side}
            className={`layout-editor-stage__handle layout-editor-stage__handle--${side}`}
            onPointerDown={startDrag(side)}
            role="separator"
            aria-orientation="vertical"
            aria-label={`Drag to resize (${side} edge)`}
            title="Drag to resize"
          >
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
