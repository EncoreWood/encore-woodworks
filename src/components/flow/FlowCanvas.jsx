import { useRef, useState, useEffect, useCallback } from "react";
import FlowZone from "./FlowZone";
import CustomArrowLayer from "./CustomArrowLayer";
import DrawingToolbar from "./DrawingToolbar";
import ZoomToolbar from "./ZoomToolbar";
import { SHOP_BASE, SHOP_WIDTH_BASE, CANVAS_INCHES, CANVAS_WIDTH_INCHES } from "./flowConstants";
import { Loader2 } from "lucide-react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export default function FlowCanvas({
  zones, selectedZoneId, onSelectZone, onDragMove, onDragEnd,
  arrows, selectedArrowId, onSelectArrow, onArrowCreate, onArrowUpdate,
  selectedFlow, flowSequenceIds,
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
  const autoFitted = useRef(false);

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

  // Auto-fit on first load
  useEffect(() => {
    if (!autoFitted.current && containerSize.w > 0 && containerSize.h > 0) {
      autoFitted.current = true;
      const scaleX = (containerSize.w - 80) / SHOP_WIDTH_BASE;
      const scaleY = (containerSize.h - 200) / SHOP_BASE;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY))));
    }
  }, [containerSize]);

  const shopW = SHOP_WIDTH_BASE * zoom;
  const shopH = SHOP_BASE * zoom;

  const fitToScreen = useCallback(() => {
    if (containerSize.w > 0 && containerSize.h > 0) {
      const scaleX = (containerSize.w - 80) / SHOP_WIDTH_BASE;
      const scaleY = (containerSize.h - 200) / SHOP_BASE;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY))));
    }
    setPan({ x: 0, y: 0 });
  }, [containerSize]);

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
    const zone = zones.find((z) =>
      pt.x >= z.x && pt.x <= z.x + z.width && pt.y >= z.y && pt.y <= z.y + z.height
    );
    if (zone) return { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
    return pt;
  };

  const maxPoints = (mode) => (mode === "curve" ? 3 : mode === "arrow" || mode === "line" ? 2 : 1);

  const handleDrawClick = (pt) => {
    if (!pt) return;
    if (drawMode === "label") {
      const text = window.prompt("Label text:");
      if (text) onArrowCreate({ arrow_type: "label", start_x: pt.x, start_y: pt.y, color: "#475569", stroke_width: 2, label: text });
      setDrawMode("select");
      return;
    }
    const snapped = getZoneCenterAt(pt);
    if (!snapped) return;
    const newPoints = [...drawPoints, snapped];
    if (newPoints.length >= maxPoints(drawMode)) {
      const s = newPoints[0];
      const e = newPoints[newPoints.length - 1];
      if (drawMode === "curve" && newPoints.length >= 3) {
        const mid = newPoints[1];
        onArrowCreate({ arrow_type: "curve", start_x: s.x, start_y: s.y, control_x: mid.x, control_y: mid.y, end_x: e.x, end_y: e.y, color: "#64748b", stroke_width: 2, arrowhead_style: "filled" });
      } else if (s && e) {
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
      handleDrawClick(clientToPercent(e.clientX, e.clientY));
    }
  };

  const handlePointerMove = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchState.current && pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const ratio = getDist(pts[0], pts[1]) / pinchState.current.dist;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(pinchState.current.startZoom * ratio).toFixed(2))));
      return;
    }
    if (panState.current) {
      setPan({ x: panState.current.origX + (e.clientX - panState.current.startX), y: panState.current.origY + (e.clientY - panState.current.startY) });
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
        <div className="flex items-center justify-center flex-1"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
      ) : (
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-200 rounded-lg touch-none" style={{ minHeight: "300px" }}>
          {/* Shop Boundary — the floor plan rectangle */}
          <div
            ref={canvasRef}
            className="absolute rounded-md"
            style={{
              left: "50%", top: "50%",
              width: shopW, height: shopH,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
              backgroundColor: "#f9fafb",
              border: "3px solid #374151",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              cursor: drawMode === "select" ? (panState.current ? "grabbing" : "grab") : "crosshair",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Grid background */}
            <div className="absolute inset-0 pointer-events-none rounded-sm overflow-hidden" style={{
              backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
              backgroundSize: `${(12 / SHOP_BASE) * shopH}px ${(12 / SHOP_BASE) * shopH}px`,
            }} />

            {/* Center dividing wall between the two bays */}
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{
              left: "50%",
              width: 0,
              borderLeft: "2px dashed #94a3b8",
              opacity: 0.5,
            }} />

            {/* Custom Arrows / Lines / Labels */}
            <CustomArrowLayer arrows={arrows} canvasW={shopW} canvasH={shopH} selectedArrowId={selectedArrowId} onSelect={onSelectArrow} onUpdate={onArrowUpdate} selectedFlow={selectedFlow} />

            {/* Drawing preview */}
            {drawPoints.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" width={shopW} height={shopH} style={{ zIndex: 7 }}>
                {drawPoints.map((p, i) => (
                  <circle key={i} cx={(p.x / 100) * shopW} cy={(p.y / 100) * shopH} r={5} fill="#f59e0b" />
                ))}
                {hoverPt && drawPoints.length === 1 && (drawMode === "arrow" || drawMode === "line") && (
                  <line x1={(drawPoints[0].x / 100) * shopW} y1={(drawPoints[0].y / 100) * shopH} x2={(hoverPt.x / 100) * shopW} y2={(hoverPt.y / 100) * shopH} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity="0.6" />
                )}
              </svg>
            )}

            {/* Zones */}
            <div className={drawMode !== "select" ? "pointer-events-none" : ""}>
              {zones.map((zone) => (
                <FlowZone key={zone.id} zone={zone} shopW={shopW} shopH={shopH} isSelected={selectedZoneId === zone.id} dimmed={selectedFlow && !flowSequenceIds.includes(zone.id)} onSelect={onSelectZone} onDragMove={onDragMove} onDragEnd={onDragEnd} />
              ))}
            </div>

            {/* Dimension label */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 pointer-events-none whitespace-nowrap">
              {CANVAS_WIDTH_INCHES}" × {CANVAS_INCHES}" (99' × 49.5')
            </div>
          </div>

          {/* Floating toolbars */}
          <DrawingToolbar mode={drawMode} onModeChange={(m) => { setDrawMode(m); setDrawPoints([]); setHoverPt(null); }} />
          <ZoomToolbar zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitToScreen} />
        </div>
      )}
    </div>
  );
}

function getDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }