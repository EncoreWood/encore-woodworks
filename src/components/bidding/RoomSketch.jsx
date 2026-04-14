import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Eraser, Undo2, Redo2, Trash2, Minus, Move, Edit3, ZoomIn, ZoomOut } from "lucide-react";

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

const SYMBOLS = [
  { key: "outlet",   label: "Outlet" },
  { key: "switch",   label: "Switch" },
  { key: "plumbing", label: "Plumbing" },
  { key: "door",     label: "Door",    hasSizing: true },
  { key: "window",   label: "Window",  hasSizing: true },
];

// ── Mini canvas icons ─────────────────────────────────────────────────────────
function SymbolIcon({ symbolKey, size = 24 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, s = size * 0.42;
    ctx.save();
    if (symbolKey === "outlet") {
      ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 1.5; ctx.fillStyle = "#dbeafe";
      ctx.beginPath(); ctx.rect(cx - s, cy - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.3, cy, s * 0.22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.3, cy, s * 0.22, 0, Math.PI * 2); ctx.stroke();
    } else if (symbolKey === "switch") {
      ctx.strokeStyle = "#065f46"; ctx.lineWidth = 1.5; ctx.fillStyle = "#d1fae5";
      ctx.beginPath(); ctx.rect(cx - s, cy - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#065f46"; ctx.font = `bold ${s * 0.95}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("S", cx, cy);
    } else if (symbolKey === "plumbing") {
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 1.5; ctx.fillStyle = "#eff6ff";
      ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy); ctx.lineTo(cx + s * 0.6, cy); ctx.stroke();
    } else if (symbolKey === "door") {
      ctx.fillStyle = "#374151"; ctx.fillRect(cx - s, cy - 2, s * 0.18, 5);
      ctx.fillRect(cx + s * 0.82, cy - 2, s * 0.18, 5);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - s * 0.82, cy - 3, s * 1.64, 7);
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.82, cy); ctx.lineTo(cx - s * 0.82, cy - s * 0.82); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.82, cy, s * 0.82, -Math.PI / 2, 0); ctx.stroke();
    } else if (symbolKey === "window") {
      ctx.fillStyle = "#374151"; ctx.fillRect(cx - s, cy - 2, s * 0.2, 5); ctx.fillRect(cx + s * 0.8, cy - 2, s * 0.2, 5);
      ctx.fillStyle = "rgba(186,230,253,0.6)"; ctx.fillRect(cx - s * 0.78, cy - 3, s * 1.56, 7);
      ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.72, cy + i * 2); ctx.lineTo(cx + s * 0.72, cy + i * 2); ctx.stroke(); }
    }
    ctx.restore();
  }, [symbolKey, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />;
}

// ── Draw symbol on main canvas ────────────────────────────────────────────────
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
    const wt = 5 * lw;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-half, -wt * 1.5, wt * 2, wt * 3);
    ctx.fillRect(half - wt * 2, -wt * 1.5, wt * 2, wt * 3);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-half + wt * 2, -wt * 2.5, widthPx - wt * 4, wt * 5);
    const hingeX = -half + wt * 2;
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2 * lw;
    ctx.beginPath(); ctx.moveTo(hingeX, 0); ctx.lineTo(hingeX, -widthPx * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(hingeX, 0, widthPx * 0.9, -Math.PI / 2, 0); ctx.stroke();
    const wIn = Math.round((widthPx / BASE_PX_PER_FOOT) * 12);
    ctx.fillStyle = "#7c3aed"; ctx.font = `bold ${10 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${wIn}"`, 0, -widthPx * 0.92);
  } else if (symbolKey === "window") {
    const wt = 5 * lw;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-half, -wt * 1.5, wt * 2, wt * 3);
    ctx.fillRect(half - wt * 2, -wt * 1.5, wt * 2, wt * 3);
    ctx.fillStyle = "rgba(186,230,253,0.5)"; ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 2 * lw;
    const gx = -half + wt * 2, gw = widthPx - wt * 4;
    ctx.fillRect(gx, -wt * 1.2, gw, wt * 2.4); ctx.strokeRect(gx, -wt * 1.2, gw, wt * 2.4);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(gx, i * wt * 0.35); ctx.lineTo(gx + gw, i * wt * 0.35); ctx.stroke(); }
    const wIn = Math.round((widthPx / BASE_PX_PER_FOOT) * 12);
    ctx.fillStyle = "#0ea5e9"; ctx.font = `bold ${10 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${wIn}"`, 0, -wt * 2.5);
  }
  ctx.restore();
}

