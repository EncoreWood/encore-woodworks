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
  { key: "rollout",  label: "Rollout", isInsert: true },
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
      // Simple opening symbol
      ctx.fillStyle = "#374151"; ctx.fillRect(cx - s, cy - 2, s * 0.18, 5); ctx.fillRect(cx + s * 0.82, cy - 2, s * 0.18, 5);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - s * 0.82, cy - 3, s * 1.64, 7);
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.82, cy - 3); ctx.lineTo(cx + s * 0.82, cy - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.82, cy + 3); ctx.lineTo(cx + s * 0.82, cy + 3); ctx.stroke();
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

// ── Draw door: simple opening with "Doorway" label ────────────────────────────
function drawDoorSymbol(ctx, sym, lw) {
  const { widthPx } = sym;
  const wt = 5 * lw;
  const w = widthPx;

  // Wall caps (solid black blocks)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, -wt * 1.5, wt * 2.2, wt * 3);
  ctx.fillRect(w - wt * 2.2, -wt * 1.5, wt * 2.2, wt * 3);
  // White gap (the opening)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(wt * 2.2, -wt * 2, w - wt * 4.4, wt * 4);
  // Dashed border around opening to indicate door
  ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5 * lw;
  ctx.setLineDash([4 * lw, 3 * lw]);
  ctx.strokeRect(wt * 2.2, -wt * 2, w - wt * 4.4, wt * 4);
  ctx.setLineDash([]);

  // "Doorway" label centered in opening
  const wIn = Math.round((w / BASE_PX_PER_FOOT) * 12);
  ctx.fillStyle = "#7c3aed";
  ctx.font = `bold ${9 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`Doorway ${wIn}"`, w / 2, 0);
}

// ── Draw window ───────────────────────────────────────────────────────────────
function drawWindowSymbol(ctx, sym, lw) {
  const { widthPx } = sym;
  const wt = 5 * lw;
  const w = widthPx;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, -wt * 1.5, wt * 2, wt * 3);
  ctx.fillRect(w - wt * 2, -wt * 1.5, wt * 2, wt * 3);
  ctx.fillStyle = "rgba(186,230,253,0.5)"; ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 2 * lw;
  const gx = wt * 2, gw = w - wt * 4;
  ctx.fillRect(gx, -wt * 1.2, gw, wt * 2.4);
  ctx.strokeRect(gx, -wt * 1.2, gw, wt * 2.4);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(gx, i * wt * 0.35); ctx.lineTo(gx + gw, i * wt * 0.35); ctx.stroke();
  }
  const wIn = Math.round((w / BASE_PX_PER_FOOT) * 12);
  ctx.fillStyle = "#0ea5e9"; ctx.font = `bold ${10 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(`${wIn}"`, w / 2, -wt * 2.5);
}

