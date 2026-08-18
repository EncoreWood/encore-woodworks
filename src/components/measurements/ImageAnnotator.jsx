import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pencil, Highlighter, Type, ArrowRight, Eraser, Hand,
  Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Save, Loader2,
} from "lucide-react";

/*
 * High-performance, Apple-Pencil-first image annotator (GoodNotes-style).
 *
 * Rendering model
 *  - Two stacked canvases over the photo: a "base" canvas (committed strokes)
 *    and a "live" canvas (the in-progress stroke). During a stroke we draw
 *    only the new quadratic segment per pointermove onto the live canvas —
 *    no React state per point, no full redraw per point — so drawing stays
 *    low-latency on iPad. On pointerup the stroke is drawn onto the base
 *    canvas (once) and committed to the annotation list.
 *  - Zoom/pan is a CSS transform on the wrapper that holds the image +
 *    canvases, so the canvas pixel buffer never resizes while panning.
 *
 * Pointer / gesture model (palm rejection + gesture separation)
 *  - Apple Pencil (pointerType === "pen") always draws; while a pen is down
 *    every touch pointer is ignored so a resting palm never makes marks.
 *  - Two simultaneous touch pointers = pinch-to-zoom + pan, regardless of
 *    the active tool (and only when no pen is active).
 *  - A single touch draws when a draw tool is active (fallback for non-Pencil
 *    users), or pans when the Pan tool is active.
 *  - touch-action: none on the canvas so the browser never steals the
 *    gesture for scrolling/zooming.
 *
 * Save
 *  - Flattens the original photo + annotations to a JPEG blob and passes it
 *  up via onSave({ flattenedBlob, annotations }). The parent uploads it and
 *  stores it as file_url (keeping original_file_url for re-editing).
 */

const MAX_LONG_EDGE = 1800;

const PEN_COLORS = [
  { key: "red", hex: "#e53e3e" },
  { key: "black", hex: "#111111" },
  { key: "blue", hex: "#2563eb" },
];
const HIGHLIGHTER_HEX = "#f5c518";

const THICKNESS = { thin: 2.5, medium: 4.5, thick: 8 };

const TOOLS = [
  { key: "pan", label: "Pan", icon: Hand },
  { key: "pen", label: "Pen", icon: Pencil },
  { key: "hl", label: "High", icon: Highlighter },
  { key: "arrow", label: "Arrow", icon: ArrowRight },
  { key: "text", label: "Text", icon: Type },
  { key: "eraser", label: "Erase", icon: Eraser },
];

function ToolButton({ def, active, onSelect }) {
  const Icon = def.icon;
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(def.key); }}
      className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl border-2 transition-all select-none touch-manipulation
        ${active ? "bg-amber-600 border-amber-600 text-white shadow-md scale-105"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold leading-none">{def.label}</span>
    </button>
  );
}

