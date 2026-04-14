import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Eraser, Undo2, Trash2, Minus, Move, Edit3 } from "lucide-react";

// 12 inches = 1 grid square. We pick a pixel size for one foot.
const PX_PER_FOOT = 40; // 40px = 1 foot = 12"
const GRID_SIZE = PX_PER_FOOT; // one grid cell = 1 foot

const COLORS = ["#1e1e1e", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];
const THICKNESS = { thin: 1.5, medium: 3, thick: 6 };

const CAB_HIGHLIGHTS = [
  { key: "base",  label: "Base",  color: "#3b82f6", fillColor: "rgba(59,130,246,0.25)" },
  { key: "upper", label: "Upper", color: "#22c55e", fillColor: "rgba(34,197,94,0.25)" },
  { key: "tall",  label: "Tall",  color: "#f59e0b", fillColor: "rgba(245,158,11,0.25)" },
  { key: "misc",  label: "Misc",  color: "#8b5cf6", fillColor: "rgba(139,92,246,0.25)" },
];

const SYMBOLS = [
  { key: "outlet",   label: "⚡ Outlet" },
  { key: "switch",   label: "🔲 Switch" },
  { key: "plumbing", label: "💧 Plumbing" },
];

function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function snapPoint(x, y) {
  return { x: snapToGrid(x), y: snapToGrid(y) };
}

function calcAngle(x1, y1, x2, y2) {
  return Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
}

function calcLineFt(x1, y1, x2, y2) {
  const pxLen = Math.hypot(x2 - x1, y2 - y1);
  return (pxLen / PX_PER_FOOT).toFixed(1);
}

function calcRectFt(x1, y1, x2, y2) {
  const wFt = (Math.abs(x2 - x1) / PX_PER_FOOT).toFixed(1);
  const hFt = (Math.abs(y2 - y1) / PX_PER_FOOT).toFixed(1);
  const lf = (parseFloat(wFt) * 2 + parseFloat(hFt) * 2).toFixed(1); // perimeter
  return { wFt, hFt, lf };
}

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

function drawGrid(ctx, w, h) {
  // Minor grid (1ft)
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Major grid (5ft)
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID_SIZE * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += GRID_SIZE * 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Scale label
  ctx.fillStyle = "#94a3b8"; ctx.font = "10px sans-serif"; ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillText("1 square = 1 ft", 6, 4);
}

