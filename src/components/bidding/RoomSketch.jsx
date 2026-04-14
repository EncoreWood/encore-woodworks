import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Eraser, Undo2, Trash2, Minus, Move, Edit3, ZoomIn, ZoomOut } from "lucide-react";

const BASE_PX_PER_FOOT = 40;
const GRID_SIZE = BASE_PX_PER_FOOT;
const CANVAS_W = 2000;
const CANVAS_H = 1200;
const SNAP_OBJECT_RADIUS = 18;

const COLORS = ["#1e1e1e", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];
const THICKNESS = { thin: 1.5, medium: 3, thick: 6 };

const CAB_HIGHLIGHTS = [
  { key: "base",  label: "Base",  color: "#3b82f6", fillColor: "rgba(59,130,246,0.22)" },
  { key: "upper", label: "Upper", color: "#22c55e", fillColor: "rgba(34,197,94,0.22)" },
  { key: "tall",  label: "Tall",  color: "#f59e0b", fillColor: "rgba(245,158,11,0.22)" },
  { key: "misc",  label: "Misc",  color: "#8b5cf6", fillColor: "rgba(139,92,246,0.22)" },
];

// Default sizes in inches
const SYMBOL_DEFAULTS = {
  outlet:   { w: null, h: null },
  switch:   { w: null, h: null },
  plumbing: { w: null, h: null },
  door:     { w: 32, h: null },   // 32" wide door
  window:   { w: 36, h: null },   // 36" wide window
};

const SYMBOLS = [
  { key: "outlet",   label: "Outlet" },
  { key: "switch",   label: "Switch" },
  { key: "plumbing", label: "Plumbing" },
  { key: "door",     label: "Door",    hasSizing: true },
  { key: "window",   label: "Window",  hasSizing: true },
];

