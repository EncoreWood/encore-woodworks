import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Eraser, Undo2, Trash2, Minus, Move, Edit3, ZoomIn, ZoomOut } from "lucide-react";

const BASE_PX_PER_FOOT = 40;
const GRID_SIZE = BASE_PX_PER_FOOT;
const CANVAS_W = 2000;
const CANVAS_H = 1200;
const SNAP_OBJECT_RADIUS = 16; // px – snap to existing object endpoints/edges

const COLORS = ["#1e1e1e", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];
const THICKNESS = { thin: 1.5, medium: 3, thick: 6 };

const CAB_HIGHLIGHTS = [
  { key: "base",  label: "Base",  color: "#3b82f6", fillColor: "rgba(59,130,246,0.22)" },
  { key: "upper", label: "Upper", color: "#22c55e", fillColor: "rgba(34,197,94,0.22)" },
  { key: "tall",  label: "Tall",  color: "#f59e0b", fillColor: "rgba(245,158,11,0.22)" },
  { key: "misc",  label: "Misc",  color: "#8b5cf6", fillColor: "rgba(139,92,246,0.22)" },
];

const SYMBOLS = [
  { key: "outlet",   label: "⚡ Outlet" },
  { key: "switch",   label: "🔲 Switch" },
  { key: "plumbing", label: "💧 Plumbing" },
];

// ── Snap helpers ──────────────────────────────────────────────────────────────
function snapToGrid(val) { return Math.round(val / GRID_SIZE) * GRID_SIZE; }

/** Collect all "snap candidate" points from existing paths */
function getSnapCandidates(paths) {
  const pts = [];
  paths.forEach(p => {
    if (p.type === "line" && p.points) {
      pts.push(p.points[0], p.points[1]);
    }
    if (p.type === "highlight") {
      const { x1, y1, x2, y2 } = p;
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      // corners + mid-edges
      pts.push(
        { x: rx, y: ry }, { x: rx + rw, y: ry },
        { x: rx, y: ry + rh }, { x: rx + rw, y: ry + rh },
        { x: rx + rw / 2, y: ry }, { x: rx + rw / 2, y: ry + rh },
        { x: rx, y: ry + rh / 2 }, { x: rx + rw, y: ry + rh / 2 },
      );
    }
  });
  return pts;
}

/** Smart snap: prefer snapping to existing objects, fall back to grid.
 *  forHighlight=true → only snap to objects; fall back to raw (no grid) if objects exist but none nearby */
function smartSnap(rawX, rawY, paths, isFirstPoint, forHighlight = false) {
  const candidates = getSnapCandidates(paths);
  if (candidates.length > 0) {
    let best = null, bestDist = SNAP_OBJECT_RADIUS;
    candidates.forEach(c => {
      const d = Math.hypot(c.x - rawX, c.y - rawY);
      if (d < bestDist) { bestDist = d; best = c; }
    });
    if (best) return { x: best.x, y: best.y, snapped: true };
    // There are objects but none close — highlights stay raw (free), lines fall back to grid
    if (forHighlight) return { x: rawX, y: rawY, snapped: false };
  }
  // No objects at all → snap to grid for everyone
  return { x: snapToGrid(rawX), y: snapToGrid(rawY), snapped: false };
}

// ── Angle snap ────────────────────────────────────────────────────────────────
const SNAP_ANGLES = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, -157.5, -135, -112.5, -90, -67.5, -45, -22.5];
const ANGLE_SNAP_THRESHOLD = 8; // degrees