function drawPath(ctx, path) {
  if (path.type === "symbol") {
    drawSymbol(ctx, path.symbolKey, path.x, path.y, 18);
    return;
  }
  if (path.type === "highlight") {
    const hl = CAB_HIGHLIGHTS.find(h => h.key === path.cabKey);
    if (!hl) return;
    const { x1, y1, x2, y2 } = path;
    ctx.save();
    ctx.fillStyle = hl.fillColor;
    ctx.strokeStyle = hl.color;
    ctx.lineWidth = 2;
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
    // Label
    const { wFt, hFt, lf } = calcRectFt(x1, y1, x2, y2);
    ctx.fillStyle = hl.color;
    ctx.font = `bold 11px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${hl.label} ${wFt}'×${hFt}'`, rx + rw / 2, ry + rh / 2);
    // Dimension labels on edges
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#475569";
    ctx.textBaseline = "bottom"; ctx.textAlign = "center";
    ctx.fillText(`${wFt}'`, rx + rw / 2, ry - 2);
    ctx.textBaseline = "middle"; ctx.textAlign = "right";
    ctx.fillText(`${hFt}'`, rx - 4, ry + rh / 2);
    ctx.restore();
    return;
  }
  if (path.type === "line" && path.points?.length === 2) {
    const [p1, p2] = path.points;
    ctx.strokeStyle = path.color; ctx.lineWidth = path.lineWidth; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    // Dimension label
    const ft = calcLineFt(p1.x, p1.y, p2.x, p2.y);
    const angle = calcAngle(p1.x, p1.y, p2.x, p2.y);
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));
    ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(`${ft}' (${angle}°)`, 0, -4);
    ctx.restore();
    return;
  }
  if (path.type === "pen" && path.points?.length > 1) {
    ctx.strokeStyle = path.color; ctx.lineWidth = path.lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    path.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main RoomSketch Component
// ─────────────────────────────────────────────────────────────────────────────
export default function RoomSketch({ paths, onPathsChange, onHighlightsChange }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("line");
  const [color, setColor] = useState("#1e1e1e");
  const [thickness, setThickness] = useState("medium");
  const [activeHighlight, setActiveHighlight] = useState("base");
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null); // for editing highlights/lines

  // Editing state for selected item
  const [editDim, setEditDim] = useState({ w: "", h: "" });

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const thicknessRef = useRef(thickness);
  const activeHighlightRef = useRef(activeHighlight);
  const activeSymbolRef = useRef(null);
  const isDrawing = useRef(false);
  const dragStart = useRef(null);
  const currentPath = useRef([]);
  const localPaths = useRef(paths || []);
  const rafScheduled = useRef(false);
  const previewRef = useRef(null);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { activeHighlightRef.current = activeHighlight; }, [activeHighlight]);
  useEffect(() => { activeSymbolRef.current = activeSymbol; }, [activeSymbol]);
  useEffect(() => { localPaths.current = paths || []; scheduleRedraw(); }, [paths]);

  const scheduleRedraw = () => {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => { rafScheduled.current = false; redrawCanvas(); });
  };

  const redrawCanvas = useCallback((preview) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    localPaths.current.forEach((path, idx) => {
      drawPath(ctx, path);
      // Selection outline
      if (idx === selectedIdx && path.type === "highlight") {
        const { x1, y1, x2, y2 } = path;
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.save(); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([5, 3]);
        ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); ctx.setLineDash([]); ctx.restore();
      }
    });

    // Preview while drawing
    if (preview) {
      const { type, x1, y1, x2, y2 } = preview;
      ctx.save();
      if (type === "line") {
        ctx.strokeStyle = colorRef.current; ctx.lineWidth = THICKNESS[thicknessRef.current]; ctx.lineCap = "round";
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        // Dimension preview
        const ft = calcLineFt(x1, y1, x2, y2);
        const angle = calcAngle(x1, y1, x2, y2);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.translate(mx, my);
        ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
        ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(`${ft}' (${angle}°)`, 0, -4);
      } else if (type === "highlight") {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        if (hl) {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.fillStyle = hl.fillColor; ctx.strokeStyle = hl.color; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
          ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); ctx.setLineDash([]);
          const { wFt, hFt } = calcRectFt(x1, y1, x2, y2);
          ctx.font = "bold 11px sans-serif"; ctx.fillStyle = hl.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`${hl.label} ${wFt}'×${hFt}'`, rx + rw / 2, ry + rh / 2);
        }
      }
      ctx.restore();
    }
  }, [selectedIdx]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const raw = { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    return snapPoint(raw.x, raw.y);
  };

  const eraseAt = (pos) => {
    const t = 20;
    const updated = localPaths.current.filter(p => {
      if (p.type === "symbol") return Math.hypot(p.x - pos.x, p.y - pos.y) > 22;
      if (p.type === "highlight") {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        const rw = Math.abs(p.x2 - p.x1), rh = Math.abs(p.y2 - p.y1);
        return !(pos.x >= rx - t && pos.x <= rx + rw + t && pos.y >= ry - t && pos.y <= ry + rh + t);
      }
      return !p.points?.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < t);
    });
    localPaths.current = updated;
    onPathsChange(updated);
    scheduleRedraw();
  };

  // Try to find clicked object for selection
  const findClickedIdx = (pos) => {
    for (let i = localPaths.current.length - 1; i >= 0; i--) {
      const p = localPaths.current[i];
      if (p.type === "highlight") {
        const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
        const rw = Math.abs(p.x2 - p.x1), rh = Math.abs(p.y2 - p.y1);
        if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) return i;
      }
      if (p.type === "line") {
        const [p1, p2] = p.points;
        const d = Math.abs((p2.y - p1.y) * pos.x - (p2.x - p1.x) * pos.y + p2.x * p1.y - p2.y * p1.x) /
          Math.hypot(p2.y - p1.y, p2.x - p1.x);
        const mx = (Math.min(p1.x, p2.x) - 10), Mx = (Math.max(p1.x, p2.x) + 10);
        const my = (Math.min(p1.y, p2.y) - 10), My = (Math.max(p1.y, p2.y) + 10);
        if (d < 10 && pos.x >= mx && pos.x <= Mx && pos.y >= my && pos.y <= My) return i;
      }
    }
    return null;
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);

    if (toolRef.current === "select") {
      const idx = findClickedIdx(pos);
      setSelectedIdx(idx);
      if (idx !== null && localPaths.current[idx]?.type === "highlight") {
        const p = localPaths.current[idx];
        const { wFt, hFt } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
        setEditDim({ w: wFt, h: hFt });
      }
      scheduleRedraw();
      isDrawing.current = false;
      return;
    }
    if (toolRef.current === "eraser") { eraseAt(pos); return; }
    if (toolRef.current === "symbol") {
      const sym = activeSymbolRef.current;
      if (sym) {
        const updated = [...localPaths.current, { type: "symbol", symbolKey: sym, x: pos.x, y: pos.y }];
        localPaths.current = updated; onPathsChange(updated); scheduleRedraw();
      }
      isDrawing.current = false; return;
    }
    dragStart.current = pos;
    currentPath.current = [pos];
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    if (toolRef.current === "eraser") { eraseAt(pos); return; }
    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      previewRef.current = { type: toolRef.current, x1: dragStart.current.x, y1: dragStart.current.y, x2: pos.x, y2: pos.y };
      redrawCanvas(previewRef.current);
      return;
    }
    if (toolRef.current === "pen") {
      currentPath.current = [...currentPath.current, pos];
      scheduleRedraw();
    }
  };

  const onPointerUp = (e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    previewRef.current = null;
    const pos = getPos(e);

    if ((toolRef.current === "line" || toolRef.current === "highlight") && dragStart.current) {
      const start = dragStart.current;
      dragStart.current = null;
      if (Math.hypot(pos.x - start.x, pos.y - start.y) < 5) { redrawCanvas(); return; }

      if (toolRef.current === "line") {
        const updated = [...localPaths.current, { type: "line", points: [start, pos], color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }];
        localPaths.current = updated; onPathsChange(updated);
      } else {
        const hl = CAB_HIGHLIGHTS.find(h => h.key === activeHighlightRef.current);
        const updated = [...localPaths.current, { type: "highlight", cabKey: activeHighlightRef.current, color: hl?.color, x1: start.x, y1: start.y, x2: pos.x, y2: pos.y }];
        localPaths.current = updated; onPathsChange(updated);
        // Notify parent about cabinet measurements
        notifyHighlights(updated);
      }
      scheduleRedraw();
      return;
    }

    if (toolRef.current === "pen" && currentPath.current.length > 1) {
      const updated = [...localPaths.current, { type: "pen", points: currentPath.current, color: colorRef.current, lineWidth: THICKNESS[thicknessRef.current] }];
      localPaths.current = updated; onPathsChange(updated);
      currentPath.current = [];
      scheduleRedraw();
    }
  };

  const notifyHighlights = (allPaths) => {
    if (!onHighlightsChange) return;
    const highlights = allPaths.filter(p => p.type === "highlight").map(p => {
      const { wFt, hFt, lf } = calcRectFt(p.x1, p.y1, p.x2, p.y2);
      const widthFt = parseFloat(wFt);
      return { cabKey: p.cabKey, wFt: parseFloat(wFt), hFt: parseFloat(hFt), lf: parseFloat(lf), measureType: "lf", quantity: widthFt };
    });
    onHighlightsChange(highlights);
  };

  // Dim editing for selected highlight
  const applyDimEdit = () => {
    if (selectedIdx === null) return;
    const p = localPaths.current[selectedIdx];
    if (p?.type !== "highlight") return;
    const wPx = parseFloat(editDim.w) * PX_PER_FOOT;
    const hPx = parseFloat(editDim.h) * PX_PER_FOOT;
    if (!wPx || !hPx) return;
    const rx = Math.min(p.x1, p.x2), ry = Math.min(p.y1, p.y2);
    const updated = localPaths.current.map((item, i) => i === selectedIdx
      ? { ...item, x1: rx, y1: ry, x2: rx + wPx, y2: ry + hPx }
      : item
    );
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated); scheduleRedraw();
  };

  const deleteSelected = () => {
    if (selectedIdx === null) return;
    const updated = localPaths.current.filter((_, i) => i !== selectedIdx);
    localPaths.current = updated; onPathsChange(updated); notifyHighlights(updated); setSelectedIdx(null); scheduleRedraw();
  };

  const selectedPath = selectedIdx !== null ? localPaths.current[selectedIdx] : null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar Row 1 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        <button onClick={() => setTool("select")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "select" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
          <Move className="w-3.5 h-3.5" /> Select
        </button>
        <button onClick={() => setTool("line")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "line" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
          <Minus className="w-3.5 h-3.5" /> Line
        </button>
        <button onClick={() => setTool("pen")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "pen" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
          <Pencil className="w-3.5 h-3.5" /> Pen
        </button>
        <button onClick={() => setTool("eraser")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "eraser" ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}>
          <Eraser className="w-3.5 h-3.5" /> Erase
        </button>

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* Cabinet box highlighters */}
        {CAB_HIGHLIGHTS.map(h => (
          <button key={h.key}
            onClick={() => { setTool("highlight"); setActiveHighlight(h.key); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${tool === "highlight" && activeHighlight === h.key ? "border-slate-700 shadow-md" : "border-transparent hover:border-slate-300"}`}
            style={{ backgroundColor: h.fillColor, color: h.color, outline: tool === "highlight" && activeHighlight === h.key ? `2px solid ${h.color}` : "none" }}
          >
            {h.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-300 mx-0.5" />

        {/* Symbols */}
        {SYMBOLS.map(sym => (
          <button key={sym.key}
            onClick={() => { setTool("symbol"); setActiveSymbol(sym.key); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${tool === "symbol" && activeSymbol === sym.key ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"}`}
          >
            {sym.label}
          </button>
        ))}
      </div>

      {/* Toolbar Row 2 — thickness + colors + actions */}
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
            <button key={c} onClick={() => { setColor(c); if (tool !== "eraser" && tool !== "highlight" && tool !== "symbol") setTool("line"); }}
              className="rounded-full transition-all" style={{ backgroundColor: c, width: 20, height: 20, border: `3px solid ${color === c ? "#f59e0b" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => { const u = localPaths.current.slice(0, -1); localPaths.current = u; onPathsChange(u); notifyHighlights(u); scheduleRedraw(); }}
            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500" title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { localPaths.current = []; onPathsChange([]); notifyHighlights([]); scheduleRedraw(); }}
            className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-500" title="Clear all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected item editor */}
      {selectedPath?.type === "highlight" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800">Edit Box:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600">W (ft)</span>
            <input type="number" step="0.5" className="w-16 h-7 text-xs border border-amber-300 rounded-lg px-2 bg-white"
              value={editDim.w} onChange={e => setEditDim(prev => ({ ...prev, w: e.target.value }))} />
            <span className="text-xs text-slate-600">H (ft)</span>
            <input type="number" step="0.5" className="w-16 h-7 text-xs border border-amber-300 rounded-lg px-2 bg-white"
              value={editDim.h} onChange={e => setEditDim(prev => ({ ...prev, h: e.target.value }))} />
            <button onClick={applyDimEdit} className="px-3 h-7 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg">Apply</button>
            <button onClick={deleteSelected} className="px-3 h-7 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
            <button onClick={() => { setSelectedIdx(null); scheduleRedraw(); }} className="px-3 h-7 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">✕</button>
          </div>
          <span className="text-xs text-slate-500 ml-1">
            = {(parseFloat(editDim.w) * 2 + parseFloat(editDim.h) * 2).toFixed(1)} LF perimeter
          </span>
        </div>
      )}
      {selectedPath?.type === "line" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 flex-wrap">
          <Edit3 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-800">
            Line: {calcLineFt(selectedPath.points[0].x, selectedPath.points[0].y, selectedPath.points[1].x, selectedPath.points[1].y)}' at {calcAngle(selectedPath.points[0].x, selectedPath.points[0].y, selectedPath.points[1].x, selectedPath.points[1].y)}°
          </span>
          <button onClick={deleteSelected} className="ml-auto px-3 h-7 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
          <button onClick={() => { setSelectedIdx(null); scheduleRedraw(); }} className="px-3 h-7 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">✕</button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1600}
        height={900}
        className="w-full"
        style={{ cursor: tool === "eraser" ? "cell" : tool === "symbol" ? "copy" : tool === "select" ? "default" : "crosshair", touchAction: "none", display: "block", height: 340 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
        {CAB_HIGHLIGHTS.map(h => {
          const hlPaths = (paths || []).filter(p => p.type === "highlight" && p.cabKey === h.key);
          if (!hlPaths.length) return null;
          const totalLf = hlPaths.reduce((s, p) => s + parseFloat(calcRectFt(p.x1, p.y1, p.x2, p.y2).wFt), 0);
          return (
            <span key={h.key} className="text-xs font-semibold rounded-full px-2 py-0.5"
              style={{ backgroundColor: h.fillColor, color: h.color }}>
              {h.label}: {totalLf.toFixed(1)} LF
            </span>
          );
        })}
        {(paths || []).filter(p => p.type === "line").length > 0 && (
          <span className="text-xs text-slate-500">
            {(paths || []).filter(p => p.type === "line").length} line(s) · {(paths || []).filter(p => p.type === "line").reduce((s, p) => s + parseFloat(calcLineFt(p.points[0].x, p.points[0].y, p.points[1].x, p.points[1].y)), 0).toFixed(1)} total LF
          </span>
        )}
      </div>
    </div>
  );
}