// ── Mini canvas icon renderers (for toolbar) ──────────────────────────────────
function SymbolIcon({ symbolKey, size = 24 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, s = size * 0.42;
    drawSymbolCtx(ctx, symbolKey, cx, cy, s);
  }, [symbolKey, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />;
}

// ── Draw symbol to canvas context ─────────────────────────────────────────────
function drawSymbolCtx(ctx, key, x, y, size) {
  ctx.save();
  if (key === "outlet") {
    ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 1.5; ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.rect(x - size, y - size, size * 2, size * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - size * 0.3, y, size * 0.22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + size * 0.3, y, size * 0.22, 0, Math.PI * 2); ctx.stroke();
  } else if (key === "switch") {
    ctx.strokeStyle = "#065f46"; ctx.lineWidth = 1.5; ctx.fillStyle = "#d1fae5";
    ctx.beginPath(); ctx.rect(x - size, y - size, size * 2, size * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#065f46"; ctx.font = `bold ${size * 0.95}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", x, y);
  } else if (key === "plumbing") {
    ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 1.5; ctx.fillStyle = "#eff6ff";
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - size * 0.6); ctx.lineTo(x, y + size * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - size * 0.6, y); ctx.lineTo(x + size * 0.6, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, size * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (key === "door") {
    // Door: two thick wall endpoints + arc swing
    const half = size;
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.fillStyle = "transparent";
    // wall line
    ctx.fillStyle = "#374151"; ctx.fillRect(x - half, y - 3, half * 2, 6);
    // opening (white gap)
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - half * 0.85, y - 4, half * 0.85, 8);
    // door leaf
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - half * 0.85, y); ctx.lineTo(x - half * 0.85, y - half * 0.85); ctx.stroke();
    // arc
    ctx.beginPath(); ctx.arc(x - half * 0.85, y, half * 0.85, -Math.PI / 2, 0); ctx.stroke();
  } else if (key === "window") {
    const half = size;
    // wall segments
    ctx.fillStyle = "#374151";
    ctx.fillRect(x - half, y - 3, half * 0.25, 6);
    ctx.fillRect(x + half * 0.75, y - 3, half * 0.25, 6);
    // glass lines (3 parallel)
    ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - half * 0.65, y + i * 2.5); ctx.lineTo(x + half * 0.65, y + i * 2.5); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Draw symbol on the main canvas (larger, with wall context) ────────────────
function drawSymbol(ctx, sym, zoom) {
  const lw = 1 / zoom;
  const { x, y, symbolKey, widthPx = BASE_PX_PER_FOOT * 2, wallAngle = 0 } = sym;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wallAngle);

  const half = widthPx / 2;

  if (symbolKey === "outlet") {
    const s = 14 * lw;
    ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-s * 0.3, 0, s * 0.22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.22, 0, Math.PI * 2); ctx.stroke();
  } else if (symbolKey === "switch") {
    const s = 14 * lw;
    ctx.strokeStyle = "#065f46"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#d1fae5";
    ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#065f46"; ctx.font = `bold ${s * 1.1}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", 0, 0);
  } else if (symbolKey === "plumbing") {
    const s = 14 * lw;
    ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#eff6ff";
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.65); ctx.lineTo(0, s * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.65, 0); ctx.lineTo(s * 0.65, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (symbolKey === "door") {
    const wallThick = 5 * lw;
    // Wall caps (black filled blocks at each side)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-half, -wallThick * 1.5, wallThick * 2, wallThick * 3);
    ctx.fillRect(half - wallThick * 2, -wallThick * 1.5, wallThick * 2, wallThick * 3);
    // Opening gap (white)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-half + wallThick * 2, -wallThick * 2.5, widthPx - wallThick * 4, wallThick * 5);
    // Door leaf line from hinge point
    const hingeX = -half + wallThick * 2;
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2 * lw;
    ctx.beginPath(); ctx.moveTo(hingeX, 0); ctx.lineTo(hingeX, -widthPx * 0.9); ctx.stroke();
    // Arc
    ctx.beginPath(); ctx.arc(hingeX, 0, widthPx * 0.9, -Math.PI / 2, 0); ctx.stroke();
    // Size label
    const wIn = Math.round((widthPx / BASE_PX_PER_FOOT) * 12);
    ctx.fillStyle = "#7c3aed"; ctx.font = `bold ${10 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${wIn}"`, 0, -widthPx * 0.92);
  } else if (symbolKey === "window") {
    const wallThick = 5 * lw;
    // Wall caps
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-half, -wallThick * 1.5, wallThick * 2, wallThick * 3);
    ctx.fillRect(half - wallThick * 2, -wallThick * 1.5, wallThick * 2, wallThick * 3);
    // Glass pane (light blue rect)
    ctx.fillStyle = "rgba(186,230,253,0.5)"; ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 2 * lw;
    const gx = -half + wallThick * 2, gw = widthPx - wallThick * 4;
    ctx.fillRect(gx, -wallThick * 1.2, gw, wallThick * 2.4);
    ctx.strokeRect(gx, -wallThick * 1.2, gw, wallThick * 2.4);
    // Three glass lines
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(gx, i * wallThick * 0.35); ctx.lineTo(gx + gw, i * wallThick * 0.35); ctx.stroke();
    }
    // Size label
    const wIn = Math.round((widthPx / BASE_PX_PER_FOOT) * 12);
    ctx.fillStyle = "#0ea5e9"; ctx.font = `bold ${10 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${wIn}"`, 0, -wallThick * 2.5);
  }

  ctx.restore();
}

// ── Snap helpers ──────────────────────────────────────────────────────────────
function snapToGrid(val) { return Math.round(val / GRID_SIZE) * GRID_SIZE; }