function snapAngle(x1, y1, x2, y2) {
  const rawAngle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const len = Math.hypot(x2 - x1, y2 - y1);
  let best = null, bestDiff = ANGLE_SNAP_THRESHOLD;
  SNAP_ANGLES.forEach(a => {
    const diff = Math.abs(rawAngle - a);
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  });
  if (best === null) return { x: x2, y: y2, snappedAngle: null };
  const rad = best * Math.PI / 180;
  return { x: Math.round(x1 + Math.cos(rad) * len), y: Math.round(y1 + Math.sin(rad) * len), snappedAngle: best };
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function calcAngle(x1, y1, x2, y2) { return Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI); }
function calcLineFt(x1, y1, x2, y2) { return (Math.hypot(x2 - x1, y2 - y1) / BASE_PX_PER_FOOT).toFixed(2); }
function calcRectFt(x1, y1, x2, y2) {
  const wFt = (Math.abs(x2 - x1) / BASE_PX_PER_FOOT).toFixed(2);
  const hFt = (Math.abs(y2 - y1) / BASE_PX_PER_FOOT).toFixed(2);
  return { wFt, hFt, lf: (parseFloat(wFt) + parseFloat(hFt)).toFixed(2) };
}
/** Convert a decimal feet value to total inches e.g. 114" */
function ftToFtIn(decFt) {
  const totalIn = Math.round(parseFloat(decFt) * 12);
  return `${totalIn}"`;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawSymbol(ctx, key, x, y, size = 18) {
  ctx.save();
  if (key === "outlet") {
    ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 2; ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.rect(x - size, y - size, size * 2, size * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - size * 0.3, y, size * 0.25, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size * 0.3, y, size * 0.25, 0, Math.PI * 2); ctx.stroke();
  } else if (key === "switch") {
    ctx.strokeStyle = "#065f46"; ctx.lineWidth = 2; ctx.fillStyle = "#d1fae5";
    ctx.beginPath(); ctx.rect(x - size, y - size, size * 2, size * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#065f46"; ctx.font = `bold ${size * 0.9}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", x, y);
  } else if (key === "plumbing") {
    ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2.5; ctx.fillStyle = "#eff6ff";
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - size * 0.6); ctx.lineTo(x, y + size * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - size * 0.6, y); ctx.lineTo(x + size * 0.6, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, size * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(ctx, w, h, zoom) {
  const gs = GRID_SIZE;
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5 / zoom;
  for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1 / zoom;
  for (let x = 0; x <= w; x += gs * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += gs * 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = "#94a3b8"; ctx.font = `${11 / zoom}px sans-serif`; ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillText("1 sq = 1 ft", 6 / zoom, 4 / zoom);
}

function drawOnePath(ctx, path, isSelected, zoom) {
  const lw = 1 / zoom;
  if (path.type === "symbol") {
    drawSymbol(ctx, path.symbolKey, path.x, path.y, 18 / zoom);
    return;
  }
  if (path.type === "highlight") {
    const hl = CAB_HIGHLIGHTS.find(h => h.key === path.cabKey);
    if (!hl) return;
    const { x1, y1, x2, y2 } = path;
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
    ctx.save();
    ctx.fillStyle = hl.fillColor; ctx.strokeStyle = hl.color; ctx.lineWidth = 2 * lw;
    ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
    const { wFt, hFt } = calcRectFt(x1, y1, x2, y2);
    ctx.fillStyle = hl.color; ctx.font = `bold ${12 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (rw > 30 * lw && rh > 14 * lw) ctx.fillText(`${hl.label} ${ftToFtIn(wFt)} × ${ftToFtIn(hFt)}`, rx + rw / 2, ry + rh / 2);
    ctx.font = `${10 * lw}px sans-serif`; ctx.fillStyle = "#475569";
    ctx.textBaseline = "bottom"; ctx.textAlign = "center"; ctx.fillText(`${ftToFtIn(wFt)}  (${wFt} LF)`, rx + rw / 2, ry - 2 * lw);
    ctx.textBaseline = "middle"; ctx.textAlign = "right"; ctx.fillText(`${ftToFtIn(hFt)}  (${hFt} LF)`, rx - 4 * lw, ry + rh / 2);
    if (isSelected) {
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5 * lw; ctx.setLineDash([5 * lw, 3 * lw]);
      ctx.strokeRect(rx - 2 * lw, ry - 2 * lw, rw + 4 * lw, rh + 4 * lw); ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }
  if (path.type === "line" && path.points?.length === 2) {
    const [p1, p2] = path.points;
    ctx.strokeStyle = isSelected ? "#f59e0b" : path.color;
    ctx.lineWidth = (path.lineWidth || 2) * lw; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    const ft = calcLineFt(p1.x, p1.y, p2.x, p2.y);
    const angle = calcAngle(p1.x, p1.y, p2.x, p2.y);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));
    ctx.fillStyle = "#1e293b"; ctx.font = `bold ${11 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${ftToFtIn(ft)}  (${ft} LF)  ${angle}°`, 0, -4 * lw); ctx.restore();
    return;
  }
  if (path.type === "pen" && path.points?.length > 1) {
    ctx.strokeStyle = path.color; ctx.lineWidth = (path.lineWidth || 2) * lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    path.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
  }
}

// ── Wall alignment helpers ────────────────────────────────────────────────────
/** Find the closest wall (line) to a highlight box. Returns the wall or null. */
function findNearestWall(hl, paths) {
  const walls = paths.filter(p => p.type === "line" && p.points?.length === 2);
  if (!walls.length) return null;
  const hlCx = (hl.x1 + hl.x2) / 2, hlCy = (hl.y1 + hl.y2) / 2;
  let best = null, bestDist = Infinity;
  walls.forEach(w => {
    const mx = (w.points[0].x + w.points[1].x) / 2;
    const my = (w.points[0].y + w.points[1].y) / 2;
    const d = Math.hypot(mx - hlCx, my - hlCy);
    if (d < bestDist) { bestDist = d; best = w; }
  });
  return best;
}

/** Project a point onto a line segment, returning the closest point on the line. */
function projectPointOntoLine(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

/** Align highlight to nearest wall: position = "left" | "center" | "right"
 *  The highlight slides along the wall so its left edge, center, or right edge
 *  aligns with the projected center of the highlight onto the wall.
 *  The highlight is also pushed flush against the wall (perpendicular snapped). */
function alignHighlightToWall(hl, wall, position) {
  const [w1, w2] = wall.points;
  const wallAngle = Math.atan2(w2.y - w1.y, w2.x - w1.x);
  const wallLen = Math.hypot(w2.x - w1.x, w2.y - w1.y);

  const hlCx = (hl.x1 + hl.x2) / 2, hlCy = (hl.y1 + hl.y2) / 2;
  const hlW = Math.abs(hl.x2 - hl.x1), hlH = Math.abs(hl.y2 - hl.y1);

  // Project highlight center onto wall to get "along-wall" coordinate
  const proj = projectPointOntoLine(hlCx, hlCy, w1.x, w1.y, w2.x, w2.y);
  const tAlong = Math.hypot(proj.x - w1.x, proj.y - w1.y) / (wallLen || 1);

  // Perpendicular normal (pointing away from wall toward highlight)
  const nx = -Math.sin(wallAngle), ny = Math.cos(wallAngle);
  // Determine which side of wall the highlight is on
  const side = ((hlCx - w1.x) * nx + (hlCy - w1.y) * ny) >= 0 ? 1 : -1;

  // Half-sizes along and across wall
  const halfAlong = hlW / 2, halfAcross = hlH / 2;

  // Along-wall offset based on position
  let alongOffset = 0; // center
  if (position === "left")  alongOffset = halfAlong;
  if (position === "right") alongOffset = -halfAlong;

  // New center: flush against wall + centered/offset along wall
  const newCx = proj.x + nx * side * halfAcross + Math.cos(wallAngle) * alongOffset;
  const newCy = proj.y + ny * side * halfAcross + Math.sin(wallAngle) * alongOffset;

  return {
    ...hl,
    x1: Math.round(newCx - hlW / 2),
    y1: Math.round(newCy - hlH / 2),
    x2: Math.round(newCx + hlW / 2),
    y2: Math.round(newCy + hlH / 2),
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RoomSketch({ paths, onPathsChange, onHighlightsChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState("line");
  const [color, setColor] = useState("#1e1e1e");
  const [thickness, setThickness] = useState("medium");
  const [activeHighlight, setActiveHighlight] = useState("base");
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [editDim, setEditDim] = useState({ w: "", h: "", len: "", angle: "" });
  const [liveAngle, setLiveAngle] = useState(null);

  // Refs for event handlers (avoid stale closures)
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const activeHighlightRef = useRef(activeHighlight);
  const activeSymbolRef = useRef(activeSymbol);
  const selectedIdxRef = useRef(selectedIdx);
  const zoomRef = useRef(zoom);

  const isDrawing = useRef(false);
  const dragStart = useRef(null);       // for drawing line/highlight
  const moveState = useRef(null);       // { idx, offsetX, offsetY, origPath }
  const localPaths = useRef(paths || []);
  const previewRef = useRef(null);
  const snapIndicator = useRef(null);   // { x, y } canvas coords
  const rafId = useRef(null);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { activeHighlightRef.current = activeHighlight; }, [activeHighlight]);
  useEffect(() => { activeSymbolRef.current = activeSymbol; }, [activeSymbol]);
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { localPaths.current = paths || []; scheduleRedraw(); }, [paths]);

  // ── Redraw ────────────────────────────────────────────────────────────────
  const scheduleRedraw = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => { rafId.current = null; redrawCanvas(); });
  });

  const redrawCanvas = useCallback((preview) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Canvas always renders at native resolution; CSS zoom handles display scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, CANVAS_W, CANVAS_H, 1);

    localPaths.current.forEach((path, idx) => {
      drawOnePath(ctx, path, idx === selectedIdxRef.current, 1);
    });

    // Preview while drawing
    if (preview) {
      const { type, x1, y1, x2, y2 } = preview;
      ctx.save();
      if (type === "line") {
        ctx.strokeStyle = colorRef.current; ctx.lineWidth = THICKNESS[thicknessRef.current]; ctx.lineCap = "round";
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        const ft = calcLineFt(x1, y1, x2, y2), angle = calcAngle(x1, y1, x2, y2);
        ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
        ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(`${ftToFtIn(ft)}  (${ft} LF)  ${angle}°`, 0, -4);
      } else if (type === "highlight") {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        if (hl) {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.fillStyle = hl.fillColor; ctx.strokeStyle = hl.color; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
          ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); ctx.setLineDash([]);
          const { wFt, hFt } = calcRectFt(x1, y1, x2, y2);
          ctx.font = "bold 11px sans-serif"; ctx.fillStyle = hl.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`${ftToFtIn(wFt)} × ${ftToFtIn(hFt)}`, rx + rw / 2, ry + rh / 2);
        }
      }
      ctx.restore();
    }

    // Snap indicator dot
    if (snapIndicator.current) {
      const { x, y, snapped } = snapIndicator.current;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, snapped ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = snapped ? "#f59e0b" : "#94a3b8"; ctx.fill();
      ctx.restore();
    }
  }, []);

  // ── Pointer helpers ───────────────────────────────────────────────────────
  const getRawPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    // rect dimensions = canvas px * zoom (CSS scale), so divide by zoom to get canvas coords
    const z = zoomRef.current;
    return {
      x: (clientX - rect.left) / z,
      y: (clientY - rect.top) / z,
    };
  };

  const getSnappedPos = (e, isFirst, forHighlight = false) => {
    const raw = getRawPos(e);
    return smartSnap(raw.x, raw.y, localPaths.current, isFirst, forHighlight);
  };

  // ── Hit testing ───────────────────────────────────────────────────────────
  const findHitIdx = (pos) => {
    for (let i = localPaths.current.length - 1; i >= 0; i--) {
      const p = localPaths.current[i];
      if (p.type === "highlight") {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        const rw = Math.abs(p.x2 - p.x1), rh = Math.abs(p.y2 - p.y1);
        if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) return i;
      }
      if (p.type === "line") {
        const [p1, p2] = p.points;
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (len === 0) continue;
        const d = Math.abs((p2.y - p1.y) * pos.x - (p2.x - p1.x) * pos.y + p2.x * p1.y - p2.y * p1.x) / len;
        const inBounds = pos.x >= Math.min(p1.x, p2.x) - 10 && pos.x <= Math.max(p1.x, p2.x) + 10
          && pos.y >= Math.min(p1.y, p2.y) - 10 && pos.y <= Math.max(p1.y, p2.y) + 10;
        if (d < 10 && inBounds) return i;
      }
      if (p.type === "symbol") {
        if (Math.hypot(p.x - pos.x, p.y - pos.y) < 22) return i;
      }
    }
    return null;
  };

  // ── Erase ─────────────────────────────────────────────────────────────────
  const eraseAt = (pos) => {
    const t = 18;
    const updated = localPaths.current.filter(p => {
      if (p.type === "symbol") return Math.hypot(p.x - pos.x, p.y - pos.y) > 22;
      if (p.type === "highlight") {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        const rw = Math.abs(p.x2 - p.x1), rh = Math.abs(p.y2 - p.y1);
        return !(pos.x >= rx - t && pos.x <= rx + rw + t && pos.y >= ry - t && pos.y <= ry + rh + t);
      }
      return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t);
    });
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated); scheduleRedraw();
  };

  // ── Select + move state ───────────────────────────────────────────────────
  const selectItem = (idx) => {
    setSelectedIdx(idx);
    selectedIdxRef.current = idx;
    if (idx !== null) {
      const p = localPaths.current[idx];
      if (p?.type === "highlight") {
        const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
        // Store in inches for editing
        setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "" });
      } else if (p?.type === "line") {
        const lenFt = calcLineFt(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        const ang = calcAngle(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        setEditDim({ w: "", h: "", len: Math.round(parseFloat(lenFt) * 12), angle: ang });
      } else {
        setEditDim({ w: "", h: "", len: "", angle: "" });
      }
    }
    scheduleRedraw();
  };

  // ── Pointer events ────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    isDrawing.current = true;
    const raw = getRawPos(e);
    const pos = getSnappedPos(e, true, false);

    if (toolRef.current === "select") {
      const idx = findHitIdx(raw);
      if (idx !== null) {
        selectItem(idx);
        const p = localPaths.current[idx];
        // Set up move state
        if (p.type === "highlight") {
          moveState.current = { idx, origPath: { ...p }, startX: raw.x, startY: raw.y };
        } else if (p.type === "line") {
          moveState.current = { idx, origPath: { ...p, points: [...p.points] }, startX: raw.x, startY: raw.y };
        } else if (p.type === "symbol") {
          moveState.current = { idx, origPath: { ...p }, startX: raw.x, startY: raw.y };
        }
      } else {
        selectItem(null);
        moveState.current = null;
      }
      return;
    }

    if (toolRef.current === "eraser") { eraseAt(raw); return; }

    if (toolRef.current === "symbol") {
      const sym = activeSymbolRef.current;
      if (sym) {
        const updated = [...localPaths.current, { type: "symbol", symbolKey: sym, x: pos.x, y: pos.y }];
        localPaths.current = updated; onPathsChange(updated); scheduleRedraw();
      }
      isDrawing.current = false; return;
    }

    const isHL = toolRef.current === "highlight";
    dragStart.current = isHL ? getSnappedPos(e, true, true) : pos;
    snapIndicator.current = { ...dragStart.current, snapped: dragStart.current.snapped };
    scheduleRedraw();
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    const raw = getRawPos(e);

    // Moving selected item
    if (isDrawing.current && toolRef.current === "select" && moveState.current) {
      const { idx, origPath, startX, startY } = moveState.current;
      const dx = raw.x - startX, dy = raw.y - startY;
      const snappedDx = snapToGrid(origPath.x1 !== undefined ? origPath.x1 + dx : 0) - (origPath.x1 || 0);
      const snappedDy = snapToGrid(origPath.y1 !== undefined ? origPath.y1 + dy : 0) - (origPath.y1 || 0);

      let updated = [...localPaths.current];
      const p = origPath;
      if (p.type === "highlight") {
        const sdx = snapToGrid(p.x1 + dx) - p.x1, sdy = snapToGrid(p.y1 + dy) - p.y1;
        updated[idx] = { ...p, x1: p.x1 + sdx, y1: p.y1 + sdy, x2: p.x2 + sdx, y2: p.y2 + sdy };
      } else if (p.type === "line") {
        const sdx = snapToGrid(p.points[0].x + dx) - p.points[0].x;
        const sdy = snapToGrid(p.points[0].y + dy) - p.points[0].y;
        updated[idx] = { ...p, points: [{ x: p.points[0].x + sdx, y: p.points[0].y + sdy }, { x: p.points[1].x + sdx, y: p.points[1].y + sdy }] };
      } else if (p.type === "symbol") {
        updated[idx] = { ...p, x: snapToGrid(p.x + dx), y: snapToGrid(p.y + dy) };
      }
      localPaths.current = updated;
      redrawCanvas();
      return;
    }

    if (!isDrawing.current) return;
    if (toolRef.current === "eraser") { eraseAt(raw); return; }

    const isHL = toolRef.current === "highlight";
    const snapped = getSnappedPos(e, false, isHL);
    snapIndicator.current = { ...snapped, snapped: snapped.snapped };

    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      let ex = snapped.x, ey = snapped.y;
      let snappedAngle = null;
      if (toolRef.current === "line") {
        const as = snapAngle(dragStart.current.x, dragStart.current.y, snapped.x, snapped.y);
        ex = as.x; ey = as.y; snappedAngle = as.snappedAngle;
      }
      setLiveAngle(snappedAngle);
      previewRef.current = { type: toolRef.current, x1: dragStart.current.x, y1: dragStart.current.y, x2: ex, y2: ey };
      redrawCanvas(previewRef.current);
      return;
    }
    if (toolRef.current === "pen") {
      localPaths.current[localPaths.current.length - 1]?.points?.push(snapped) ||
        (localPaths.current = [...localPaths.current, { type: "pen", points: [dragStart.current, snapped], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }]);
      scheduleRedraw();
    }
  };

  const onPointerUp = (e) => {
    snapIndicator.current = null;
    previewRef.current = null;
    setLiveAngle(null);

    if (toolRef.current === "select" && moveState.current) {
      isDrawing.current = false;
      const updated = [...localPaths.current];
      onPathsChange(updated); notifyHighlights(updated);
      // refresh edit dims
      const p = updated[moveState.current.idx];
      if (p?.type === "highlight") {
        const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
        setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "" });
      }
      moveState.current = null;
      scheduleRedraw(); return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const snapped = getSnappedPos(e, false, toolRef.current === "highlight");

    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      const start = dragStart.current; dragStart.current = null;
      if (Math.hypot(snapped.x - start.x, snapped.y - start.y) < 4) { scheduleRedraw(); return; }
      if (toolRef.current === "line") {
        const as = snapAngle(start.x, start.y, snapped.x, snapped.y);
        const end = as.snappedAngle !== null ? { x: as.x, y: as.y } : { x: snapped.x, y: snapped.y };
        const updated = [...localPaths.current, { type: "line", points: [start, end], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }];
        localPaths.current = updated; onPathsChange(updated);
      } else {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        // Auto-default depth: base=24", upper=14"
        const defaultDepthIn = activeHighlightRef.current === "base" ? 24 : activeHighlightRef.current === "upper" ? 14 : null;
        let nx2 = snapped.x, ny2 = snapped.y;
        if (defaultDepthIn !== null) {
          const depthPx = (defaultDepthIn / 12) * BASE_PX_PER_FOOT;
          ny2 = start.y + depthPx;
        }
        const newHL = { type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color, x1: start.x, y1: start.y, x2: nx2, y2: ny2 };
        const updated = [...localPaths.current, newHL];
        localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated);
      }
      scheduleRedraw(); return;
    }

    if (toolRef.current === "pen") {
      onPathsChange([...localPaths.current]);
      scheduleRedraw();
    }
  };

  // ── Notify parent ─────────────────────────────────────────────────────────
  const notifyHighlights = (allPaths) => {
    if (!onHighlightsChange) return;
    const highlights = allPaths.filter(p => p.type === "highlight").map(p => {
      const { wFt, hFt, lf } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
      return { cabKey: p.cabKey, wFt: parseFloat(wFt), hFt: parseFloat(hFt), lf: parseFloat(lf), measureType: "lf", quantity: parseFloat(wFt) };
    });
    onHighlightsChange(highlights);
  };

  // ── Edit dimensions ───────────────────────────────────────────────────────
  const applyDimEdit = () => {
    if (selectedIdx === null) return;
    const p = localPaths.current[selectedIdx];
    if (!p) return;

    let updated = [...localPaths.current];
    if (p.type === "highlight") {
      // editDim.w and editDim.h are in inches
      const wPx = (parseFloat(editDim.w) / 12) * BASE_PX_PER_FOOT;
      const hPx = (parseFloat(editDim.h) / 12) * BASE_PX_PER_FOOT;
      if (isNaN(wPx) || isNaN(hPx) || wPx <= 0 || hPx <= 0) return;
      const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
      updated[selectedIdx] = { ...p, x1: rx, y1: ry, x2: rx + wPx, y2: ry + hPx };
    } else if (p.type === "line") {
      // editDim.len is in inches, editDim.angle in degrees
      const newLen = (parseFloat(editDim.len) / 12) * BASE_PX_PER_FOOT;
      if (!newLen) return;
      const [p1, p2] = p.points;
      const currentAngleDeg = parseFloat(editDim.angle);
      const angleDeg = !isNaN(currentAngleDeg) ? currentAngleDeg : calcAngle(p1.x, p1.y, p2.x, p2.y);
      const angleRad = angleDeg * Math.PI / 180;
      const newP2 = { x: Math.round(p1.x + Math.cos(angleRad) * newLen), y: Math.round(p1.y + Math.sin(angleRad) * newLen) };
      updated[selectedIdx] = { ...p, points: [p1, newP2] };
    }
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated); scheduleRedraw();
  };

  const alignToWall = (position) => {
    if (selectedIdx === null) return;
    const p = localPaths.current[selectedIdx];
    if (p?.type !== "highlight") return;
    const wall = findNearestWall(p, localPaths.current);
    if (!wall) return;
    const aligned = alignHighlightToWall(p, wall, position);
    const updated = [...localPaths.current];
    updated[selectedIdx] = aligned;
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated);
    // refresh editDim
    const { wFt, hFt } = calcRectFt(aligned.x1, aligned.y1, aligned.x2, aligned.y2);
    setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "" });
    scheduleRedraw();
  };

  const deleteSelected = () => {
    if (selectedIdx === null) return;
    const updated = localPaths.current.filter((_, i) => i !== selectedIdx);
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated);
    selectItem(null); scheduleRedraw();
  };

  const selectedPath = selectedIdx !== null ? localPaths.current[selectedIdx] : null;

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const changeZoom = (delta) => {
    setZoom(prev => {
      const nz = Math.min(3, Math.max(0.4, prev + delta));
      zoomRef.current = nz;
      requestAnimationFrame(() => redrawCanvas());
      return nz;
    });
  };

  const toolBtn = (t, label, icon, activeColor) => (
    <button onClick={() => setTool(t)}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === t ? `${activeColor} text-white border-transparent` : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white select-none">
      {/* Toolbar Row 1 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        {toolBtn("select", "Select/Move", <Move className="w-3.5 h-3.5" />, "bg-amber-500")}
        {toolBtn("line",   "Wall",        <Minus className="w-3.5 h-3.5" />, "bg-blue-500")}
        {toolBtn("pen",    "Pen",         <Pencil className="w-3.5 h-3.5" />, "bg-slate-700")}
        {toolBtn("eraser", "Erase",       <Eraser className="w-3.5 h-3.5" />, "bg-red-500")}

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {CAB_HIGHLIGHTS.map(h => (
          <button key={h.key}
            onClick={() => { setTool("highlight"); setActiveHighlight(h.key); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${tool === "highlight" && activeHighlight === h.key ? "border-slate-700 shadow-md" : "border-transparent hover:border-slate-300"}`}
            style={{ backgroundColor: h.fillColor, color: h.color, outline: tool === "highlight" && activeHighlight === h.key ? `2px solid ${h.color}` : "none" }}>
            {h.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {SYMBOLS.map(sym => (
          <button key={sym.key}
            onClick={() => { setTool("symbol"); setActiveSymbol(sym.key); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "symbol" && activeSymbol === sym.key ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
            {sym.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-300 mx-0.5 ml-auto" />

        {/* Zoom */}
        <button onClick={() => changeZoom(0.2)} className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600" title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => changeZoom(-0.2)} className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600" title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Toolbar Row 2 — thickness + colors + undo/clear */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-wrap">
        <div className="flex gap-1.5 items-center">
          {Object.entries(THICKNESS).map(([key, val]) => (
            <button key={key} onClick={() => setThickness(key)}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${thickness === key ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="rounded-full bg-slate-700" style={{ width: Math.min(val * 2.5, 14), height: Math.min(val * 2.5, 14) }} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); if (!["eraser","highlight","symbol"].includes(tool)) setTool("line"); }}
              className="rounded-full transition-all" style={{ backgroundColor: c, width: 20, height: 20, border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => { const u = localPaths.current.slice(0, -1); localPaths.current = u; onPathsChange(u); notifyHighlights(u); scheduleRedraw(); }}
            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500" title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { localPaths.current = []; onPathsChange([]); notifyHighlights([]); selectItem(null); scheduleRedraw(); }}
            className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-500" title="Clear all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit bar — shows when item is selected */}
      {selectedPath?.type === "highlight" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800">Cabinet Box:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="0.5"
            className="w-16 h-7 text-xs border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.w}
            onChange={e => setEditDim(prev => ({ ...prev, w: e.target.value }))} />
          <label className="text-xs text-slate-600">Depth (in)</label>
          <input type="number" step="0.5"
            className="w-16 h-7 text-xs border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.h}
            onChange={e => setEditDim(prev => ({ ...prev, h: e.target.value }))} />
          <button onClick={applyDimEdit} className="px-3 h-7 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg">Apply</button>
          <span className="text-xs text-slate-500">
            {(() => { const wIn = parseFloat(editDim.w)||0; const totalIn = wIn; return `= ${totalIn}" (${(totalIn/12).toFixed(2)} LF)`; })()}
          </span>
          {/* Wall align — only show if there's a wall to snap to */}
          {localPaths.current.some(p => p.type === "line") && (
            <>
              <div className="w-px h-5 bg-amber-300 mx-0.5" />
              <span className="text-xs text-slate-500 font-medium">Align to Wall:</span>
              <button onClick={() => alignToWall("left")} title="Left edge to wall"
                className="px-2.5 h-7 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg">
                ◀ Left
              </button>
              <button onClick={() => alignToWall("center")} title="Center on wall"
                className="px-2.5 h-7 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg">
                ◈ Center
              </button>
              <button onClick={() => alignToWall("right")} title="Right edge to wall"
                className="px-2.5 h-7 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg">
                Right ▶
              </button>
            </>
          )}
          <button onClick={deleteSelected} className="ml-auto px-3 h-7 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-7 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">✕</button>
        </div>
      )}
      {selectedPath?.type === "line" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-800">Wall:</span>
          <label className="text-xs text-slate-600">Length (in)</label>
          <input type="number" step="1" min="1"
            className="w-20 h-7 text-xs border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.len}
            onChange={e => setEditDim(prev => ({ ...prev, len: e.target.value }))} />
          <label className="text-xs text-slate-600">Angle (°)</label>
          <input type="number" step="22.5" min="-180" max="180"
            className="w-20 h-7 text-xs border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.angle}
            onChange={e => setEditDim(prev => ({ ...prev, angle: e.target.value }))} />
          <span className="text-xs text-slate-500">
            = {editDim.len}" ({((parseFloat(editDim.len)||0)/12).toFixed(2)} LF)
          </span>
          <button onClick={applyDimEdit} className="px-3 h-7 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-7 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-7 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">✕</button>
        </div>
      )}
      {liveAngle !== null && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border-b border-blue-200">
          <span className="text-xs font-semibold text-blue-700">⟳ Snapped to {liveAngle}°</span>
        </div>
      )}

      {/* Canvas — fixed resolution, CSS zoom for display */}
      <div ref={containerRef} className="overflow-auto bg-white" style={{ maxHeight: 420 }}>
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: "relative", flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              cursor: tool === "eraser" ? "cell" : tool === "symbol" ? "copy" : tool === "select" ? (moveState.current ? "grabbing" : "pointer") : "crosshair",
              touchAction: "none", display: "block",
              width: CANVAS_W * zoom,
              height: CANVAS_H * zoom,
              transformOrigin: "top left",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 items-center">
        {CAB_HIGHLIGHTS.map(h => {
          const hls = (paths || []).filter(p => p.type === "highlight" && p.cabKey === h.key);
          if (!hls.length) return null;
          const totalLf = hls.reduce((s, p) => s + parseFloat(calcRectFt(p.x1, p.y1, p.x2, p.y2).wFt), 0);
          return (
            <span key={h.key} className="text-xs font-semibold rounded-full px-2 py-0.5"
              style={{ backgroundColor: h.fillColor, color: h.color }}>
              {h.label}: {ftToFtIn(totalLf.toFixed(2))} ({totalLf.toFixed(1)} LF)
            </span>
          );
        })}
        <span className="text-xs text-slate-400 ml-auto">
          🟡 = snap to object &nbsp;⚫ = grid snap
        </span>
      </div>
    </div>
  );
}