// ── Draw symbol on main canvas ────────────────────────────────────────────────
function drawSymbol(ctx, sym, zoom) {
  const lw = 1 / zoom;
  ctx.save();
  if (sym.symbolKey === "rollout") {
    // Draw rollout/insert with arrow pointing to target
    const { x, y, label, targetX, targetY } = sym;
    const fontSize = 11 * lw;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Draw label box
    const textMetrics = ctx.measureText(label || "Rollout");
    const boxW = textMetrics.width + 8 * lw;
    const boxH = fontSize + 4 * lw;
    ctx.fillStyle = "rgba(217, 119, 6, 0.15)";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.5 * lw;
    ctx.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
    ctx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
    
    // Draw label text
    ctx.fillStyle = "#d97706";
    ctx.fillText(label || "Rollout", x, y);
    
    // Draw arrow to target or default downward
    const arrowStartY = y + boxH / 2 + 4 * lw;
    const endX = targetX ?? x;
    const endY = targetY ?? (arrowStartY + 30 * lw);
    const dx = endX - x;
    const dy = endY - arrowStartY;
    const dist = Math.hypot(dx, dy);
    const arrowHeadLen = 12 * lw;
    
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2 * lw;
    ctx.beginPath();
    ctx.moveTo(x, arrowStartY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Arrowhead
    if (dist > 0) {
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - arrowHeadLen * Math.cos(angle - Math.PI / 6), endY - arrowHeadLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - arrowHeadLen * Math.cos(angle + Math.PI / 6), endY - arrowHeadLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  } else if (sym.symbolKey === "door" || sym.symbolKey === "window") {
    const { anchorX, anchorY, wallAngle = 0 } = sym;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(wallAngle);
    if (sym.symbolKey === "door") drawDoorSymbol(ctx, sym, lw);
    else drawWindowSymbol(ctx, sym, lw);
  } else {
    // Outlet / switch / plumbing — may be wall-mounted (anchorX) or free-standing (x, y)
    const isWallMounted = sym.anchorX !== undefined;
    const px = isWallMounted ? sym.anchorX : sym.x;
    const py = isWallMounted ? sym.anchorY : sym.y;
    const wallAngle = sym.wallAngle || 0;
    ctx.translate(px, py);
    ctx.rotate(wallAngle);
    const s = 14 * lw;

    if (sym.symbolKey === "outlet") {
      ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#dbeafe";
      ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.3, 0, s * 0.22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.22, 0, Math.PI * 2); ctx.stroke();
    } else if (sym.symbolKey === "switch") {
      ctx.strokeStyle = "#065f46"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#d1fae5";
      ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#065f46"; ctx.font = `bold ${s * 1.1}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("S", 0, 0);
    } else if (sym.symbolKey === "plumbing") {
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2 * lw; ctx.fillStyle = "#eff6ff";
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.65); ctx.lineTo(0, s * 0.65); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.65, 0); ctx.lineTo(s * 0.65, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // If wall-mounted: draw a small stem to the wall and show elevation/offset labels
    if (isWallMounted) {
      ctx.strokeStyle = "#64748b"; ctx.lineWidth = 1.5 * lw; ctx.setLineDash([3 * lw, 2 * lw]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 1.4); ctx.stroke(); ctx.setLineDash([]);
      // Labels below the icon (in rotated space, positive Y = toward room)
      const labelY = s * 2.4;
      ctx.fillStyle = "#334155"; ctx.font = `${9 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const parts = [];
      if (sym.elevationIn) parts.push(`↕${sym.elevationIn}"`);
      if (sym.offsetIn !== undefined) parts.push(`${sym.offsetFromEnd === "right" ? "←" : "→"}${sym.offsetIn}"`);
      if (parts.length) ctx.fillText(parts.join("  "), 0, labelY);
    }
  }
  ctx.restore();
}

// ── Draw highlight cabinet ─────────────────────────────────────────────────────
function drawHighlight(ctx, path, isSelected, zoom) {
  const hl = CAB_HIGHLIGHTS.find(h => h.key === path.cabKey);
  if (!hl) return;
  const lw = 1 / zoom;

  if (path.wallAngle === undefined) {
    const { x1, y1, x2, y2 } = path;
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
    ctx.save();
    ctx.fillStyle = hl.fillColor; ctx.strokeStyle = hl.color; ctx.lineWidth = 2 * lw;
    ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh);
    const { wFt, hFt } = calcRectFt(x1, y1, x2, y2);
    ctx.fillStyle = hl.color; ctx.font = `bold ${12 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (rw > 30 * lw && rh > 14 * lw) ctx.fillText(`${hl.label} ${ftToFtIn(wFt)} × ${ftToFtIn(hFt)}`, rx + rw / 2, ry + rh / 2);
    if (isSelected) {
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5 * lw; ctx.setLineDash([5 * lw, 3 * lw]);
      ctx.strokeRect(rx - 2 * lw, ry - 2 * lw, rw + 4 * lw, rh + 4 * lw); ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }

  const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = path;
  const wPx = (widthIn / 12) * BASE_PX_PER_FOOT;
  const dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
  const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
  // Cabinet extends AWAY from the measurement label side.
  // Measurements are drawn on the negative-normal side of the wall.
  // So cabinet must extend on the positive-normal side relative to wallSide.
  // wallSide = which side of the wall the user tapped from (the room interior).
  // We negate so the cabinet goes INTO the room (opposite from the outside/measurement side).
  const nx = Math.sin(wallAngle) * wallSide, ny = -Math.cos(wallAngle) * wallSide;
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
  const ccx = (c0.x + c1.x + c2.x + c3.x) / 4, ccy = (c0.y + c1.y + c2.y + c3.y) / 4;
  ctx.save(); ctx.translate(ccx, ccy); ctx.rotate(wallAngle);
  ctx.fillStyle = hl.color; ctx.font = `bold ${11 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${hl.label} ${widthIn}" × ${depthIn}"`, 0, 0);
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
        const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = p;
        const wPx = (widthIn / 12) * BASE_PX_PER_FOOT, dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
        const ax = Math.cos(wallAngle), ay = Math.sin(wallAngle);
        const nx = Math.sin(wallAngle) * wallSide, ny = -Math.cos(wallAngle) * wallSide;
        pts.push({ x: anchorX, y: anchorY }, { x: anchorX + ax * wPx, y: anchorY + ay * wPx },
          { x: anchorX + ax * wPx + nx * dPx, y: anchorY + ay * wPx + ny * dPx },
          { x: anchorX + nx * dPx, y: anchorY + ny * dPx });
      } else {
        const { x1, y1, x2, y2 } = p;
        pts.push({ x: Math.min(x1,x2), y: Math.min(y1,y2) }, { x: Math.max(x1,x2), y: Math.min(y1,y2) },
          { x: Math.min(x1,x2), y: Math.max(y1,y2) }, { x: Math.max(x1,x2), y: Math.max(y1,y2) });
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

function calcAngle(x1, y1, x2, y2) { return Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI); }
function calcLineFt(x1, y1, x2, y2) { return (Math.hypot(x2 - x1, y2 - y1) / BASE_PX_PER_FOOT).toFixed(2); }
function calcRectFt(x1, y1, x2, y2) {
  const wFt = (Math.abs(x2 - x1) / BASE_PX_PER_FOOT).toFixed(2);
  const hFt = (Math.abs(y2 - y1) / BASE_PX_PER_FOOT).toFixed(2);
  return { wFt, hFt, lf: (parseFloat(wFt) + parseFloat(hFt)).toFixed(2) };
}
function ftToFtIn(decFt) { return `${Math.round(parseFloat(decFt) * 12)}"`; }

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
  const side = ((y - p1.y) * nx - (x - p1.x) * ny) >= 0 ? 1 : -1;
  return { projX: best.projX, projY: best.projY, wallAngle, side, wall: best.wall, t: best.t, wallLen: Math.hypot(p2.x - p1.x, p2.y - p1.y) };
}

// Check if a point (mx, my) is covered by any door/window symbol on a wall
function isMeasurementCoveredBySymbol(mx, my, wallAngle, paths) {
  const wallSymbols = paths.filter(p => p.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window") && p.anchorX !== undefined);
  for (const sym of wallSymbols) {
    // Transform measurement point into symbol local space
    const dx = mx - sym.anchorX, dy = my - sym.anchorY;
    const lx = dx * Math.cos(-sym.wallAngle) - dy * Math.sin(-sym.wallAngle);
    if (lx >= 0 && lx <= sym.widthPx) return true;
  }
  return false;
}

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

function drawOnePath(ctx, path, isSelected, zoom, allPaths) {
  const lw = 1 / zoom;
  if (path.type === "symbol") {
    drawSymbol(ctx, path, zoom);
    if (isSelected) {
      ctx.save();
      if (path.symbolKey === "door" || path.symbolKey === "window") {
        ctx.translate(path.anchorX, path.anchorY); ctx.rotate(path.wallAngle || 0);
        const w = path.widthPx, hh = 20 * lw;
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
        ctx.strokeRect(-4 * lw, -hh, w + 8 * lw, hh * 2); ctx.setLineDash([]);
      } else {
        ctx.translate(path.x, path.y);
        const s = 18 * lw;
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
        ctx.strokeRect(-s, -s, s * 2, s * 2); ctx.setLineDash([]);
      }
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

    // Wall measurement label — offset if covered by door/window
    const ft = calcLineFt(p1.x, p1.y, p2.x, p2.y);
    const angle = calcAngle(p1.x, p1.y, p2.x, p2.y);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const wallAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const covered = allPaths && isMeasurementCoveredBySymbol(mx, my, wallAngle, allPaths);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(wallAngle);
    ctx.fillStyle = "#1e293b";
    ctx.font = `bold ${11 * lw}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";

    const labelOffset = covered ? -28 * lw : -4 * lw;
    if (covered) {
      // Draw arrow pointing to wall
      ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.5 * lw;
      ctx.beginPath(); ctx.moveTo(0, labelOffset + 2 * lw); ctx.lineTo(0, -1 * lw); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3 * lw, -6 * lw); ctx.lineTo(0, -1 * lw); ctx.lineTo(3 * lw, -6 * lw); ctx.stroke();
    }
    ctx.fillText(`${ftToFtIn(ft)}  (${ft} LF)  ${angle}°`, 0, labelOffset);
    ctx.restore();
    return;
  }
  if (path.type === "pen" && path.points?.length > 1) {
    // Pen = annotation: always slightly transparent, no snapping
    ctx.strokeStyle = path.color;
    ctx.lineWidth = (path.lineWidth || 1.5) * lw;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    path.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function hitTestHighlight(pos, path) {
  if (path.wallAngle === undefined) {
    const rx = Math.min(path.x1, path.x2), ry = Math.min(path.y1, path.y2);
    const rw = Math.abs(path.x2 - path.x1), rh = Math.abs(path.y2 - path.y1);
    return pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh;
  }
  const { anchorX, anchorY, widthIn, depthIn, wallAngle, wallSide } = path;
  const wPx = (widthIn / 12) * BASE_PX_PER_FOOT, dPx = (depthIn / 12) * BASE_PX_PER_FOOT;
  const dx = pos.x - anchorX, dy = pos.y - anchorY;
  // Along-wall component
  const lx = dx * Math.cos(wallAngle) + dy * Math.sin(wallAngle);
  // Cross-wall component in cabinet's depth direction (using corrected normal)
  const nx = Math.sin(wallAngle) * wallSide, ny = -Math.cos(wallAngle) * wallSide;
  const ly = dx * nx + dy * ny;
  return lx >= -4 && lx <= wPx + 4 && ly >= -4 && ly <= dPx + 4;
}

function hitTestWallSymbol(pos, sym) {
  const { anchorX, anchorY, wallAngle = 0, widthPx } = sym;
  const dx = pos.x - anchorX, dy = pos.y - anchorY;
  const lx = dx * Math.cos(-wallAngle) - dy * Math.sin(-wallAngle);
  const ly = dx * Math.sin(-wallAngle) + dy * Math.cos(-wallAngle);
  return lx >= -8 && lx <= widthPx + 8 && Math.abs(ly) < 28;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RoomSketch({ paths, onPathsChange, onHighlightsChange, sketchId, ceilingHeight, onCeilingHeightChange, catalogItems = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState("line");
  const [color, setColor] = useState("#1e1e1e");
  const [thickness, setThickness] = useState("medium");
  const [activeHighlight, setActiveHighlight] = useState("base");
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [activeRollout, setActiveRollout] = useState(null);
  const [symbolSizes, setSymbolSizes] = useState({ door: 32, window: 36 });
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [editDim, setEditDim] = useState({ w: "", h: "", len: "", angle: "", symW: "", offset: "", elevation: "", offsetFromEnd: "left", label: "", targetX: undefined, targetY: undefined });
  const [liveAngle, setLiveAngle] = useState(null);
  const [placeRolloutMode, setPlaceRolloutMode] = useState(false);

  const history = useRef([[]]);
  const historyIdx = useRef(0);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const activeHighlightRef = useRef(activeHighlight);
  const activeSymbolRef = useRef(activeSymbol);
  const activeRolloutRef = useRef(activeRollout);
  const symbolSizesRef = useRef(symbolSizes);
  const selectedIdxRef = useRef(selectedIdx);
  const zoomRef = useRef(zoom);
  const placeRolloutModeRef = useRef(placeRolloutMode);

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
  useEffect(() => { activeRolloutRef.current = activeRollout; }, [activeRollout]);
  useEffect(() => { symbolSizesRef.current = symbolSizes; }, [symbolSizes]);
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { placeRolloutModeRef.current = placeRolloutMode; }, [placeRolloutMode]);
  useEffect(() => {
    // On initial load with paths prop, use that instead of localStorage
    if (paths && paths.length > 0) {
      localPaths.current = paths;
    } else if (!localPaths.current.length && sketchId) {
      // Only load from localStorage if no paths prop and no prior paths
      try { const saved = JSON.parse(localStorage.getItem(`sketch_${sketchId}`) || "null"); if (saved) localPaths.current = saved; } catch(e) {}
    }
    scheduleRedraw();
  }, [paths, sketchId]);

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = (newPaths) => {
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(JSON.parse(JSON.stringify(newPaths)));
    historyIdx.current = history.current.length - 1;
  };

  const commitPaths = (newPaths) => {
    localPaths.current = newPaths;
    pushHistory(newPaths);
    // Auto-save sketch to localStorage for crash recovery
    if (sketchId) {
      try { localStorage.setItem(`sketch_${sketchId}`, JSON.stringify(newPaths)); } catch(e) {}
    }
    onPathsChange(newPaths);
    notifyHighlights(newPaths);
    scheduleRedraw();
  };

  const undo = () => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const prev = history.current[historyIdx.current];
    localPaths.current = prev; onPathsChange(prev); notifyHighlights(prev); selectItem(null); scheduleRedraw();
  };

  const redo = () => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    const next = history.current[historyIdx.current];
    localPaths.current = next; onPathsChange(next); notifyHighlights(next); selectItem(null); scheduleRedraw();
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
    const allPaths = localPaths.current;
    allPaths.forEach((path, idx) => drawOnePath(ctx, path, idx === selectedIdxRef.current, 1, allPaths));
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
         if (p.anchorX !== undefined) {
           if ((p.symbolKey === "door" || p.symbolKey === "window") ? hitTestWallSymbol(pos, p) : Math.hypot(pos.x - p.anchorX, pos.y - p.anchorY) < 28)
             return i;
         } else if (p.x !== undefined) {
           if (Math.hypot(pos.x - p.x, pos.y - p.y) < 28) return i;
           // Check if clicking on rollout arrow endpoint
           if (p.symbolKey === "rollout") {
             const endX = p.targetX ?? p.x;
             const endY = p.targetY ?? (p.y + 40);
             if (Math.hypot(pos.x - endX, pos.y - endY) < 20) return i;
           }
         }
       }
    }
    return null;
  };

  const eraseAt = (pos) => {
    const updated = localPaths.current.filter(p => {
      if (p.type === "symbol") {
        if ((p.symbolKey === "door" || p.symbolKey === "window") && p.anchorX !== undefined)
          return !hitTestWallSymbol(pos, p);
        return Math.hypot(p.x - pos.x, p.y - pos.y) > 28;
      }
      if (p.type === "highlight") return !hitTestHighlight(pos, p);
      if (p.type === "pen") return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 20);
      return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 18);
    });
    commitPaths(updated);
  };

  const getHighlightLf = (p) => {
    if (p.wallAngle !== undefined) return p.widthIn / 12;
    const { wFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
    return parseFloat(wFt);
  };

  const getWallOffset = (sym) => {
    if (!sym.anchorX && sym.anchorX !== 0) return 0;
    const wallSnap = findNearestWallForPoint(sym.anchorX, sym.anchorY, localPaths.current, Infinity);
    if (!wallSnap?.wall) return 0;
    const p1 = wallSnap.wall.points[0];
    return Math.round((Math.hypot(sym.anchorX - p1.x, sym.anchorY - p1.y) / BASE_PX_PER_FOOT) * 12);
  };

  const selectItem = (idx) => {
    setSelectedIdx(idx);
    selectedIdxRef.current = idx;
    if (idx !== null) {
      const p = localPaths.current[idx];
      if (p?.type === "highlight") {
        if (p.wallAngle !== undefined) {
          const wall = findNearestWallForPoint(p.anchorX, p.anchorY, localPaths.current, Infinity);
          let offsetIn = 0;
          if (wall?.wall) {
            offsetIn = Math.round((Math.hypot(p.anchorX - wall.wall.points[0].x, p.anchorY - wall.wall.points[0].y) / BASE_PX_PER_FOOT) * 12);
          }
          setEditDim({ w: p.widthIn, h: p.depthIn, len: "", angle: "", symW: "", offset: offsetIn });
        } else {
          const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
          setEditDim({ w: Math.round(parseFloat(wFt)*12), h: Math.round(parseFloat(hFt)*12), len: "", angle: "", symW: "", offset: "" });
        }
      } else if (p?.type === "line") {
        const lenFt = calcLineFt(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        const ang = calcAngle(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
        setEditDim({ w: "", h: "", len: Math.round(parseFloat(lenFt)*12), angle: ang, symW: "", offset: "" });
      } else if (p?.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
        const wIn = Math.round((p.widthPx / BASE_PX_PER_FOOT) * 12);
        setEditDim({ w: "", h: "", len: "", angle: "", symW: wIn, offset: getWallOffset(p), elevation: "", offsetFromEnd: "left" });
      } else if (p?.type === "symbol" && p.anchorX !== undefined) {
        // Wall-mounted outlet/switch/plumbing
        setEditDim({ w: "", h: "", len: "", angle: "", symW: "", offset: p.offsetIn ?? getWallOffset(p), elevation: p.elevationIn ?? 48, offsetFromEnd: p.offsetFromEnd || "left" });
      } else if (p?.type === "symbol" && p.symbolKey === "rollout") {
        // Rollout/insert item
        setEditDim({ w: "", h: "", len: "", angle: "", symW: "", offset: "", elevation: "", label: p.label || "" });
      } else {
        setEditDim({ w: "", h: "", len: "", angle: "", symW: "", offset: "", elevation: "", offsetFromEnd: "left" });
      }
    }
    scheduleRedraw();
  };

  // ── Pointer events ────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    // Don't prevent default on select/dropdown interactions
    if (e.target.tagName !== "SELECT") e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    isDrawing.current = true;
    const raw = getRawPos(e);
    const pos = getSnappedPos(e, true, false);

    // Rollout placement takes priority over select tool
    if (placeRolloutModeRef.current && activeRolloutRef.current) {
      const rollout = activeRolloutRef.current;
      const newSym = { type: "symbol", symbolKey: "rollout", x: pos.x, y: pos.y, label: rollout.name, targetX: pos.x, targetY: pos.y + 40 };
      commitPaths([...localPaths.current, newSym]);
      isDrawing.current = false;
      setTool("select");
      setPlaceRolloutMode(false);
      setActiveRollout(null);
      return;
    }
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
        const isWallSym = sym === "door" || sym === "window";
        const isInsert = sym === "rollout";
        const widthIn = isWallSym ? (symbolSizesRef.current[sym] || 32) : null;
        const widthPx = widthIn ? (widthIn / 12) * BASE_PX_PER_FOOT : null;
        const wallSnap = findNearestWallForPoint(pos.x, pos.y, localPaths.current);
        let newSym;
        if (isWallSym && wallSnap) {
          newSym = { type: "symbol", symbolKey: sym, anchorX: wallSnap.projX, anchorY: wallSnap.projY, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side, widthPx };
        } else if (!isWallSym && wallSnap && !isInsert) {
          const wallLen = wallSnap.wallLen;
          const offsetPx = wallSnap.t * wallLen;
          const offsetIn = Math.round((offsetPx / BASE_PX_PER_FOOT) * 12);
          newSym = { type: "symbol", symbolKey: sym, anchorX: wallSnap.projX, anchorY: wallSnap.projY, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side, offsetIn, offsetFromEnd: "left", elevationIn: 48 };
        } else if (isInsert) {
          newSym = { type: "symbol", symbolKey: sym, x: pos.x, y: pos.y, label: "", targetX: undefined, targetY: undefined };
        } else {
          newSym = { type: "symbol", symbolKey: sym, x: pos.x, y: pos.y, wallAngle: 0, widthPx };
        }
        commitPaths([...localPaths.current, newSym]);
      }
      isDrawing.current = false;
      setTool("select");
      return;
    }
    // Pen: free-form annotation, no snap to grid
    if (toolRef.current === "pen") {
      const rawPos = getRawPos(e);
      localPaths.current = [...localPaths.current, { type: "pen", points: [rawPos], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }];
      scheduleRedraw(); return;
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
      if (p.type === "symbol" && p.symbolKey === "rollout") {
        // Always drag the endpoint, label stays fixed
        const endX = p.targetX || p.x;
        const endY = p.targetY || (p.y + 40);
        updated[idx] = { ...p, targetX: endX + dx, targetY: endY + dy };
      } else if (p.type === "highlight") {
        if (p.wallAngle !== undefined) {
          // Use current raw cursor position to find nearest wall — allows dragging to a different wall
          const wallSnap = findNearestWallForPoint(raw.x, raw.y, localPaths.current, 80);
          updated[idx] = wallSnap
            ? { ...p, anchorX: wallSnap.projX, anchorY: wallSnap.projY, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side }
            : { ...p, anchorX: p.anchorX + dx, anchorY: p.anchorY + dy };
        } else {
          const sdx = snapToGrid(p.x1 + dx) - p.x1, sdy = snapToGrid(p.y1 + dy) - p.y1;
          updated[idx] = { ...p, x1: p.x1 + sdx, y1: p.y1 + sdy, x2: p.x2 + sdx, y2: p.y2 + sdy };
        }
      } else if (p.type === "line") {
        const sdx = snapToGrid(p.points[0].x + dx) - p.points[0].x;
        const sdy = snapToGrid(p.points[0].y + dy) - p.points[0].y;
        updated[idx] = { ...p, points: [{ x: p.points[0].x + sdx, y: p.points[0].y + sdy }, { x: p.points[1].x + sdx, y: p.points[1].y + sdy }] };
      } else if (p.type === "symbol") {
        if (p.anchorX !== undefined) {
          // Wall-mounted symbol (doors, windows, outlets, switches, plumbing)
          const wallSnap = findNearestWallForPoint(raw.x, raw.y, localPaths.current, 80);
          if (wallSnap) {
            const offsetPx = wallSnap.t * wallSnap.wallLen;
            const offsetIn = Math.round((offsetPx / BASE_PX_PER_FOOT) * 12);
            updated[idx] = { ...p, anchorX: wallSnap.projX, anchorY: wallSnap.projY, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side, ...(p.offsetIn !== undefined ? { offsetIn } : {}) };
          } else {
            updated[idx] = { ...p, anchorX: p.anchorX + dx, anchorY: p.anchorY + dy };
          }
        } else {
          updated[idx] = { ...p, x: snapToGrid(p.x + dx), y: snapToGrid(p.y + dy) };
        }
      }
      localPaths.current = updated; redrawCanvas(); return;
    }

    if (!isDrawing.current) return;
    if (toolRef.current === "eraser") { eraseAt(raw); return; }
    // Pen: push raw point (no snapping for annotation)
    if (toolRef.current === "pen") {
      const last = localPaths.current[localPaths.current.length - 1];
      if (last?.type === "pen") { last.points.push(getRawPos(e)); scheduleRedraw(); }
      return;
    }
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
      redrawCanvas(previewRef.current);
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
      } else if (p?.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
        setEditDim(prev => ({ ...prev, offset: getWallOffset(p) }));
      }
      moveState.current = null; scheduleRedraw(); return;
    }
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Pen: commit on up, then switch to select
    if (toolRef.current === "pen") { commitPaths([...localPaths.current]); setTool("select"); return; }
    const snapped = getSnappedPos(e, false, toolRef.current === "highlight");
    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      const start = dragStart.current; dragStart.current = null;
      if (Math.hypot(snapped.x - start.x, snapped.y - start.y) < 4) { scheduleRedraw(); return; }
      if (toolRef.current === "line") {
        const as = snapAngle(start.x, start.y, snapped.x, snapped.y);
        const end = as.snappedAngle !== null ? { x: as.x, y: as.y } : { x: snapped.x, y: snapped.y };
        commitPaths([...localPaths.current, { type: "line", points: [start, end], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }]);
        // Wall tool stays active (don't switch to select)
      } else {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        const defaultDepthIn = activeHighlightRef.current === "base" ? 24 : activeHighlightRef.current === "upper" ? 14 : 12;
        const wallSnap = findNearestWallForPoint(start.x, start.y, localPaths.current, 80);
        if (wallSnap) {
          const wPx = Math.hypot(snapped.x - start.x, snapped.y - start.y) || BASE_PX_PER_FOOT * 2;
          const widthIn = Math.round((wPx / BASE_PX_PER_FOOT) * 12);
          commitPaths([...localPaths.current, { type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color, anchorX: wallSnap.projX, anchorY: wallSnap.projY, widthIn: widthIn > 0 ? widthIn : 24, depthIn: defaultDepthIn, wallAngle: wallSnap.wallAngle, wallSide: wallSnap.side }]);
        } else {
          const depthPx = (defaultDepthIn / 12) * BASE_PX_PER_FOOT;
          commitPaths([...localPaths.current, { type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color, x1: start.x, y1: start.y, x2: snapped.x, y2: start.y + depthPx }]);
        }
        setTool("select");
      }
      scheduleRedraw();
    }
  };

  const notifyHighlights = (allPaths) => {
    if (!onHighlightsChange) return;
    const highlights = allPaths.filter(p => p.type === "highlight").map(p => {
      const lf = getHighlightLf(p);
      const hFt = p.wallAngle !== undefined ? p.depthIn / 12 : parseFloat(calcRectFt(p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 0, p.y2 ?? 0).hFt);
      return { cabKey: p.cabKey, wFt: lf, hFt, lf, measureType: "lf", quantity: lf };
    });
    onHighlightsChange(highlights);
  };

  const applyDimEdit = () => {
    if (selectedIdx === null) return;
    const p = localPaths.current[selectedIdx];
    if (!p) return;
    const updated = [...localPaths.current];
    if (p.type === "highlight") {
      const wIn = parseFloat(editDim.w), hIn = parseFloat(editDim.h);
      if (isNaN(wIn) || isNaN(hIn) || wIn <= 0 || hIn <= 0) return;
      if (p.wallAngle !== undefined) {
        updated[selectedIdx] = { ...p, widthIn: wIn, depthIn: hIn };
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
        const wPx = (wIn / 12) * BASE_PX_PER_FOOT, hPx = (hIn / 12) * BASE_PX_PER_FOOT;
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        updated[selectedIdx] = { ...p, x1: rx, y1: ry, x2: rx + wPx, y2: ry + hPx };
      }
    } else if (p.type === "line") {
      const newLen = (parseFloat(editDim.len) / 12) * BASE_PX_PER_FOOT;
      if (!newLen || newLen <= 0) return;
      const [p1] = p.points;
      const angleDeg = !isNaN(parseFloat(editDim.angle)) ? parseFloat(editDim.angle) : calcAngle(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y);
      const angleRad = angleDeg * Math.PI / 180;
      updated[selectedIdx] = { ...p, points: [p1, { x: Math.round(p1.x + Math.cos(angleRad) * newLen), y: Math.round(p1.y + Math.sin(angleRad) * newLen) }] };
    } else if (p.type === "symbol" && (p.symbolKey === "door" || p.symbolKey === "window")) {
      const wIn = parseFloat(editDim.symW);
      if (isNaN(wIn) || wIn <= 0) return;
      let sym = { ...p, widthPx: (wIn / 12) * BASE_PX_PER_FOOT };
      const offsetIn = parseFloat(editDim.offset);
      if (!isNaN(offsetIn) && offsetIn >= 0 && p.anchorX !== undefined) {
        const wallSnap = findNearestWallForPoint(p.anchorX, p.anchorY, localPaths.current, Infinity);
        if (wallSnap?.wall) {
          const [pw1, pw2] = wallSnap.wall.points;
          const wallLen = Math.hypot(pw2.x - pw1.x, pw2.y - pw1.y);
          const ax = Math.cos(p.wallAngle), ay = Math.sin(p.wallAngle);
          const offsetPx = editDim.offsetFromEnd === "right"
            ? wallLen - (offsetIn / 12) * BASE_PX_PER_FOOT
            : (offsetIn / 12) * BASE_PX_PER_FOOT;
          sym = { ...sym, anchorX: pw1.x + ax * offsetPx, anchorY: pw1.y + ay * offsetPx, offsetFromEnd: editDim.offsetFromEnd };
        }
      }
      updated[selectedIdx] = sym;
    } else if (p.type === "symbol" && p.anchorX !== undefined) {
      // Wall-mounted outlet/switch/plumbing
      const offsetIn = parseFloat(editDim.offset);
      const elevationIn = parseFloat(editDim.elevation);
      let sym = { ...p, offsetFromEnd: editDim.offsetFromEnd };
      if (!isNaN(elevationIn) && elevationIn >= 0) sym = { ...sym, elevationIn };
      if (!isNaN(offsetIn) && offsetIn >= 0) {
        sym = { ...sym, offsetIn };
        const wallSnap = findNearestWallForPoint(p.anchorX, p.anchorY, localPaths.current, Infinity);
        if (wallSnap?.wall) {
          const [pw1, pw2] = wallSnap.wall.points;
          const wallLen = Math.hypot(pw2.x - pw1.x, pw2.y - pw1.y);
          const ax = Math.cos(p.wallAngle), ay = Math.sin(p.wallAngle);
          const offsetPx = editDim.offsetFromEnd === "right"
            ? wallLen - (offsetIn / 12) * BASE_PX_PER_FOOT
            : (offsetIn / 12) * BASE_PX_PER_FOOT;
          sym = { ...sym, anchorX: pw1.x + ax * offsetPx, anchorY: pw1.y + ay * offsetPx };
        }
      }
      updated[selectedIdx] = sym;
    } else if (p.type === "symbol" && p.symbolKey === "rollout") {
      // Rollout/insert item
      let sym = { ...p, label: editDim.label || "" };
      updated[selectedIdx] = sym;
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
  const selectedIsDoor = selectedPath?.type === "symbol" && selectedPath.symbolKey === "door";
  const selectedIsWallSym = selectedPath?.type === "symbol" && (selectedPath.symbolKey === "door" || selectedPath.symbolKey === "window") && selectedPath.anchorX !== undefined;

  const changeZoom = (delta) => {
    setZoom(prev => {
      const nz = Math.min(3, Math.max(0.3, prev + delta));
      zoomRef.current = nz;
      requestAnimationFrame(() => redrawCanvas());
      return nz;
    });
  };

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

  const swingBtn = (label, active, onClick) => (
    <button onClick={onClick}
      className={`px-2.5 h-8 text-xs font-semibold rounded-lg border touch-manipulation transition-all ${active ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-300"}`}>
      {label}
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white select-none">
      {/* Toolbar Row 1 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        {toolBtn("select", "Select", <Move className="w-4 h-4" />, "bg-amber-500")}
        {toolBtn("line",   "Wall",   <Minus className="w-4 h-4" />, "bg-blue-500")}
        {toolBtn("pen",    "Annotate", <Pencil className="w-4 h-4" />, "bg-purple-600")}
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
          sym.key !== "rollout" && (
            <button key={sym.key}
              onPointerDown={(e) => { e.stopPropagation(); setTool("symbol"); setActiveSymbol(sym.key); setPlaceRolloutMode(false); setActiveRollout(null); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all touch-manipulation ${tool === "symbol" && activeSymbol === sym.key ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200"}`}>
              <SymbolIcon symbolKey={sym.key} size={22} />
              {sym.label}
            </button>
          )
        ))}
        {/* Rollout Catalog Selector */}
        {(catalogItems || []).filter(c => c.cabinet_category === "roll_out_inserts").length > 0 && (
          <select 
            value={activeRollout?.id || ""} 
            onChange={(e) => {
              const item = catalogItems.find(c => c.id === e.target.value);
              if (item) {
                setActiveRollout(item);
                setPlaceRolloutMode(true);
                setActiveSymbol(null);
              } else {
                setActiveRollout(null);
                setPlaceRolloutMode(false);
              }
            }}
            className="h-9 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
            onPointerDown={e => e.stopPropagation()}
          >
            <option value="">Select Rollout/Insert...</option>
            {(catalogItems || []).filter(c => c.cabinet_category === "roll_out_inserts").map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        )}
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
          {placeRolloutMode && (
            <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
              <span className="text-xs font-semibold text-orange-700">Click to place: {activeRollout?.name}</span>
              <button onClick={() => { setPlaceRolloutMode(false); setActiveRollout(null); }} className="text-xs text-orange-600 hover:text-orange-800 font-medium">✕</button>
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
            <button key={c} onPointerDown={(e) => { e.stopPropagation(); setColor(c); }}
              className="rounded-full touch-manipulation" style={{ backgroundColor: c, width: 24, height: 24, border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onPointerDown={(e) => { e.stopPropagation(); undo(); }} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 touch-manipulation" title="Undo"><Undo2 className="w-4 h-4" /></button>
          <button onPointerDown={(e) => { e.stopPropagation(); redo(); }} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 touch-manipulation" title="Redo"><Redo2 className="w-4 h-4" /></button>
          <button onPointerDown={(e) => { e.stopPropagation(); commitPaths([]); selectItem(null); }} className="w-9 h-9 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-500 touch-manipulation" title="Clear all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Edit bar — cabinet */}
      {selectedPath?.type === "highlight" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800">Cabinet:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="0.5" inputMode="decimal" className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.w} onChange={e => setEditDim(prev => ({ ...prev, w: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          <label className="text-xs text-slate-600">Depth (in)</label>
          <input type="number" step="0.5" inputMode="decimal" className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
            value={editDim.h} onChange={e => setEditDim(prev => ({ ...prev, h: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          {selectedHasWall && (
            <>
              <label className="text-xs text-slate-600">Offset (in)</label>
              <input type="number" step="0.5" inputMode="decimal" className="w-16 h-8 text-sm border border-amber-300 rounded-lg px-2 bg-white"
                value={editDim.offset} onChange={e => setEditDim(prev => ({ ...prev, offset: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
            </>
          )}
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg">Apply</button>
          <span className="text-xs text-slate-500">{editDim.w}" = {((parseFloat(editDim.w)||0)/12).toFixed(2)} LF</span>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
        </div>
      )}

      {/* Edit bar — wall */}
      {selectedPath?.type === "line" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-800">Wall:</span>
          <label className="text-xs text-slate-600">Length (in)</label>
          <input type="number" step="1" inputMode="decimal" className="w-20 h-8 text-sm border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.len} onChange={e => setEditDim(prev => ({ ...prev, len: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          <label className="text-xs text-slate-600">Angle (°)</label>
          <input type="number" step="1" inputMode="decimal" className="w-16 h-8 text-sm border border-blue-300 rounded-lg px-2 bg-white"
            value={editDim.angle} onChange={e => setEditDim(prev => ({ ...prev, angle: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          <span className="text-xs text-slate-500">{editDim.len}" = {((parseFloat(editDim.len)||0)/12).toFixed(2)} LF</span>
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
        </div>
      )}

      {/* Edit bar — door */}
      {selectedIsDoor && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-violet-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-violet-800">Door:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="1" inputMode="decimal" className="w-16 h-8 text-sm border border-violet-300 rounded-lg px-2 bg-white"
            value={editDim.symW} onChange={e => setEditDim(prev => ({ ...prev, symW: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          {selectedIsWallSym && (
            <>
              <label className="text-xs text-slate-600">Offset (in)</label>
              <input type="number" step="0.5" inputMode="decimal" className="w-16 h-8 text-sm border border-violet-300 rounded-lg px-2 bg-white"
                value={editDim.offset} onChange={e => setEditDim(prev => ({ ...prev, offset: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
            </>
          )}
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-violet-500 hover:bg-violet-600 text-white rounded-lg">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
        </div>
      )}

      {/* Edit bar — window */}
      {selectedPath?.type === "symbol" && selectedPath.symbolKey === "window" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border-b border-sky-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-sky-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-sky-800">Window:</span>
          <label className="text-xs text-slate-600">Width (in)</label>
          <input type="number" step="1" inputMode="decimal" className="w-16 h-8 text-sm border border-sky-300 rounded-lg px-2 bg-white"
            value={editDim.symW} onChange={e => setEditDim(prev => ({ ...prev, symW: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          {selectedIsWallSym && (
            <>
              <label className="text-xs text-slate-600">Offset (in)</label>
              <input type="number" step="0.5" inputMode="decimal" className="w-16 h-8 text-sm border border-sky-300 rounded-lg px-2 bg-white"
                value={editDim.offset} onChange={e => setEditDim(prev => ({ ...prev, offset: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
            </>
          )}
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded-lg">Apply</button>
          <span className="text-xs text-slate-500">{editDim.symW}" = {((parseFloat(editDim.symW)||0)/12).toFixed(2)} ft</span>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
        </div>
      )}

      {/* Edit bar — rollout/insert */}
      {selectedPath?.type === "symbol" && selectedPath.symbolKey === "rollout" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b border-orange-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-orange-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-orange-800">Rollout/Insert:</span>
          <label className="text-xs text-slate-600">Item Name</label>
          <input type="text" value={editDim.label || ""} onChange={e => setEditDim(prev => ({ ...prev, label: e.target.value }))} className="w-32 h-8 text-sm border border-orange-300 rounded-lg px-2 bg-white"
            placeholder="e.g., Spice Rack" onPointerDown={e => e.stopPropagation()} />
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
        </div>
      )}

      {/* Edit bar — wall-mounted outlet/switch/plumbing */}
      {selectedPath?.type === "symbol" && ["outlet","switch","plumbing"].includes(selectedPath.symbolKey) && selectedPath.anchorX !== undefined && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 capitalize">{selectedPath.symbolKey}:</span>
          <label className="text-xs text-slate-500">Elevation (in)</label>
          <input type="number" step="1" inputMode="decimal" className="w-16 h-8 text-sm border border-slate-300 rounded-lg px-2 bg-white"
            value={editDim.elevation} onChange={e => setEditDim(prev => ({ ...prev, elevation: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          <label className="text-xs text-slate-500">Offset (in)</label>
          <input type="number" step="1" inputMode="decimal" className="w-16 h-8 text-sm border border-slate-300 rounded-lg px-2 bg-white"
            value={editDim.offset} onChange={e => setEditDim(prev => ({ ...prev, offset: e.target.value }))} onPointerDown={e => e.stopPropagation()} />
          <span className="text-xs text-slate-500">from</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-300">
            {["left","right"].map(side => (
              <button key={side} onClick={() => setEditDim(prev => ({ ...prev, offsetFromEnd: side }))}
                className={`px-2.5 h-8 text-xs font-semibold transition-all ${editDim.offsetFromEnd === side ? "bg-slate-700 text-white" : "bg-white text-slate-600"}`}>
                {side === "left" ? "← Left" : "Right →"}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">of wall</span>
          <button onClick={applyDimEdit} className="px-3 h-8 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-lg">Apply</button>
          <button onClick={deleteSelected} className="ml-auto px-3 h-8 text-xs font-semibold bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => selectItem(null)} className="px-2 h-8 text-xs text-slate-500 border border-slate-200 rounded-lg">✕</button>
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
            style={{ cursor: tool === "eraser" ? "cell" : tool === "pen" ? "crosshair" : tool === "symbol" ? "copy" : tool === "select" ? "pointer" : "crosshair", touchAction: "none", display: "block", width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
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
        {/* Ceiling Height */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-semibold text-slate-600">CLG Height:</span>
          <input
            type="number" step="1" min="60" max="240"
            value={ceilingHeight || ""}
            onChange={e => onCeilingHeightChange?.(e.target.value)}
            placeholder="96"
            className="w-14 h-7 text-xs border border-slate-300 rounded-lg px-2 bg-white text-center"
            onPointerDown={e => e.stopPropagation()}
          />
          <span className="text-xs text-slate-400">in</span>
          {ceilingHeight && <span className="text-xs text-slate-500">({(ceilingHeight/12).toFixed(1)} ft)</span>}
        </div>
      </div>
    </div>
  );
}