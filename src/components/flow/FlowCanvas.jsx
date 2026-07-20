import { useRef, useState, useEffect, useCallback } from "react";
import FlowZone from "./FlowZone";
import CustomArrowLayer from "./CustomArrowLayer";
import DrawingToolbar from "./DrawingToolbar";
import ZoomToolbar from "./ZoomToolbar";
import { CANVAS_INCHES } from "./flowConstants";
import { Loader2 } from "lucide-react";

const PADDING = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export default function FlowCanvas({
  zones, selectedZoneId, onSelectZone, onDragMove, onDragEnd,
  arrows, selectedArrowId, onSelectArrow, onArrowCreate, onArrowUpdate,
  selectedFlow,
  isLoading,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drawMode, setDrawMode] = useState("select");
  const [drawPoints, setDrawPoints] = useState([]);
  const [hoverPt, setHoverPt] = useState(null);

  const panState = useRef(null);
  const pointers = useRef(new Map());
  const pinchState = useRef(null);

  // Measure container
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const baseScale = Math.min(
    (containerSize.w - PADDING * 2) / CANVAS_INCHES,
    (containerSize.h - PADDING * 2) / CANVAS_INCHES
  );
  const scale = baseScale * zoom;
  const canvasPx = CANVAS_INCHES * scale;

  const fitToScreen = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2))), []);

  // Non-passive wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(z + delta).toFixed(2))));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const clientToPercent = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const getZoneCenterAt = (pt) => {
    const zone = zones.find((z) => {
      const zx = (z.x / CANVAS_INCHES) * 100;
      const zy = (z.y / CANVAS_INCHES) * 100;
      const zw = (z.width / CANVAS_INCHES) * 100;
      const zh = (z.height / CANVAS_INCHES) * 100;
      return pt.x >= zx && pt.x <= zx + zw && pt.y >= zy && pt.y <= zy + zh;
    });
    if (zone) {
      return {
        x: ((zone.x + zone.width / 2) / CANVAS_INCHES) * 100,
        y: ((zone.y + zone.height / 2) / CANVAS_INCHES) * 100,
      };
    }
    return pt;
  };

  const maxPoints = (mode) => (mode === "curve" ? 3 : mode === "arrow" || mode === "line" ? 2 : 1);

  const handleDrawClick = (pt) => {
    if (drawMode === "label") {
      const text = window.prompt("Label text:");
      if (text) {
        onArrowCreate({ arrow_type: "label", start_x: pt.x, start_y: pt.y, color: "#475569", stroke_width: 2, label: text });
      }
      setDrawMode("select");
      return;
    }

    const snapped = getZoneCenterAt(pt);
    const newPoints = [...drawPoints, snapped];

    if (newPoints.length >= maxPoints(drawMode)) {
      const [s, mid, e] = newPoints;
      if (drawMode === "curve") {
        onArrowCreate({ arrow_type: "curve", start_x: s.x, start_y: s.y, control_x: mid.x, control_y: mid.y, end_x: e.x, end_y: e.y, color: "#64748b", stroke_width: 2, arrowhead_style: "filled" });
      } else {
        onArrowCreate({ arrow_type: drawMode, start_x: s.x, start_y: s.y, end_x: e.x, end_y: e.y, color: "#64748b", stroke_width: 2, arrowhead_style: drawMode === "arrow" ? "filled" : "none" });
      }
      setDrawPoints([]);
      setHoverPt(null);
    } else {
      setDrawPoints(newPoints);
    }
  };

  const handlePointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchState.current = { dist: getDist(pts[0], pts[1]), startZoom: zoom };
      panState.current = null;
      return;
    }

    if (drawMode === "select") {
      panState.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
      onSelectZone(null);
      onSelectArrow(null);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      const pt = clientToPercent(e.clientX, e.clientY);
      handleDrawClick(pt);
    }
  };

  const handlePointerMove = (e) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchState.current && pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const newDist = getDist(pts[0], pts[1]);
      const ratio = newDist / pinchState.current.dist;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(pinchState.current.startZoom * ratio).toFixed(2))));
      return;
    }

    if (panState.current) {
      setPan({
        x: panState.current.origX + (e.clientX - panState.current.startX),
        y: panState.current.origY + (e.clientY - panState.current.startY),
      });
    }

    if (drawMode !== "select" && drawPoints.length > 0 && drawPoints.length < maxPoints(drawMode)) {
      setHoverPt(clientToPercent(e.clientX, e.clientY));
    }
  };

  const handlePointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (panState.current) panState.current = null;
  };

  return (
    <div className="flex flex-col h-full">
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : (
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-200 rounded-lg touch-none" style={{ minHeight: "300px" }}>
          {/* Canvas (floor plan) */}
          <div
            ref={canvasRef}
            className="absolute bg-slate-50 border-[8px] border-slate-700 rounded-lg shadow-2xl"
            style={{
              left: "50%",
              top: "50%",
              width: canvasPx,
              height: canvasPx,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
              cursor: drawMode === "select" ? (panState.current ? "grabbing" : "grab") : "crosshair",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 pointer-events-none rounded-md" style={{
              backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)",
              backgroundSize: `${12 * scale}px ${12 * scale}px`,
            }} />

            {/* Custom Arrows / Lines / Labels */}
            <CustomArrowLayer
              arrows={arrows}
              canvasPx={canvasPx}
              selectedArrowId={selectedArrowId}
              onSelect={onSelectArrow}
              onUpdate={onArrowUpdate}
              selectedFlow={selectedFlow}
            />

            {/* Drawing preview */}
            {drawPoints.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" width={canvasPx} height={canvasPx} style={{ zIndex: 7 }}>
                {drawPoints.map((p, i) => (
                  <circle key={i} cx={(p.x / 100) * canvasPx} cy={(p.y / 100) * canvasPx} r={5} fill="#f59e0b" />
                ))}
                {hoverPt && drawPoints.length === 1 && (drawMode === "arrow" || drawMode === "line") && (
                  <line
                    x1={(drawPoints[0].x / 100) * canvasPx} y1={(drawPoints[0].y / 100) * canvasPx}
                    x2={(hoverPt.x / 100) * canvasPx} y2={(hoverPt.y / 100) * canvasPx}
                    stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity="0.6"
                  />
                )}
              </svg>
            )}

            {/* Zones */}
            <div className={drawMode !== "select" ? "pointer-events-none" : ""}>
              {zones.map((zone) => (
                <FlowZone
                  key={zone.id}
                  zone={zone}
                  scale={scale}
                  isSelected={selectedZoneId === zone.id}
                  dimmed={selectedFlow && !(zone.flow_tags || []).includes(selectedFlow)}
                  onSelect={onSelectZone}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </div>

          {/* Floating toolbars */}
          <DrawingToolbar mode={drawMode} onModeChange={(m) => { setDrawMode(m); setDrawPoints([]); setHoverPt(null); }} />
          <ZoomToolbar zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitToScreen} />
        </div>
      )}
      <p className="text-center text-xs text-slate-400 mt-1">
        594" × 594" (49.5' × 49.5') {drawMode !== "select" && `· Drawing: ${drawMode} (${drawPoints.length}/${maxPoints(drawMode)} pts)`}
      </p>
    </div>
  );
}

function getDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}