function getSnapCandidates(paths) {
  const pts = [];
  paths.forEach(p => {
    if (p.type === "line" && p.points) { pts.push(p.points[0], p.points[1]); }
    if (p.type === "highlight") {
      const { x1, y1, x2, y2 } = p;
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
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

function smartSnap(rawX, rawY, paths, isFirstPoint, forHighlight = false) {
  const candidates = getSnapCandidates(paths);
  if (candidates.length > 0) {
    let best = null, bestDist = SNAP_OBJECT_RADIUS;
    candidates.forEach(c => {
      const d = Math.hypot(c.x - rawX, c.y - rawY);
      if (d < bestDist) { bestDist = d; best = c; }
    });
    if (best) return { x: best.x, y: best.y, snapped: true };
    if (forHighlight) return { x: rawX, y: rawY, snapped: false };
  }
  return { x: snapToGrid(rawX), y: snapToGrid(rawY), snapped: false };
}

// ── Angle snap ────────────────────────────────────────────────────────────────
const SNAP_ANGLES = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, -157.5, -135, -112.5, -90, -67.5, -45, -22.5];
const ANGLE_SNAP_THRESHOLD = 8;

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
function ftToFtIn(decFt) {
  const totalIn = Math.round(parseFloat(decFt) * 12);
  return `${totalIn}"`;
}

/** Find nearest wall and return its angle — for placing wall symbols */
function findNearestWallForSymbol(x, y, paths) {
  const walls = paths.filter(p => p.type === "line" && p.points?.length === 2);
  if (!walls.length) return null;
  let best = null, bestDist = Infinity;
  walls.forEach(w => {
    const [p1, p2] = w.points;
    // Dist from point to line segment
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq ? Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq)) : 0;
    const cx = p1.x + t * dx, cy = p1.y + t * dy;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestDist) { bestDist = d; best = { wall: w, projX: cx, projY: cy }; }
  });
  if (!best || bestDist > 60) return null; // only snap if within 60px
  const [p1, p2] = best.wall.points;
  return { projX: best.projX, projY: best.projY, angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) };
}

// ── Draw grid ─────────────────────────────────────────────────────────────────
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