export default function ImageAnnotator({ open, onOpenChange, imageUrl, annotations = [], onSave, title = "Annotate" }) {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [thickness, setThickness] = useState("medium");
  const [annList, setAnnList] = useState(annotations);
  const [textInput, setTextInput] = useState(null); // { x, y, value }
  const [displayZoom, setDisplayZoom] = useState(100);
  const [imgLoading, setImgLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [committedVersion, setCommittedVersion] = useState(0);
  const [, setHistTick] = useState(0);

  const imgRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  // Annotation source of truth (ref mirror so draw effects read latest without re-render)
  const annListRef = useRef(annotations);
  // History
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  // Drawing state
  const drawingPointerId = useRef(null);
  const strokePoints = useRef([]);
  const liveMid = useRef(null);
  const livePrev = useRef(null);
  const erasingSnapshot = useRef(null);
  // Pointer / gesture tracking
  const activePointers = useRef(new Map()); // id -> { type, x, y }
  const pinch = useRef(null); // { dist, midX, midY, scale, tx, ty }
  const pan = useRef(null); // { x, y, tx, ty }
  // View transform
  const view = useRef({ scale: 1, tx: 0, ty: 0 });

  // ---------- helpers ----------
  const markHist = () => {
    undoStack.current.push(annListRef.current.map((a) => ({ ...a, points: a.points ? a.points.map((p) => ({ ...p })) : undefined })));
    redoStack.current = [];
    setHistTick((t) => t + 1);
  };
  const bump = () => setCommittedVersion((v) => v + 1);

  const applyTransform = useCallback(() => {
    if (!wrapperRef.current) return;
    const v = view.current;
    wrapperRef.current.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.scale})`;
    wrapperRef.current.style.transformOrigin = "0 0";
    setDisplayZoom(Math.round(v.scale * 100));
  }, []);

  const toCanvasCoords = (clientX, clientY) => {
    const c = liveCanvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvasSize.w / rect.width),
      y: (clientY - rect.top) * (canvasSize.h / rect.height),
    };
  };

  const clampScale = (s) => Math.max(0.2, Math.min(6, s));

  // ---------- stroke drawing ----------
  const drawArrowShape = (ctx, from, to, w) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    const head = Math.max(12, w * 3.2);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawTextShape = (ctx, s) => {
    const fontPx = s.size || 22;
    ctx.font = `bold ${fontPx}px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    const m = ctx.measureText(s.text);
    const padX = 7, padY = 5;
    const w = m.width + padX * 2;
    const h = fontPx + padY * 2;
    const bx = s.x - padX;
    const by = s.y - fontPx - padY + 2;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, s.x, s.y);
  };

  const drawStroke = (ctx, s) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    if (s.type === "pen" || s.type === "hl") {
      const pts = s.points || [];
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha ?? 1;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (s.width * (0.6 + (pts[0].p ?? 0.5) * 1.4)) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        ctx.lineWidth = s.width * (0.6 + (p1.p ?? 0.5) * 1.4);
        ctx.beginPath();
        if (i === 1) ctx.moveTo(p0.x, p0.y);
        else {
          const pp = pts[i - 2];
          ctx.moveTo((pp.x + p0.x) / 2, (pp.y + p0.y) / 2);
        }
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        ctx.stroke();
      }
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      ctx.lineWidth = s.width * (0.6 + (last.p ?? 0.5) * 1.4);
      ctx.beginPath();
      ctx.moveTo((prev.x + last.x) / 2, (prev.y + last.y) / 2);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else if (s.type === "arrow") {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      drawArrowShape(ctx, s.start, s.end, s.width || 3);
    } else if (s.type === "text") {
      drawTextShape(ctx, s);
    }
    ctx.restore();
  };

  // ---------- live (in-progress) stroke drawing ----------
  const liveCtx = () => liveCanvasRef.current?.getContext("2d");
  const baseCtx = () => baseCanvasRef.current?.getContext("2d");
  const clearLive = () => {
    const ctx = liveCtx();
    if (ctx && canvasSize.w) ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
  };

  const strokeWidthFor = (t, isHl) => {
    if (isHl) return 16;
    return THICKNESS[thickness] ?? 4.5;
  };

  const startLiveStroke = (p) => {
    strokePoints.current = [p];
    liveMid.current = p;
    livePrev.current = p;
  };

  const extendLiveStroke = (p, isHl) => {
    const pts = strokePoints.current;
    pts.push(p);
    const ctx = liveCtx();
    if (!ctx) return;
    const w = strokeWidthFor(tool, isHl) * (0.6 + (p.p ?? 0.5) * 1.4);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isHl ? HIGHLIGHTER_HEX : color;
    ctx.globalAlpha = isHl ? 0.35 : 1;
    ctx.lineWidth = w;
    const prev = livePrev.current;
    const mid = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(liveMid.current.x, liveMid.current.y);
    ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    ctx.stroke();
    ctx.restore();
    liveMid.current = mid;
    livePrev.current = p;
  };

  const finishLiveStroke = (isHl) => {
    const pts = strokePoints.current;
    if (pts.length >= 2) {
      const ctx = liveCtx();
      if (ctx) {
        const last = pts[pts.length - 1], prev = pts[pts.length - 2];
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = isHl ? HIGHLIGHTER_HEX : color;
        ctx.globalAlpha = isHl ? 0.35 : 1;
        ctx.lineWidth = strokeWidthFor(tool, isHl) * (0.6 + (last.p ?? 0.5) * 1.4);
        ctx.beginPath();
        ctx.moveTo(liveMid.current.x, liveMid.current.y);
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        ctx.restore();
      }
      markHist();
      const stroke = {
        type: isHl ? "hl" : "pen",
        points: pts,
        color: isHl ? HIGHLIGHTER_HEX : color,
        width: strokeWidthFor(tool, isHl),
        alpha: isHl ? 0.35 : 1,
      };
      // commit onto base canvas (no full redraw)
      drawStroke(baseCtx(), stroke);
      annListRef.current = [...annListRef.current, stroke];
      setAnnList(annListRef.current);
    }
    clearLive();
    strokePoints.current = [];
    liveMid.current = null;
    livePrev.current = null;
  };

  // ---------- arrow tool ----------
  const arrowStart = useRef(null);
  const startArrow = (p) => { arrowStart.current = p; };
  const moveArrow = (p) => {
    if (!arrowStart.current) return;
    const ctx = liveCtx();
    if (!ctx) return;
    clearLive();
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    drawArrowShape(ctx, arrowStart.current, p, THICKNESS[thickness] ?? 4.5);
    ctx.restore();
  };
  const finishArrow = (p) => {
    const start = arrowStart.current;
    arrowStart.current = null;
    clearLive();
    if (!start) return;
    const dist = Math.hypot(p.x - start.x, p.y - start.y);
    if (dist < 8) return;
    markHist();
    const stroke = { type: "arrow", start, end: p, color, width: THICKNESS[thickness] ?? 4.5 };
    drawStroke(baseCtx(), stroke);
    annListRef.current = [...annListRef.current, stroke];
    setAnnList(annListRef.current);
  };

  // ---------- eraser ----------
  const eraseAt = (p) => {
    const t = 22 / view.current.scale; // tolerant hit radius in canvas px
    let changed = false;
    const next = annListRef.current.filter((s) => {
      if (s.type === "pen" || s.type === "hl") {
        const hit = (s.points || []).some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < t);
        if (hit) { changed = true; return false; }
        return true;
      }
      if (s.type === "arrow") {
        const hit = Math.hypot(s.start.x - p.x, s.start.y - p.y) < t || Math.hypot(s.end.x - p.x, s.end.y - p.y) < t;
        if (hit) { changed = true; return false; }
        return true;
      }
      if (s.type === "text") {
        const fontPx = s.size || 22;
        const bx = s.x - 7, by = s.y - fontPx - 3, bw = 999, bh = fontPx + 10;
        if (p.x >= bx && p.x <= bx + bw && p.y >= by && p.y <= by + bh) { changed = true; return false; }
        return true;
      }
      return true;
    });
    if (changed) {
      annListRef.current = next;
      setAnnList(next);
      bump();
    }
  };

  // ---------- text ----------
  const textHit = (p) => {
    const fontPx = 22;
    for (let i = annListRef.current.length - 1; i >= 0; i--) {
      const s = annListRef.current[i];
      if (s.type !== "text") continue;
      const bx = s.x - 7, by = s.y - fontPx - 3, bh = fontPx + 10;
      if (p.x >= bx && p.x <= bx + 999 && p.y >= by && p.y <= by + bh) return i;
    }
    return -1;
  };
  const commitText = () => {
    if (textInput && textInput.value.trim()) {
      markHist();
      const s = { type: "text", x: textInput.x, y: textInput.y, text: textInput.value.trim(), color, size: 22 };
      drawStroke(baseCtx(), s);
      annListRef.current = [...annListRef.current, s];
      setAnnList(annListRef.current);
    }
    setTextInput(null);
  };

  // ---------- undo / redo / clear ----------
  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(annListRef.current);
    annListRef.current = undoStack.current.pop();
    setAnnList(annListRef.current);
    bump();
    setHistTick((t) => t + 1);
  };
  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(annListRef.current);
    annListRef.current = redoStack.current.pop();
    setAnnList(annListRef.current);
    bump();
    setHistTick((t) => t + 1);
  };
  const clearAll = () => {
    markHist();
    annListRef.current = [];
    setAnnList([]);
    bump();
  };

  // ---------- image load + canvas sizing + fit ----------
  useEffect(() => {
    setAnnList(annotations);
    annListRef.current = annotations;
    undoStack.current = [];
    redoStack.current = [];
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations]);

  useEffect(() => {
    if (!open) return;
    let objUrl;
    let cancelled = false;
    setImgLoading(true);
    // Fetch -> blob -> object URL so the canvas is never tainted (clean toBlob readback)
    fetch(imageUrl)
      .then((r) => r.blob())
      .then((b) => {
        if (cancelled) return;
        objUrl = URL.createObjectURL(b);
        if (imgRef.current) imgRef.current.src = objUrl;
      })
      .catch(() => { if (!cancelled && imgRef.current) imgRef.current.src = imageUrl; });
    return () => { cancelled = true; if (objUrl) URL.revokeObjectURL(objUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, open]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    let w = nw, h = nh;
    const maxLong = MAX_LONG_EDGE;
    if (Math.max(nw, nh) > maxLong) {
      const r = maxLong / Math.max(nw, nh);
      w = Math.round(nw * r); h = Math.round(nh * r);
    }
    setCanvasSize({ w, h });
    setImgLoading(false);
  };

  // Fit to container once canvas size known
  useEffect(() => {
    if (!canvasSize.w || !containerRef.current) return;
    const cw = containerRef.current.clientWidth - 32;
    const ch = containerRef.current.clientHeight - 32;
    const s = Math.min(cw / canvasSize.w, ch / canvasSize.h, 1.5);
    view.current = { scale: Math.max(0.2, s), tx: 0, ty: 0 };
    // center
    const usedW = canvasSize.w * view.current.scale;
    const usedH = canvasSize.h * view.current.scale;
    view.current.tx = (cw - usedW) / 2 + 16;
    view.current.ty = (ch - usedH) / 2 + 16;
    applyTransform();
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]);

  // Full redraw of base canvas when committed version changes
  useEffect(() => {
    const c = baseCanvasRef.current;
    if (!c || !canvasSize.w) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    annListRef.current.forEach((s) => drawStroke(ctx, s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedVersion, canvasSize]);

  // ---------- pointer handling ----------
  const isPenActive = () =>
    [...activePointers.current.values()].some((p) => p.type === "pen");

  const onPointerDown = (e) => {
    e.preventDefault();
    (e.currentTarget).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { type: e.pointerType, x: e.clientX, y: e.clientY });
    const penDown = e.pointerType === "pen";

    // Palm rejection: if a Pencil is currently drawing, ignore all touch input
    if (e.pointerType === "touch" && drawingPointerId.current !== null && isPenActive()) {
      return;
    }

    const p = toCanvasCoords(e.clientX, e.clientY);

    if (penDown) {
      // Pencil always draws (with the active draw tool)
      drawingPointerId.current = e.pointerId;
      if (tool === "pen" || tool === "hl") {
        startLiveStroke({ ...p, p: e.pressure || 0.5 });
      } else if (tool === "arrow") {
        startArrow(p);
      } else if (tool === "eraser") {
        erasingSnapshot.current = null;
        eraseAt(p);
      } else if (tool === "text") {
        const idx = textHit(p);
        if (idx >= 0) {
          pan.current = { mode: "text", idx, ox: p.x, oy: p.y, sx: annListRef.current[idx].x, sy: annListRef.current[idx].y };
        } else {
          setTextInput({ x: p.x, y: p.y, value: "" });
        }
      }
      return;
    }

    // Touch
    const touches = [...activePointers.current.values()].filter((x) => x.type === "touch");
    if (touches.length === 2) {
      // Begin pinch — cancel any single-touch draw in progress
      cancelActiveDraw();
      const [a, b] = touches;
      drawingPointerId.current = null;
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2,
        scale: view.current.scale, tx: view.current.tx, ty: view.current.ty,
      };
      return;
    }

    // single touch
    if (tool === "pan") {
      pan.current = { mode: "pan", x: e.clientX, y: e.clientY, tx: view.current.tx, ty: view.current.ty };
      return;
    }
    if (tool === "eraser") {
      drawingPointerId.current = e.pointerId;
      eraseAt(p);
      return;
    }
    if (tool === "text") {
      const idx = textHit(p);
      if (idx >= 0) {
        pan.current = { mode: "text", idx, ox: p.x, oy: p.y, sx: annListRef.current[idx].x, sy: annListRef.current[idx].y };
      } else {
        setTextInput({ x: p.x, y: p.y, value: "" });
      }
      return;
    }
    // draw fallback for single-touch (pen / hl / arrow)
    drawingPointerId.current = e.pointerId;
    if (tool === "pen" || tool === "hl") startLiveStroke({ ...p, p: 0.5 });
    else if (tool === "arrow") startArrow(p);
  };

  const cancelActiveDraw = () => {
    if ((tool === "pen" || tool === "hl") && strokePoints.current.length) {
      clearLive();
      strokePoints.current = [];
      liveMid.current = null;
      livePrev.current = null;
    } else if (tool === "arrow") {
      arrowStart.current = null;
      clearLive();
    }
  };

  const onPointerMove = (e) => {
    const prev = activePointers.current.get(e.pointerId);
    if (prev) { prev.x = e.clientX; prev.y = e.clientY; }

    // Two-finger pinch (touch only, no pen active)
    if (pinch.current && !isPenActive()) {
      const touches = [...activePointers.current.values()].filter((x) => x.type === "touch");
      if (touches.length >= 2) {
        const [a, b] = touches;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const st = pinch.current;
        const newScale = clampScale(st.scale * (dist / st.dist));
        // keep world point under the start midpoint fixed
        const wx = (st.midX - st.tx) / st.scale;
        const wy = (st.midY - st.ty) / st.scale;
        view.current = {
          scale: newScale,
          tx: mx - wx * newScale,
          ty: my - wy * newScale,
        };
        applyTransform();
        // pan with midpoint drift too
        return;
      }
    }

    // Pan
    if (pan.current && (pan.current.mode === "pan")) {
      view.current.tx = pan.current.tx + (e.clientX - pan.current.x);
      view.current.ty = pan.current.ty + (e.clientY - pan.current.y);
      applyTransform();
      return;
    }
    if (pan.current && pan.current.mode === "text") {
      const p = toCanvasCoords(e.clientX, e.clientY);
      const dx = p.x - pan.current.ox, dy = p.y - pan.current.oy;
      const arr = annListRef.current.slice();
      arr[pan.current.idx] = { ...arr[pan.current.idx], x: pan.current.sx + dx, y: pan.current.sy + dy };
      annListRef.current = arr;
      setAnnList(arr);
      bump();
      return;
    }

    if (drawingPointerId.current !== e.pointerId) return;

    const p = toCanvasCoords(e.clientX, e.clientY);
    if (tool === "pen" || tool === "hl") {
      extendLiveStroke({ ...p, p: e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5 }, tool === "hl");
    } else if (tool === "arrow") {
      moveArrow(p);
    } else if (tool === "eraser") {
      eraseAt(p);
    }
  };

  const endPointer = (e) => {
    activePointers.current.delete(e.pointerId);

    if (pan.current) { pan.current = null; }

    const touches = [...activePointers.current.values()].filter((x) => x.type === "touch");
    if (pinch.current && touches.length < 2) pinch.current = null;

    if (drawingPointerId.current === e.pointerId) {
      const p = toCanvasCoords(e.clientX, e.clientY);
      if (tool === "pen" || tool === "hl") finishLiveStroke(tool === "hl");
      else if (tool === "arrow") finishArrow(p);
      drawingPointerId.current = null;
      return;
    }

    // If a pencil was drawing and lifted, and remaining touches exist, leave them (palm) ignored
  };

  // ---------- zoom buttons ----------
  const zoomBy = (factor, center) => {
    const cont = containerRef.current;
    const cx = center ? center.x : (cont ? cont.clientWidth / 2 : 0);
    const cy = center ? center.y : (cont ? cont.clientHeight / 2 : 0);
    const v = view.current;
    const newScale = clampScale(v.scale * factor);
    const wx = (cx - v.tx) / v.scale;
    const wy = (cy - v.ty) / v.scale;
    view.current = { scale: newScale, tx: cx - wx * newScale, ty: cy - wy * newScale };
    applyTransform();
  };

  // ---------- save / flatten ----------
  const handleSave = async () => {
    setSaving(true);
    try {
      let blob = null;
      if (annListRef.current.length > 0 && canvasSize.w && imgRef.current) {
        const out = document.createElement("canvas");
        out.width = canvasSize.w; out.height = canvasSize.h;
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(imgRef.current, 0, 0, out.width, out.height);
        annListRef.current.forEach((s) => drawStroke(ctx, s));
        blob = await new Promise((resolve) => out.toBlob((b) => resolve(b), "image/jpeg", 0.92));
      }
      await onSave?.({ flattenedBlob: blob, annotations: annListRef.current });
    } catch (err) {
      // Canvas tainted or other failure — degrade to annotations-only save
      console.error("flatten failed", err);
      await onSave?.({ flattenedBlob: null, annotations: annListRef.current });
    } finally {
      setSaving(false);
    }
  };

  const isHl = tool === "hl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[96vh] h-[96vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate">{title}</DialogTitle>
          <button
            onPointerDown={(e) => { e.preventDefault(); if (!saving) handleSave(); }}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors select-none touch-manipulation ${saving ? "bg-amber-400" : "bg-amber-600 hover:bg-amber-700"}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </DialogHeader>

        {/* Canvas stage */}
        <div className="flex-1 relative overflow-hidden bg-slate-800" ref={containerRef}>
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <div ref={wrapperRef} className="absolute top-0 left-0" style={{ transformOrigin: "0 0" }}>
            <img
              ref={imgRef}
              onLoad={onImgLoad}
              alt="Measurement"
              draggable={false}
              style={{ display: "block", width: canvasSize.w || "auto", height: canvasSize.h || "auto", userSelect: "none", WebkitUserSelect: "none", maxWidth: "none" }}
            />
            {canvasSize.w > 0 && (
              <>
                <canvas
                  ref={baseCanvasRef}
                  width={canvasSize.w}
                  height={canvasSize.h}
                  className="absolute top-0 left-0"
                  style={{ width: canvasSize.w, height: canvasSize.h, pointerEvents: "none" }}
                />
                <canvas
                  ref={liveCanvasRef}
                  width={canvasSize.w}
                  height={canvasSize.h}
                  className="absolute top-0 left-0"
                  style={{ width: canvasSize.w, height: canvasSize.h, touchAction: "none", cursor: tool === "pan" ? "grab" : tool === "text" ? "text" : "crosshair" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endPointer}
                  onPointerCancel={endPointer}
                  onContextMenu={(e) => e.preventDefault()}
                />
                {textInput && (
                  <input
                    autoFocus
                    type="text"
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onBlur={commitText}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitText();
                      if (e.key === "Escape") setTextInput(null);
                    }}
                    placeholder="Type & Enter"
                    style={{
                      position: "absolute",
                      left: textInput.x,
                      top: textInput.y - 22,
                      color,
                      background: "rgba(255,255,255,0.95)",
                      border: `2px solid ${color}`,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 22,
                      fontWeight: "bold",
                      minWidth: 140,
                      outline: "none",
                      zIndex: 30,
                      transformOrigin: "top left",
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Tool palette */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5 p-2 rounded-2xl shadow-xl border border-slate-200 bg-white/95 backdrop-blur">
            {TOOLS.map((d) => (
              <ToolButton key={d.key} def={d} active={tool === d.key} onSelect={(k) => { setTool(k); setTextInput(null); }} />
            ))}

            <div className="h-px bg-slate-200 my-0.5" />

            {/* Colors */}
            {tool === "pen" && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.key}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setColor(c.hex); }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c.hex ? "scale-110 border-slate-800" : "border-white"}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            )}
            {tool === "hl" && (
              <div className="flex items-center justify-center py-1">
                <div className="w-7 h-7 rounded-full border-2 border-white" style={{ background: HIGHLIGHTER_HEX, opacity: 0.6 }} />
              </div>
            )}

            {/* Thickness */}
            {(tool === "pen" || tool === "hl") && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                {["thin", "medium", "thick"].map((tk) => (
                  <button
                    key={tk}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setThickness(tk); }}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${thickness === tk ? "border-amber-600 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                  >
                    <span className="rounded-full" style={{ width: tk === "thin" ? 4 : tk === "medium" ? 7 : 12, height: tk === "thin" ? 4 : tk === "medium" ? 7 : 12, background: isHl ? HIGHLIGHTER_HEX : color, opacity: isHl ? 0.6 : 1 }} />
                  </button>
                ))}
              </div>
            )}

            <div className="h-px bg-slate-200 my-0.5" />

            {/* Undo / Redo */}
            <div className="flex gap-1.5">
              <button
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); undo(); }}
                disabled={!undoStack.current.length}
                className="flex-1 flex flex-col items-center justify-center h-12 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-40 select-none touch-manipulation"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); redo(); }}
                disabled={!redoStack.current.length}
                className="flex-1 flex flex-col items-center justify-center h-12 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-40 select-none touch-manipulation"
              >
                <Redo2 className="w-5 h-5" />
              </button>
            </div>
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); clearAll(); }}
              className="flex flex-col items-center justify-center w-14 h-12 rounded-xl border-2 border-red-100 bg-white hover:bg-red-50 text-red-500 hover:border-red-300 transition-colors select-none touch-manipulation"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="h-px bg-slate-200 my-0.5" />

            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); zoomBy(0.8); }}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors select-none touch-manipulation"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-bold text-slate-500 text-center">{displayZoom}%</div>
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); zoomBy(1.25); }}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors select-none touch-manipulation"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Hint */}
          <div className="absolute bottom-2 right-3 z-40 text-[11px] text-white/70 bg-black/30 rounded px-2 py-1 pointer-events-none">
            ✏️ Pencil draws · ✊ Two fingers pan/zoom · Palm is ignored
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}