// ── Draw highlight cabinet ─────────────────────────────────────────────────────
// Highlights store: x1,y1 = anchor corner on wall, widthIn = width along wall,
// depthIn = depth away from wall, wallAngle (radians), wallSide (+1/-1)
function drawHighlight(ctx, path, isSelected, zoom) {
  const hl = CAB_HIGHLIGHTS.find(h => h.key === path.cabKey);
  if (!hl) return;
  const lw = 1 / zoom;

  // Legacy axis-aligned boxes still supported
  if (path.wallAngle === undefined) {
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

  // Wall-oriented cabinet
  const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = path;
  const wPx = (widthIn / 12) * BASE_PX_PER_FOOT;
  const dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
  const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
  const nx = -Math.sin(wallAngle) * wallSide, ny = Math.cos(wallAngle) * wallSide;

  // Four corners of cabinet (along wall × depth away)
  const c0 = { x: anchorX, y: anchorY };
  const c1 = { x: anchorX + ax * wPx, y: anchorY + ay * wPx };
  const c2 = { x: anchorX + ax * wPx + nx * dPx, y: anchorY + ay * wPx + ny * dPx };
  const c3 = { x: anchorX + nx * dPx, y: anchorY + ny * dPx };

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y);
  ctx.closePath();
  ctx.fillStyle = hl.fillColor; ctx.strokeStyle = hl.color; ctx.lineWidth = 2 * lw;
  ctx.fill(); ctx.stroke();

  // Label at center
  const cx = (c0.x + c1.x + c2.x + c3.x) / 4;
  const cy2 = (c0.y + c1.y + c2.y + c3.y) / 4;
  ctx.save();
  ctx.translate(cx, cy2);
  ctx.rotate(wallAngle);
  ctx.fillStyle = hl.color; ctx.font = `bold ${12 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${hl.label} ${widthIn}" × ${depthIn}"`, 0, 0);
  // Width annotation above
  ctx.font = `${10 * lw}px sans-serif`; ctx.fillStyle = "#475569";
  ctx.textBaseline = "bottom"; ctx.fillText(`${widthIn}" (${(widthIn/12).toFixed(2)} LF)`, 0, -dPx / 2 - 2 * lw);
  ctx.restore();

  if (isSelected) {
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y);
    ctx.closePath();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5 * lw; ctx.setLineDash([5 * lw, 3 * lw]);
    ctx.stroke(); ctx.setLineDash([]);
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
      if (p.wallAngle !== undefined) {
        // Wall-oriented: use anchor + far corner
        const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = p;
        const wPx = (widthIn / 12) * BASE_PX_PER_FOOT;
        const dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
        const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
        const nx = -Math.sin(wallAngle) * wallSide, ny = Math.cos(wallAngle) * wallSide;
        pts.push(
          { x: anchorX, y: anchorY },
          { x: anchorX + ax * wPx, y: anchorY + ay * wPx },
          { x: anchorX + ax * wPx + nx * dPx, y: anchorY + ay * wPx + ny * dPx },
          { x: anchorX + nx * dPx, y: anchorY + ny * dPx },
        );
      } else {
        const { x1, y1, x2, y2 } = p;
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        pts.push({ x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx, y: ry + rh }, { x: rx + rw, y: ry + rh });
      }
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
  SNAP_ANGLES.forEach(a => { const diff = Math.abs(rawAngle - a); if (diff < bestDiff) { bestDiff = diff; best = a; } });
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
function ftToFtIn(decFt) { return `${Math.round(parseFloat(decFt) * 12)}"`; }