// ── Draw one path ─────────────────────────────────────────────────────────────
function drawOnePath(ctx, path, isSelected, zoom) {
  const lw = 1 / zoom;
  if (path.type === "symbol") {
    drawSymbol(ctx, path, zoom);
    if (isSelected) {
      ctx.save();
      ctx.translate(path.x, path.y);
      ctx.rotate(path.wallAngle || 0);
      const half = (path.widthPx || BASE_PX_PER_FOOT * 2) / 2 + 6 * lw;
      const hh = 20 * lw;
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
      ctx.strokeRect(-half, -hh, half * 2, hh * 2); ctx.setLineDash([]);
      ctx.restore();
    }
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

function projectPointOntoLine(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

function alignHighlightToWall(hl, wall, position) {
  const [w1, w2] = wall.points;
  const wallAngle = Math.atan2(w2.y - w1.y, w2.x - w1.x);
  const wallLen = Math.hypot(w2.x - w1.x, w2.y - w1.y);
  const hlCx = (hl.x1 + hl.x2) / 2, hlCy = (hl.y1 + hl.y2) / 2;
  const hlW = Math.abs(hl.x2 - hl.x1), hlH = Math.abs(hl.y2 - hl.y1);
  const proj = projectPointOntoLine(hlCx, hlCy, w1.x, w1.y, w2.x, w2.y);
  const nx = -Math.sin(wallAngle), ny = Math.cos(wallAngle);
  const side = ((hlCx - w1.x) * nx + (hlCy - w1.y) * ny) >= 0 ? 1 : -1;
  const halfAlong = hlW / 2, halfAcross = hlH / 2;
  let alongOffset = 0;
  if (position === "left")  alongOffset = halfAlong;
  if (position === "right") alongOffset = -halfAlong;
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
  const [symbolSizes, setSymbolSizes] = useState({ door: 32, window: 36 }); // in inches
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [editDim, setEditDim] = useState({ w: "", h: "", len: "", angle: "", symW: "" });
  const [liveAngle, setLiveAngle] = useState(null);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const activeHighlightRef = useRef(activeHighlight);
  const activeSymbolRef = useRef(activeSymbol);
  const symbolSizesRef = useRef(symbolSizes);
  const selectedIdxRef = useRef(selectedIdx);
  const zoomRef = useRef(zoom);

  const isDrawing = useRef(false);
  const dragStart = useRef(null);
  const moveState = useRef(null);
  const localPaths = useRef(paths || []);
  const previewRef = useRef(null);
  const snapIndicator = useRef(null);
  const rafId = useRef(null);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { activeHighlightRef.current = activeHighlight; }, [activeHighlight]);
  useEffect(() => { activeSymbolRef.current = activeSymbol; }, [activeSymbol]);
  useEffect(() => { symbolSizesRef.current = symbolSizes; }, [symbolSizes]);
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, CANVAS_W, CANVAS_H, 1);

    localPaths.current.forEach((path, idx) => {
      drawOnePath(ctx, path, idx === selectedIdxRef.current, 1);
    });

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
    // Support both pointer events and touch events
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    const z = zoomRef.current;
    return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z };
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
        const inBounds = pos.x >= Math.min(p1.x, p2.x) - 12 && pos.x <= Math.max(p1.x, p2.x) + 12
          && pos.y >= Math.min(p1.y, p2.y) - 12 && pos.y <= Math.max(p1.y, p2.y) + 12;
        if (d < 12 && inBounds) return i;
      }
      if (p.type === "symbol") {
        const half = (p.widthPx || 40) / 2 + 10;
        // Rotate hit rect by wall angle
        const angle = -(p.wallAngle || 0);
        const dx = pos.x - p.x, dy = pos.y - p.y;
        const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
        if (Math.abs(lx) < half && Math.abs(ly) < 24) return i;
      }
    }
    return null;
  };

  // ── Erase ─────────────────────────────────────────────────────────────────
  const eraseAt = (pos) => {
    const t = 18;
    const updated = localPaths.current.filter(p => {
      if (p.type === "symbol") return Math.hypot(p.x - pos.x, p.y - pos.y) > 28;
      if (p.type === "highlight") {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        const rw = Math.abs(p.x2 - p.x1), rh = Math.abs(p.y2 - p.y1);
        return !(pos.x >= rx - t && pos.x <= rx + rw + t && pos.y >= ry - t && pos.y <= ry + rh + t);
      }
      return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t);
    });
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated); scheduleRedraw();
  };

  // ── Select + move ─────────────────────────────────────────────────────────
  const selectItem = (idx) => {
    setSelectedIdx(idx);
    selectedIdxRef.current = idx;
    if (idx !== null) {
      const p = localPaths.current[idx];
      if (p?.type === "highlight") {
        const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
        setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "", symW: "" });
      } else if (p?.type === "line") {
        const lenFt = calcLineFt(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        const ang = calcAngle(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        setEditDim({ w: "", h: "", len: Math.round(parseFloat(lenFt) * 12), angle: ang, symW: "" });
      } else if (p?.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
        const wIn = Math.round((p.widthPx / BASE_PX_PER_FOOT) * 12);
        setEditDim({ w: "", h: "", len: "", symW: wIn });
      } else {
        setEditDim({ w: "", h: "", len: "", angle: "", symW: "" });
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
        const hasSizing = sym === "door" || sym === "window";
        const sizes = symbolSizesRef.current;
        const widthIn = hasSizing ? (sizes[sym] || 32) : null;
        const widthPx = widthIn ? (widthIn / 12) * BASE_PX_PER_FOOT : null;
        // Snap to nearest wall
        const wallSnap = hasSizing ? findNearestWallForSymbol(pos.x, pos.y, localPaths.current) : null;
        const newSym = {
          type: "symbol",
          symbolKey: sym,
          x: wallSnap ? wallSnap.projX : pos.x,
          y: wallSnap ? wallSnap.projY : pos.y,
          wallAngle: wallSnap ? wallSnap.angle : 0,
          widthPx: widthPx,
        };
        const updated = [...localPaths.current, newSym];
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

    if (isDrawing.current && toolRef.current === "select" && moveState.current) {
      const { idx, origPath, startX, startY } = moveState.current;
      const dx = raw.x - startX, dy = raw.y - startY;

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
        const nx = snapToGrid(p.x + dx), ny = snapToGrid(p.y + dy);
        // Re-snap to nearest wall if door/window
        const hasSizing = p.symbolKey === "door" || p.symbolKey === "window";
        if (hasSizing) {
          const wallSnap = findNearestWallForSymbol(nx, ny, localPaths.current);
          updated[idx] = wallSnap
            ? { ...p, x: wallSnap.projX, y: wallSnap.projY, wallAngle: wallSnap.angle }
            : { ...p, x: nx, y: ny };
        } else {
          updated[idx] = { ...p, x: nx, y: ny };
        }
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
      const p = updated[moveState.current.idx];
      if (p?.type === "highlight") {
        const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
        setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "", symW: "" });
      } else if (p?.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
        const wIn = Math.round((p.widthPx / BASE_PX_PER_FOOT) * 12);
        setEditDim({ w: "", h: "", len: "", symW: wIn });
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
      const wPx = (parseFloat(editDim.w) / 12) * BASE_PX_PER_FOOT;
      const hPx = (parseFloat(editDim.h) / 12) * BASE_PX_PER_FOOT;
      if (isNaN(wPx) || isNaN(hPx) || wPx <= 0 || hPx <= 0) return;
      const wall = findNearestWall(p, localPaths.current);
      if (wall) {
        const [w1, w2] = wall.points;
        const wallAngle = Math.atan2(w2.y - w1.y, w2.x - w1.x);
        const nx = -Math.sin(wallAngle), ny = Math.cos(wallAngle);
        const hlCx = (p.x1 + p.x2) / 2, hlCy = (p.y1 + p.y2) / 2;
        const side = ((hlCx - w1.x) * nx + (hlCy - w1.y) * ny) >= 0 ? 1 : -1;
        const proj = projectPointOntoLine(hlCx, hlCy, w1.x, w1.y, w2.x, w2.y);
        const newCx = proj.x + nx * side * (hPx / 2);
        const newCy = proj.y + ny * side * (hPx / 2);
        const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
        const corners = [
          { x: newCx + ax * wPx/2 + nx * hPx/2, y: newCy + ay * wPx/2 + ny * hPx/2 },
          { x: newCx - ax * wPx/2 + nx * hPx/2, y: newCy - ay * wPx/2 + ny * hPx/2 },
          { x: newCx + ax * wPx/2 - nx * hPx/2, y: newCy + ay * wPx/2 - ny * hPx/2 },
          { x: newCx - ax * wPx/2 - nx * hPx/2, y: newCy - ay * wPx/2 - ny * hPx/2 },
        ];
        const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
        updated[selectedIdx] = { ...p, x1: Math.round(Math.min(...xs)), y1: Math.round(Math.min(...ys)), x2: Math.round(Math.max(...xs)), y2: Math.round(Math.max(...ys)) };
      } else {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        updated[selectedIdx] = { ...p, x1: rx, y1: ry, x2: rx + wPx, y2: ry + hPx };
      }
    } else if (p.type === "line") {
      const newLen = (parseFloat(editDim.len) / 12) * BASE_PX_PER_FOOT;
      if (!newLen) return;
      const [p1, p2] = p.points;
      const currentAngleDeg = parseFloat(editDim.angle);
      const angleDeg = !isNaN(currentAngleDeg) ? currentAngleDeg : calcAngle(p1.x, p1.y, p2.x, p2.y);
      const angleRad = angleDeg * Math.PI / 180;
      const newP2 = { x: Math.round(p1.x + Math.cos(angleRad) * newLen), y: Math.round(p1.y + Math.sin(angleRad) * newLen) };
      updated[selectedIdx] = { ...p, points: [p1, newP2] };
    } else if (p.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
      const wIn = parseFloat(editDim.symW);
      if (isNaN(wIn) || wIn <= 0) return;
      updated[selectedIdx] = { ...p, widthPx: (wIn / 12) * BASE_PX_PER_FOOT };
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
    const { wFt, hFt } = calcRectFt(aligned.x1, aligned.y1, aligned.x2, aligned.y2);
    setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "", symW: "" });
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
      const nz = Math.min(3, Math.max(0.3, prev + delta));
      zoomRef.current = nz;
      requestAnimationFrame(() => redrawCanvas());
      return nz;
    });
  };

  // iPad pinch-to-zoom
  const lastPinchDist = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (newDist - lastPinchDist.current) / 200;
      lastPinchDist.current = newDist;
      changeZoom(delta);
    }
  };
  const onTouchEnd = () => { lastPinchDist.current = null; };

  const toolBtn = (t, label, icon, activeColor) => (
    <button
      onPointerDown={(e) => { e.stopPropagation(); setTool(t); }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all touch-manipulation ${tool === t ? `${activeColor} text-white border-transparent` : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white select-none">
      {/* Toolbar Row 1 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        {toolBtn("select", "Select", <Move className="w-4 h-4" />, "bg-amber-500")}
        {toolBtn("line",   "Wall",   <Minus className="w-4 h-4" />, "bg-blue-500")}
        {toolBtn("pen",    "Pen",    <Pencil className="w-4 h-4" />, "bg-slate-700")}
        {toolBtn("eraser", "Erase",  <Eraser className="w-4 h-4" />, "bg-red-500")}

        <div className="w-px h-6 bg-slate-300 mx-0.5" />

        {CAB_HIGHLIGHTS.map(h => (
          <button key={h.key}
            onPointerDown={(e) => { e.stopPropagation(); setTool("highlight"); setActiveHighlight(h.key); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all touch-manipulation ${tool === "highlight" && activeHighlight === h.key ? "border-slate-700 shadow-md" : "border-transparent hover:border-slate-300"}`}
            style={{ backgroundColor: h.fillColor, color: h.color, outline: tool === "highlight" && activeHighlight === h.key ? `2px solid ${h.color}` : "none" }}>
            {h.label}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-300 mx-0.5" />

        {/* Symbols with actual mini canvas icons */}
        {SYMBOLS.map(sym => (
          <button key={sym.key}
            onPointerDown={(e) => { e.stopPropagation(); setTool("symbol"); setActiveSymbol(sym.key); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all touch-manipulation ${tool === "symbol" && activeSymbol === sym.key ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
            <SymbolIcon symbolKey={sym.key} size={22} />
            {sym.label}
          </button>
        ))}

        {/* Inline size inputs for door/window */}
        {tool === "symbol" && (activeSymbol === "door" || activeSymbol === "window") && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs text-slate-500">Size:</span>
            <input
              type="number"
              step="1"
              value={symbolSizes[activeSymbol] || ""}
              onChange={e => setSymbolSizes(prev => ({ ...prev, [activeSymbol]: parseFloat(e.target.value) || 0 }))}
              className="w-14 h-8 text-xs border border-indigo-300 rounded-lg px-2 bg-white"
              onClick={e => e.stopPropagation()}
            />
            <span className="text-xs text-slate-500">in</span>
          </div>
        )}

        <div className="w-px h-6 bg-slate-300 mx-0.5 ml-auto" />

        {/* Zoom */}
        <button onPointerDown={(e) => { e.stopPropagation(); changeZoom(0.2); }} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 touch-manipulation" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onPointerDown={(e) => { e.stopPropagation(); changeZoom(-0.2); }} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 touch-manipulation" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar Row 2 — thickness + colors + undo/clear */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 flex-wrap">
        <div className="flex gap-1.5 items-center">
          {Object.entries(THICKNESS).map(([key, val]) => (
            <button key={key}
              onPointerDown={(e) => { e.stopPropagation(); setThickness(key); }}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all touch-manipulation ${thickness === key ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="rounded-full bg-slate-700" style={{ width: Math.min(val * 2.5, 14), height: Math.min(val * 2.5, 14) }} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button key={c}
              onPointerDown={(e) => { e.stopPropagation(); setColor(c); if (!["eraser","highlight","symbol"].includes(tool)) setTool("line"); }}
              className="rounded-full transition-all touch-manipulation" style={{ backgroundColor: c, width: 24, height: 24, border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            onPointerDown={(e) => { e.stopPropagation(); const u = localPaths.current.slice(0, -1); localPaths.current = u; onPathsChange(u); notifyHighlights(u); scheduleRedraw(); }}
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 touch-manipulation" title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onPointerDown={(e) => { e.stopPropagation(); localPaths.current = []; onPathsChange([]); notifyHighlights([]); selectItem(null); scheduleRedraw(); }}
            className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-500 touch-manipulation" title="Clear all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit bar — highlight selected */}
      {selectedPath?.type === "highlight" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800">Cabinet:</span>
          <label className="text-xs text-slate-600">Width/LF (in)</label>
          <input type="number" step="0.5" inputMode="decimal"
            className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.w}
            onChange={e => setEditDim(prev => ({ ...prev, w: e.target.value }))} />
          <label className="text-xs text-slate-600">Depth (in)</label>
          <input type="number" step="0.5" inputMode="decimal"
            className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.h}
            onChange={e => setEditDim(prev => ({ ...prev, h: e.target.value }))} />
          <button onPointerDown={() => applyDimEdit()} className="px-3 h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg touch-manipulation">Apply</button>
          <span className="text-xs text-slate-500">
            {(() => { const wIn = parseFloat(editDim.w)||0; return `= ${wIn}" (${(wIn/12).toFixed(2)} LF)`; })()}
          </span>
          <div className="w-px h-5 bg-amber-300 mx-0.5" />
          <span className="text-xs text-slate-500 font-medium">Align:</span>
          <button onPointerDown={() => alignToWall("left")} className="px-2.5 h-8 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg touch-manipulation">◀ Left</button>
          <button onPointerDown={() => alignToWall("center")} className="px-2.5 h-8 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg touch-manipulation">◈ Ctr</button>
          <button onPointerDown={() => alignToWall("right")} className="px-2.5 h-8 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg touch-manipulation">Right ▶</button>
          <button onPointerDown={() => deleteSelected()} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onPointerDown={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 touch-manipulation">✕</button>
        </div>
      )}

      {/* Edit bar — wall selected */}
      {selectedPath?.type === "line" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-800">Wall:</span>
          <label className="text-xs text-slate-600">Length (in)</label>
          <input type="number" step="1" inputMode="decimal"
            className="w-20 h-8 text-sm border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.len}
            onChange={e => setEditDim(prev => ({ ...prev, len: e.target.value }))} />
          <label className="text-xs text-slate-600">Angle (°)</label>
          <input type="number" step="22.5" inputMode="decimal"
            className="w-20 h-8 text-sm border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.angle}
            onChange={e => setEditDim(prev => ({ ...prev, angle: e.target.value }))} />
          <span className="text-xs text-slate-500">= {editDim.len}" ({((parseFloat(editDim.len)||0)/12).toFixed(2)} LF)</span>
          <button onPointerDown={() => applyDimEdit()} className="px-3 h-8 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg touch-manipulation">Apply</button>
          <button onPointerDown={() => deleteSelected()} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onPointerDown={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 touch-manipulation">✕</button>
        </div>
      )}

      {/* Edit bar — door/window selected */}
      {selectedPath?.type === "symbol" && (selectedPath.symbolKey === "door" || selectedPath.symbolKey === "window") && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-indigo-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-indigo-800 capitalize">{selectedPath.symbolKey}:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="1" inputMode="decimal"
            className="w-16 h-8 text-sm border border-indigo-300 rounded-lg px-2 bg-white"
            value={editDim.symW}
            onChange={e => setEditDim(prev => ({ ...prev, symW: e.target.value }))} />
          <button onPointerDown={() => applyDimEdit()} className="px-3 h-8 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg touch-manipulation">Apply</button>
          <span className="text-xs text-slate-500">{editDim.symW}" ({((parseFloat(editDim.symW)||0)/12).toFixed(2)} ft)</span>
          <button onPointerDown={() => deleteSelected()} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onPointerDown={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 touch-manipulation">✕</button>
        </div>
      )}

      {liveAngle !== null && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border-b border-blue-200">
          <span className="text-xs font-semibold text-blue-700">⟳ Snapped to {liveAngle}°</span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="overflow-auto bg-white"
        style={{ maxHeight: 480 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
        <span className="text-xs text-slate-400 ml-auto">🟡 snap &nbsp;⚫ grid</span>
      </div>
    </div>
  );
}