// ── Wall nearest helpers ──────────────────────────────────────────────────────
function findNearestWallForPoint(x, y, paths, maxDist = 80) {
  const walls = paths.filter(p => p.type === "line" && p.points?.length === 2);
  if (!walls.length) return null;
  let best = null, bestDist = Infinity;
  walls.forEach(w => {
    const [p1, p2] = w.points;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq ? Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq)) : 0;
    const cx = p1.x + t * dx, cy = p1.y + t * dy;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestDist) { bestDist = d; best = { wall: w, projX: cx, projY: cy, t, dist: d }; }
  });
  if (!best || best.dist > maxDist) return null;
  const [p1, p2] = best.wall.points;
  const wallAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const nx = -Math.sin(wallAngle), ny = Math.cos(wallAngle);
  const side = ((y - p1.y) * nx - (x - p1.x) * ny) >= 0 ? 1 : -1; // which side of wall
  return {
    projX: best.projX, projY: best.projY,
    wallAngle, side,
    wall: best.wall,
    t: best.t,
    wallLen: Math.hypot(p2.x - p1.x, p2.y - p1.y),
  };
}

function projectPointOntoLine(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

// ── Offset cabinet along wall from wall start (p1) ───────────────────────────
function positionCabinetOnWall(cabinet, wall, offsetIn) {
  const [p1, p2] = wall.points;
  const wallAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const nx = -Math.sin(wallAngle), ny = Math.cos(wallAngle);
  const { widthIn, depthIn, wallSide } = cabinet;
  const offsetPx = (offsetIn / 12) * BASE_PX_PER_FOOT;
  const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
  return {
    ...cabinet,
    anchorX: p1.x + ax * offsetPx,
    anchorY: p1.y + ay * offsetPx,
    wallAngle,
    wallSide: wallSide ?? 1,
  };
}

// ── Draw grid ─────────────────────────────────────────────────────────────────
function drawGrid(ctx, w, h) {
  const gs = GRID_SIZE;
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += gs * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += gs * 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = "#94a3b8"; ctx.font = "11px sans-serif"; ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillText("1 sq = 1 ft", 6, 4);
}

function drawOnePath(ctx, path, isSelected, zoom) {
  const lw = 1 / zoom;
  if (path.type === "symbol") {
    drawSymbol(ctx, path, zoom);
    if (isSelected) {
      ctx.save(); ctx.translate(path.x, path.y); ctx.rotate(path.wallAngle || 0);
      const half = (path.widthPx || BASE_PX_PER_FOOT * 2) / 2 + 6 * lw, hh = 20 * lw;
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
      ctx.strokeRect(-half, -hh, half * 2, hh * 2); ctx.setLineDash([]);
      ctx.restore();
    }
    return;
  }
  if (path.type === "highlight") { drawHighlight(ctx, path, isSelected, zoom); return; }
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

// ── Hit test for wall-oriented cabinet ───────────────────────────────────────
function hitTestHighlight(pos, path) {
  if (path.wallAngle === undefined) {
    // legacy axis-aligned
    const rx = Math.min(path.x1, path.x2), ry = Math.min(path.y1, path.y2);
    const rw = Math.abs(path.x2 - path.x1), rh = Math.abs(path.y2 - path.y1);
    return pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh;
  }
  // Rotate pos into wall-local space, check bounding rect
  const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = path;
  const wPx = (widthIn / 12) * BASE_PX_PER_FOOT, dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
  const dx = pos.x - anchorX, dy = pos.y - anchorY;
  const lx = dx * Math.cos(-wallAngle) - dy * Math.sin(-wallAngle);
  const ly = dx * Math.sin(-wallAngle) + dy * Math.cos(-wallAngle);
  const lyAdjusted = ly * wallSide;
  return lx >= -2 && lx <= wPx + 2 && lyAdjusted >= -2 && lyAdjusted <= dPx + 2;
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
  const [symbolSizes, setSymbolSizes] = useState({ door: 32, window: 36 });
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [editDim, setEditDim] = useState({ w: "", h: "", len: "", angle: "", symW: "", offset: "" });
  const [liveAngle, setLiveAngle] = useState(null);

  // History for undo/redo
  const history = useRef([[]]);
  const historyIdx = useRef(0);

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

  // ── History helpers ────────────────────────────────────────────────────────
  const pushHistory = (newPaths) => {
    // Truncate redo stack
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(JSON.parse(JSON.stringify(newPaths)));
    historyIdx.current = history.current.length - 1;
  };

  const commitPaths = (newPaths) => {
    localPaths.current = newPaths;
    pushHistory(newPaths);
    onPathsChange(newPaths);
    notifyHighlights(newPaths);
    scheduleRedraw();
  };

  const undo = () => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const prev = history.current[historyIdx.current];
    localPaths.current = prev;
    onPathsChange(prev);
    notifyHighlights(prev);
    selectItem(null);
    scheduleRedraw();
  };

  const redo = () => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    const next = history.current[historyIdx.current];
    localPaths.current = next;
    onPathsChange(next);
    notifyHighlights(next);
    selectItem(null);
    scheduleRedraw();
  };

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
    drawGrid(ctx, CANVAS_W, CANVAS_H);

    localPaths.current.forEach((path, idx) => drawOnePath(ctx, path, idx === selectedIdxRef.current, 1));

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
          ctx.font = "bold 11px sans-serif"; ctx.fillStyle = hl.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const { wFt, hFt } = calcRectFt(x1, y1, x2, y2);
          ctx.fillText(`${ftToFtIn(wFt)} × ${ftToFtIn(hFt)}`, rx + rw / 2, ry + rh / 2);
        }
      }
      ctx.restore();
    }

    if (snapIndicator.current) {
      const { x, y, snapped } = snapIndicator.current;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, snapped ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = snapped ? "#f59e0b" : "#94a3b8"; ctx.fill(); ctx.restore();
    }
  }, []);

  // ── Pointer helpers ───────────────────────────────────────────────────────
  const getRawPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
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
      if (p.type === "highlight" && hitTestHighlight(pos, p)) return i;
      if (p.type === "line") {
        const [p1, p2] = p.points;
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (len === 0) continue;
        const d = Math.abs((p2.y - p1.y) * pos.x - (p2.x - p1.x) * pos.y + p2.x * p1.y - p2.y * p1.x) / len;
        const inBounds = pos.x >= Math.min(p1.x, p2.x) - 14 && pos.x <= Math.max(p1.x, p2.x) + 14
          && pos.y >= Math.min(p1.y, p2.y) - 14 && pos.y <= Math.max(p1.y, p2.y) + 14;
        if (d < 14 && inBounds) return i;
      }
      if (p.type === "symbol") {
        const half = (p.widthPx || 40) / 2 + 10;
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
      if (p.type === "highlight") return !hitTestHighlight({ x: pos.x, y: pos.y }, p);
      return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t);
    });
    commitPaths(updated);
  };

  // ── Cabinet LF for a highlight ────────────────────────────────────────────
  const getHighlightLf = (p) => {
    if (p.wallAngle !== undefined) return (p.widthIn / 12);
    const { wFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
    return parseFloat(wFt);
  };

  // ── Select + populate edit dims ───────────────────────────────────────────
  const selectItem = (idx) => {
    setSelectedIdx(idx);
    selectedIdxRef.current = idx;
    if (idx !== null) {
      const p = localPaths.current[idx];
      if (p?.type === "highlight") {
        if (p.wallAngle !== undefined) {
          // Wall-oriented — compute offset from wall p1
          const wall = p._wall ?? findNearestWallForPoint(p.anchorX, p.anchorY, localPaths.current, Infinity);
          let offsetIn = 0;
          if (wall) {
            const offsetPx = Math.hypot(p.anchorX - wall.wall.points[0].x, p.anchorY - wall.wall.points[0].y);
            offsetIn = Math.round((offsetPx / BASE_PX_PER_FOOT) * 12);
          }
          setEditDim({ w: p.widthIn, h: p.depthIn, len: "", angle: "", symW: "", offset: offsetIn });
        } else {
          const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
          setEditDim({ w: Math.round(parseFloat(wFt) * 12), h: Math.round(parseFloat(hFt) * 12), len: "", angle: "", symW: "", offset: "" });
        }
      } else if (p?.type === "line") {
        const lenFt = calcLineFt(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        const ang = calcAngle(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        setEditDim({ w: "", h: "", len: Math.round(parseFloat(lenFt) * 12), angle: ang, symW: "", offset: "" });
      } else if (p?.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
        const wIn = Math.round((p.widthPx / BASE_PX_PER_FOOT) * 12);
        setEditDim({ w: "", h: "", len: "", angle: "", symW: wIn, offset: "" });
      } else {
        setEditDim({ w: "", h: "", len: "", angle: "", symW: "", offset: "" });
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
        if (p.type === "highlight") moveState.current = { idx, origPath: JSON.parse(JSON.stringify(p)), startX: raw.x, startY: raw.y };
        else if (p.type === "line") moveState.current = { idx, origPath: { ...p, points: [...p.points] }, startX: raw.x, startY: raw.y };
        else if (p.type === "symbol") moveState.current = { idx, origPath: { ...p }, startX: raw.x, startY: raw.y };
      } else {
        selectItem(null); moveState.current = null;
      }
      return;
    }

    if (toolRef.current === "eraser") { eraseAt(raw); return; }

    if (toolRef.current === "symbol") {
      const sym = activeSymbolRef.current;
      if (sym) {
        const hasSizing = sym === "door" || sym === "window";
        const widthIn = hasSizing ? (symbolSizesRef.current[sym] || 32) : null;
        const widthPx = widthIn ? (widthIn / 12) * BASE_PX_PER_FOOT : null;
        const wallSnap = hasSizing ? findNearestWallForPoint(pos.x, pos.y, localPaths.current) : null;
        const newSym = {
          type: "symbol", symbolKey: sym,
          x: wallSnap ? wallSnap.projX : pos.x,
          y: wallSnap ? wallSnap.projY : pos.y,
          wallAngle: wallSnap ? wallSnap.wallAngle : 0,
          widthPx,
        };
        commitPaths([...localPaths.current, newSym]);
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
        if (p.wallAngle !== undefined) {
          // Move along wall
          const wallSnap = findNearestWallForPoint(p.anchorX + dx, p.anchorY + dy, localPaths.current, Infinity);
          if (wallSnap) {
            updated[idx] = { ...p, anchorX: wallSnap.projX, anchorY: wallSnap.projY, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side };
          } else {
            updated[idx] = { ...p, anchorX: p.anchorX + dx, anchorY: p.anchorY + dy };
          }
        } else {
          const sdx = snapToGrid(p.x1 + dx) - p.x1, sdy = snapToGrid(p.y1 + dy) - p.y1;
          updated[idx] = { ...p, x1: p.x1 + sdx, y1: p.y1 + sdy, x2: p.x2 + sdx, y2: p.y2 + sdy };
        }
      } else if (p.type === "line") {
        const sdx = snapToGrid(p.points[0].x + dx) - p.points[0].x;
        const sdy = snapToGrid(p.points[0].y + dy) - p.points[0].y;
        updated[idx] = { ...p, points: [{ x: p.points[0].x + sdx, y: p.points[0].y + sdy }, { x: p.points[1].x + sdx, y: p.points[1].y + sdy }] };
      } else if (p.type === "symbol") {
        const nx = snapToGrid(p.x + dx), ny = snapToGrid(p.y + dy);
        const hasSizing = p.symbolKey === "door" || p.symbolKey === "window";
        if (hasSizing) {
          const wallSnap = findNearestWallForPoint(nx, ny, localPaths.current);
          updated[idx] = wallSnap ? { ...p, x: wallSnap.projX, y: wallSnap.projY, wallAngle: wallSnap.wallAngle } : { ...p, x: nx, y: ny };
        } else {
          updated[idx] = { ...p, x: nx, y: ny };
        }
      }
      localPaths.current = updated; redrawCanvas(); return;
    }

    if (!isDrawing.current) return;
    if (toolRef.current === "eraser") { eraseAt(raw); return; }

    const isHL = toolRef.current === "highlight";
    const snapped = getSnappedPos(e, false, isHL);
    snapIndicator.current = { ...snapped, snapped: snapped.snapped };

    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      let ex = snapped.x, ey = snapped.y, snappedAngle = null;
      if (toolRef.current === "line") {
        const as = snapAngle(dragStart.current.x, dragStart.current.y, snapped.x, snapped.y);
        ex = as.x; ey = as.y; snappedAngle = as.snappedAngle;
      }
      setLiveAngle(snappedAngle);
      previewRef.current = { type: toolRef.current, x1: dragStart.current.x, y1: dragStart.current.y, x2: ex, y2: ey };
      redrawCanvas(previewRef.current); return;
    }
    if (toolRef.current === "pen") {
      localPaths.current[localPaths.current.length - 1]?.points?.push(snapped) ||
        (localPaths.current = [...localPaths.current, { type: "pen", points: [dragStart.current, snapped], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }]);
      scheduleRedraw();
    }
  };

  const onPointerUp = (e) => {
    snapIndicator.current = null; previewRef.current = null; setLiveAngle(null);

    if (toolRef.current === "select" && moveState.current) {
      isDrawing.current = false;
      const updated = [...localPaths.current];
      commitPaths(updated);
      const p = updated[moveState.current.idx];
      if (p?.type === "highlight") {
        if (p.wallAngle !== undefined) setEditDim(prev => ({ ...prev, w: p.widthIn, h: p.depthIn }));
        else { const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2); setEditDim(prev => ({ ...prev, w: Math.round(parseFloat(wFt)*12), h: Math.round(parseFloat(hFt)*12) })); }
      }
      moveState.current = null; scheduleRedraw(); return;
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
        commitPaths([...localPaths.current, { type: "line", points: [start, end], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }]);
      } else {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        const defaultDepthIn = activeHighlightRef.current === "base" ? 24 : activeHighlightRef.current === "upper" ? 14 : 12;
        // Try to snap to nearest wall for wall-oriented cabinet
        const wallSnap = findNearestWallForPoint(start.x, start.y, localPaths.current, 80);
        if (wallSnap) {
          const wPx = Math.hypot(snapped.x - start.x, snapped.y - start.y) || BASE_PX_PER_FOOT * 2;
          const widthIn = Math.round((wPx / BASE_PX_PER_FOOT) * 12);
          const newHL = {
            type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color,
            anchorX: wallSnap.projX, anchorY: wallSnap.projY,
            widthIn: widthIn > 0 ? widthIn : 24, depthIn: defaultDepthIn,
            wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side,
          };
          commitPaths([...localPaths.current, newHL]);
        } else {
          // No wall — fallback axis-aligned
          const depthPx = (defaultDepthIn / 12) * BASE_PX_PER_FOOT;
          commitPaths([...localPaths.current, { type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color, x1: start.x, y1: start.y, x2: snapped.x, y2: start.y + depthPx }]);
        }
      }
      scheduleRedraw(); return;
    }
    if (toolRef.current === "pen") { commitPaths([...localPaths.current]); }
  };

  // ── Notify parent ─────────────────────────────────────────────────────────
  const notifyHighlights = (allPaths) => {
    if (!onHighlightsChange) return;
    const highlights = allPaths.filter(p => p.type === "highlight").map(p => {
      const lf = getHighlightLf(p);
      const hFt = p.wallAngle !== undefined ? p.depthIn / 12 : parseFloat(calcRectFt(p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 0, p.y2 ?? 0).hFt);
      return { cabKey: p.cabKey, wFt: lf, hFt, lf, measureType: "lf", quantity: lf };
    });
    onHighlightsChange(highlights);
  };

  // ── Apply dimension edits ─────────────────────────────────────────────────
  const applyDimEdit = () => {
    if (selectedIdx === null) return;
    const p = localPaths.current[selectedIdx];
    if (!p) return;
    const updated = [...localPaths.current];

    if (p.type === "highlight") {
      const wIn = parseFloat(editDim.w), hIn = parseFloat(editDim.h);
      if (isNaN(wIn) || isNaN(hIn) || wIn <= 0 || hIn <= 0) return;
      if (p.wallAngle !== undefined) {
        // Wall-oriented resize, keep anchor
        updated[selectedIdx] = { ...p, widthIn: wIn, depthIn: hIn };
        // Apply offset if set
        const offsetIn = parseFloat(editDim.offset);
        if (!isNaN(offsetIn) && offsetIn >= 0) {
          const wallSnap = findNearestWallForPoint(p.anchorX, p.anchorY, localPaths.current, Infinity);
          if (wallSnap?.wall) {
            const [pw1] = wallSnap.wall.points;
            const ax = Math.cos(p.wallAngle), ay = Math.sin(p.wallAngle);
            const offsetPx = (offsetIn / 12) * BASE_PX_PER_FOOT;
            updated[selectedIdx] = { ...updated[selectedIdx], anchorX: pw1.x + ax * offsetPx, anchorY: pw1.y + ay * offsetPx };
          }
        }
      } else {
        // Legacy axis-aligned: resize
        const wPx = (wIn / 12) * BASE_PX_PER_FOOT, hPx = (hIn / 12) * BASE_PX_PER_FOOT;
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        updated[selectedIdx] = { ...p, x1: rx, y1: ry, x2: rx + wPx, y2: ry + hPx };
      }
    } else if (p.type === "line") {
      const newLen = (parseFloat(editDim.len) / 12) * BASE_PX_PER_FOOT;
      if (!newLen || newLen <= 0) return;
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
    commitPaths(updated);
  };

  const deleteSelected = () => {
    if (selectedIdx === null) return;
    commitPaths(localPaths.current.filter((_, i) => i !== selectedIdx));
    selectItem(null);
  };

  const selectedPath = selectedIdx !== null ? localPaths.current[selectedIdx] : null;
  const selectedHasWall = selectedPath?.type === "highlight" && selectedPath.wallAngle !== undefined;

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
    if (e.touches.length === 2) lastPinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      changeZoom((newDist - lastPinchDist.current) / 200);
      lastPinchDist.current = newDist;
    }
  };
  const onTouchEnd = () => { lastPinchDist.current = null; };

  const toolBtn = (t, label, icon, activeColor) => (
    <button onPointerDown={(e) => { e.stopPropagation(); setTool(t); }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all touch-manipulation ${tool === t ? `${activeColor} text-white border-transparent` : "bg-white text-slate-600 border-slate-200"}`}>
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
            className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all touch-manipulation ${tool === "highlight" && activeHighlight === h.key ? "border-slate-700 shadow-md" : "border-transparent"}`}
            style={{ backgroundColor: h.fillColor, color: h.color }}>
            {h.label}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-300 mx-0.5" />
        {SYMBOLS.map(sym => (
          <button key={sym.key}
            onPointerDown={(e) => { e.stopPropagation(); setTool("symbol"); setActiveSymbol(sym.key); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all touch-manipulation ${tool === "symbol" && activeSymbol === sym.key ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200"}`}>
            <SymbolIcon symbolKey={sym.key} size={22} />
            {sym.label}
          </button>
        ))}
        {tool === "symbol" && (activeSymbol === "door" || activeSymbol === "window") && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs text-slate-500">Size:</span>
            <input type="number" step="1" value={symbolSizes[activeSymbol] || ""}
              onChange={e => setSymbolSizes(prev => ({ ...prev, [activeSymbol]: parseFloat(e.target.value) || 0 }))}
              className="w-14 h-8 text-xs border border-indigo-300 rounded-lg px-2 bg-white"
              onPointerDown={e => e.stopPropagation()} />
            <span className="text-xs text-slate-500">in</span>
          </div>
        )}
        <div className="w-px h-6 bg-slate-300 mx-0.5 ml-auto" />
        <button onPointerDown={(e) => { e.stopPropagation(); changeZoom(0.2); }} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 touch-manipulation"><ZoomIn className="w-4 h-4" /></button>
        <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onPointerDown={(e) => { e.stopPropagation(); changeZoom(-0.2); }} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 touch-manipulation"><ZoomOut className="w-4 h-4" /></button>
      </div>

      {/* Toolbar Row 2 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 flex-wrap">
        <div className="flex gap-1.5 items-center">
          {Object.entries(THICKNESS).map(([key, val]) => (
            <button key={key} onPointerDown={(e) => { e.stopPropagation(); setThickness(key); }}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border touch-manipulation ${thickness === key ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="rounded-full bg-slate-700" style={{ width: Math.min(val * 2.5, 14), height: Math.min(val * 2.5, 14) }} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button key={c} onPointerDown={(e) => { e.stopPropagation(); setColor(c); if (!["eraser","highlight","symbol"].includes(tool)) setTool("line"); }}
              className="rounded-full touch-manipulation" style={{ backgroundColor: c, width: 24, height: 24, border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onPointerDown={(e) => { e.stopPropagation(); undo(); }}
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 touch-manipulation" title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onPointerDown={(e) => { e.stopPropagation(); redo(); }}
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 touch-manipulation" title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
          <button onPointerDown={(e) => { e.stopPropagation(); commitPaths([]); selectItem(null); }}
            className="w-9 h-9 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-500 touch-manipulation" title="Clear all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit bar — highlight selected */}
      {selectedPath?.type === "highlight" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800">Cabinet:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="0.5" inputMode="decimal"
            className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.w}
            onChange={e => setEditDim(prev => ({ ...prev, w: e.target.value }))}
            onPointerDown={e => e.stopPropagation()} />
          <label className="text-xs text-slate-600">Depth (in)</label>
          <input type="number" step="0.5" inputMode="decimal"
            className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.h}
            onChange={e => setEditDim(prev => ({ ...prev, h: e.target.value }))}
            onPointerDown={e => e.stopPropagation()} />
          {selectedHasWall && (
            <>
              <label className="text-xs text-slate-600">Offset from wall start (in)</label>
              <input type="number" step="0.5" inputMode="decimal"
                className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
                value={editDim.offset}
                onChange={e => setEditDim(prev => ({ ...prev, offset: e.target.value }))}
                onPointerDown={e => e.stopPropagation()} />
            </>
          )}
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg touch-manipulation">Apply</button>
          <span className="text-xs text-slate-500">{editDim.w}" = {((parseFloat(editDim.w)||0)/12).toFixed(2)} LF</span>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg touch-manipulation">✕</button>
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
            onChange={e => setEditDim(prev => ({ ...prev, len: e.target.value }))}
            onPointerDown={e => e.stopPropagation()} />
          <label className="text-xs text-slate-600">Angle (°)</label>
          <input type="number" step="1" inputMode="decimal"
            className="w-16 h-8 text-sm border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.angle}
            onChange={e => setEditDim(prev => ({ ...prev, angle: e.target.value }))}
            onPointerDown={e => e.stopPropagation()} />
          <span className="text-xs text-slate-500">{editDim.len}" = {((parseFloat(editDim.len)||0)/12).toFixed(2)} LF</span>
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg touch-manipulation">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg touch-manipulation">✕</button>
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
            onChange={e => setEditDim(prev => ({ ...prev, symW: e.target.value }))}
            onPointerDown={e => e.stopPropagation()} />
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg touch-manipulation">Apply</button>
          <span className="text-xs text-slate-500">{editDim.symW}" = {((parseFloat(editDim.symW)||0)/12).toFixed(2)} ft</span>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg touch-manipulation">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg touch-manipulation">✕</button>
        </div>
      )}

      {liveAngle !== null && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border-b border-blue-200">
          <span className="text-xs font-semibold text-blue-700">⟳ Snapped to {liveAngle}°</span>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="overflow-auto bg-white" style={{ maxHeight: 480 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: "relative", flexShrink: 0 }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{
              cursor: tool === "eraser" ? "cell" : tool === "symbol" ? "copy" : tool === "select" ? "pointer" : "crosshair",
              touchAction: "none", display: "block", width: CANVAS_W * zoom, height: CANVAS_H * zoom,
            }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 items-center">
        {CAB_HIGHLIGHTS.map(h => {
          const hls = (paths || []).filter(p => p.type === "highlight" && p.cabKey === h.key);
          if (!hls.length) return null;
          const totalLf = hls.reduce((s, p) => s + getHighlightLf(p), 0);
          return (
            <span key={h.key} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: h.fillColor, color: h.color }}>
              {h.label}: {Math.round(totalLf * 12)}" ({totalLf.toFixed(1)} LF)
            </span>
          );
        })}
        <span className="text-xs text-slate-400 ml-auto">🟡 snap &nbsp;⚫ grid</span>
      </div>
    </div>
  );
}