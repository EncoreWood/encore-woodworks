import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Download, Trash2, ZoomIn, ZoomOut, RotateCw, Undo2, Type, ArrowRight, Minus, Highlighter, Hand } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Coordinate helpers ────────────────────────────────────────────────────────
// Annotations are stored NORMALIZED (0–1 relative to canvas dims at time of creation).
// This makes them scale-independent: correct at any zoom level.
function normPt(pt, w, h) { return { x: pt.x / w, y: pt.y / h }; }
function denormPt(pt, w, h) { return { x: pt.x * w, y: pt.y * h }; }

const HIGHLIGHT_COLORS = [
  { label: "Base",  color: "#d97706", hex: "rgba(251,191,36,0.25)" },
  { label: "Upper", color: "#3b82f6", hex: "rgba(147,197,253,0.3)" },
  { label: "Tall",  color: "#ef4444", hex: "rgba(252,165,165,0.3)" },
  { label: "Misc",  color: "#6b7280", hex: "rgba(209,213,219,0.45)" },
];

export default function PDFAnnotator({ open, onOpenChange, pdfUrl, annotations = [], onSave, showNotesField = false, initialNotes = "", hideDownload = false }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.5);
  const [rotation, setRotation] = useState(90);
  const [tool, setTool] = useState("pen");
  const [isPointerDown, setIsPointerDown] = useState(false);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const updatePanOffset = (o) => { panOffsetRef.current = o; setPanOffset(o); };

  const scrollContainerRef = useRef(null);
  const panStartRef = useRef(null);
  const lastTouchDistRef = useRef(null);
  const fingerCountRef = useRef(0);

  const [annList, setAnnList] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);   // normalized points
  const [currentLine, setCurrentLine] = useState(null); // normalized {start,end}
  const [textInput, setTextInput] = useState(null);     // pixel pos for input placement
  const [textValue, setTextValue] = useState("");

  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const [color, setColor] = useState("#e53e3e");
  const [highlightColor, setHighlightColor] = useState("#f59e0b");
  const [aiNotes, setAiNotes] = useState(initialNotes);
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });
  const canvasSizeRef = useRef({ width: 595, height: 842 });

  useEffect(() => { setAiNotes(initialNotes); }, [initialNotes]);
  useEffect(() => { setAnnList(annotations); }, [annotations]);

  const syncCanvasSize = useCallback(() => {
    const pageEl = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
    if (pageEl) {
      const s = { width: pageEl.offsetWidth, height: pageEl.offsetHeight };
      canvasSizeRef.current = s;
      setCanvasSize(s);
    }
  }, []);

  useEffect(() => {
    updatePanOffset({ x: 0, y: 0 });
    setTimeout(syncCanvasSize, 100);
  }, [scale, rotation, pageNumber, syncCanvasSize]);

  // ── Get canvas-relative position (pixels) ──────────────────────────────────
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ── Wheel pan ──────────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    updatePanOffset({ x: panOffsetRef.current.x - e.deltaX, y: panOffsetRef.current.y - e.deltaY });
  };

  // ── Touch handlers: finger = pan/pinch; stylus = draw (let through to pointer) ──
  const handleTouchStart = (e) => {
    // If any touch is from Apple Pencil, don't pan — let pointer events handle it
    if ([...e.touches].some(t => t.touchType === "stylus")) return;
    fingerCountRef.current = e.touches.length;
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      panStartRef.current = null;
    } else if (e.touches.length === 1) {
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        offsetX: panOffsetRef.current.x,
        offsetY: panOffsetRef.current.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if ([...e.touches].some(t => t.touchType === "stylus")) return;
    fingerCountRef.current = e.touches.length;
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDistRef.current) {
        const ratio = dist / lastTouchDistRef.current;
        setScale(s => Math.max(0.3, Math.min(3, s * ratio)));
      }
      lastTouchDistRef.current = dist;
    } else if (e.touches.length === 1 && panStartRef.current) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      updatePanOffset({ x: panStartRef.current.offsetX + dx, y: panStartRef.current.offsetY + dy });
    }
  };

  const handleTouchEnd = (e) => {
    if ([...e.changedTouches].some(t => t.touchType === "stylus")) return;
    fingerCountRef.current = e.touches.length;
    lastTouchDistRef.current = null;
    panStartRef.current = null;
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers (mouse + Apple Pencil / stylus) ──────────────────────
  const handlePointerDown = (e) => {
    // Finger touches are handled by touch events above; ignore them here
    if (e.pointerType === "touch") return;

    const pos = getPos(e);
    const { width: w, height: h } = canvasSizeRef.current;

    // Pan tool: drag to pan (works for mouse and stylus)
    if (tool === "pan") {
      e.preventDefault();
      panStartRef.current = { x: e.clientX, y: e.clientY, offsetX: panOffsetRef.current.x, offsetY: panOffsetRef.current.y };
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const npos = normPt(pos, w, h);

    if (tool === "pen") {
      setIsPointerDown(true);
      setCurrentPath([npos]);
    } else if (tool === "eraser") {
      setIsPointerDown(true);
      eraseAt(pos);
    } else if (tool === "arrow" || tool === "line" || tool === "highlight") {
      setIsPointerDown(true);
      setCurrentLine({ start: npos, end: npos });
    } else if (tool === "text") {
      setTextInput(pos);
      setTextValue("");
    }
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === "touch") return;

    // Pan
    if (tool === "pan" && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      updatePanOffset({ x: panStartRef.current.offsetX + dx, y: panStartRef.current.offsetY + dy });
      return;
    }

    if (!isPointerDown) return;
    e.preventDefault();
    const pos = getPos(e);
    const { width: w, height: h } = canvasSizeRef.current;
    const npos = normPt(pos, w, h);

    if (tool === "pen") {
      setCurrentPath(prev => [...prev, npos]);
    } else if (tool === "eraser") {
      eraseAt(pos);
    } else if (tool === "arrow" || tool === "line" || tool === "highlight") {
      setCurrentLine(prev => prev ? { ...prev, end: npos } : null);
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === "touch") return;
    if (tool === "pan") { panStartRef.current = null; return; }
    e.preventDefault();

    const pos = getPos(e);
    const { width: w, height: h } = canvasSizeRef.current;
    const npos = normPt(pos, w, h);

    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(prev => [...prev, { type: "pen", points: currentPath, color, page: pageNumber }]);
      setCurrentPath([]);
    } else if ((tool === "arrow" || tool === "line") && currentLine) {
      const dp = denormPt(currentLine.start, w, h);
      const ep = denormPt(npos, w, h);
      const dist = Math.hypot(ep.x - dp.x, ep.y - dp.y);
      if (dist > 5) {
        setAnnList(prev => [...prev, { type: tool, start: currentLine.start, end: npos, color, page: pageNumber }]);
      }
      setCurrentLine(null);
    } else if (tool === "highlight" && currentLine) {
      const ds = denormPt(currentLine.start, w, h);
      const de = denormPt(npos, w, h);
      const rw = Math.abs(de.x - ds.x);
      const rh = Math.abs(de.y - ds.y);
      if (rw > 5 && rh > 5) {
        setAnnList(prev => [...prev, {
          type: "highlight",
          x: Math.min(currentLine.start.x, npos.x),
          y: Math.min(currentLine.start.y, npos.y),
          w: Math.abs(npos.x - currentLine.start.x),
          h: Math.abs(npos.y - currentLine.start.y),
          color: highlightColor,
          page: pageNumber
        }]);
      }
      setCurrentLine(null);
    }
    setIsPointerDown(false);
  };

  // ── Erase: compare in pixel space ─────────────────────────────────────────
  const eraseAt = ({ x, y }) => {
    const { width: w, height: h } = canvasSizeRef.current;
    const t = 18;
    setAnnList(prev => prev.filter(ann => {
      if (ann.page !== pageNumber) return true;
      if (ann.type === "highlight") {
        const ax = ann.x * w, ay = ann.y * h, aw = ann.w * w, ah = ann.h * h;
        return !(x >= ax && x <= ax + aw && y >= ay && y <= ay + ah);
      }
      if (ann.type === "pen") {
        return !ann.points.some(pt => Math.hypot(pt.x * w - x, pt.y * h - y) < t);
      }
      if (ann.type === "arrow" || ann.type === "line") {
        return Math.hypot(ann.start.x * w - x, ann.start.y * h - y) >= t &&
               Math.hypot(ann.end.x * w - x, ann.end.y * h - y) >= t;
      }
      if (ann.type === "text") return Math.hypot(ann.x * w - x, ann.y * h - y) >= t * 2;
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim()) {
      const { width: w, height: h } = canvasSizeRef.current;
      setAnnList(prev => [...prev, {
        type: "text",
        x: textInput.x / w,
        y: textInput.y / h,
        text: textValue.trim(), color, page: pageNumber
      }]);
    }
    setTextInput(null);
    setTextValue("");
  };

  const handleUndo = () => {
    const pageAnns = annList.filter(a => a.page === pageNumber);
    if (!pageAnns.length) return;
    const last = pageAnns[pageAnns.length - 1];
    const lastIdx = annList.lastIndexOf(last);
    setAnnList(prev => prev.filter((_, i) => i !== lastIdx));
  };

  const clearPage = () => setAnnList(prev => prev.filter(a => a.page !== pageNumber));
  const clearAll = () => setAnnList([]);
  const handleSave = () => { onSave(annList, aiNotes); onOpenChange(false); };

  // ── Draw arrow helper (pixel coords) ──────────────────────────────────────
  const drawArrow = (ctx, from, to, withHead) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (withHead) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const hl = 14;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - hl * Math.cos(angle - Math.PI / 6), to.y - hl * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - hl * Math.cos(angle + Math.PI / 6), to.y - hl * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  };

  // ── Render canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width: W, height: H } = canvasSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations (stored normalized → convert to pixels)
    annList.filter(a => a.page === pageNumber).forEach(ann => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.type === "highlight") {
        const ax = ann.x * W, ay = ann.y * H, aw = ann.w * W, ah = ann.h * H;
        const r = parseInt(ann.color.slice(1,3),16);
        const g = parseInt(ann.color.slice(3,5),16);
        const b = parseInt(ann.color.slice(5,7),16);
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
        ctx.lineWidth = 1.5;
        ctx.fillRect(ax, ay, aw, ah);
        ctx.strokeRect(ax, ay, aw, ah);
        const hlLabel = HIGHLIGHT_COLORS.find(c => c.color === ann.color)?.label;
        if (hlLabel) {
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = `rgba(${r},${g},${b},1)`;
          ctx.fillText(hlLabel, ax + 3, ay + 12);
        }
      } else if (ann.type === "pen") {
        ctx.beginPath();
        ann.points.forEach((pt, i) => {
          const px = pt.x * W, py = pt.y * H;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (ann.type === "arrow" || ann.type === "line") {
        drawArrow(ctx,
          { x: ann.start.x * W, y: ann.start.y * H },
          { x: ann.end.x * W,   y: ann.end.y * H },
          ann.type === "arrow"
        );
      } else if (ann.type === "text") {
        const tx = ann.x * W, ty = ann.y * H;
        ctx.font = "bold 13px sans-serif";
        const metrics = ctx.measureText(ann.text);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(tx - 3, ty - 15, metrics.width + 6, 19);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - 3, ty - 15, metrics.width + 6, 19);
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, tx, ty);
      }
    });

    // Live pen stroke preview (normalized → pixels)
    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => {
        const px = pt.x * W, py = pt.y * H;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Live arrow/line preview
    if (currentLine && (tool === "arrow" || tool === "line")) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      drawArrow(ctx,
        { x: currentLine.start.x * W, y: currentLine.start.y * H },
        { x: currentLine.end.x * W,   y: currentLine.end.y * H },
        tool === "arrow"
      );
    }

    // Live highlight preview
    if (currentLine && tool === "highlight") {
      const r = parseInt(highlightColor.slice(1,3),16);
      const g = parseInt(highlightColor.slice(3,5),16);
      const b = parseInt(highlightColor.slice(5,7),16);
      const x = Math.min(currentLine.start.x, currentLine.end.x) * W;
      const y = Math.min(currentLine.start.y, currentLine.end.y) * H;
      const rw = Math.abs(currentLine.end.x - currentLine.start.x) * W;
      const rh = Math.abs(currentLine.end.y - currentLine.start.y) * H;
      ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, rw, rh);
      ctx.strokeRect(x, y, rw, rh);
    }
  }, [annList, currentPath, currentLine, pageNumber, color, highlightColor, canvasSize, tool]);

  const toolConfig = [
    { key: "pan",       label: "Pan",       icon: Hand,       activeClass: "bg-sky-600 hover:bg-sky-700" },
    { key: "pen",       label: "Draw",      icon: Pencil,     activeClass: "bg-amber-600 hover:bg-amber-700" },
    { key: "highlight", label: "Highlight", icon: Highlighter, activeClass: "bg-yellow-500 hover:bg-yellow-600" },
    { key: "arrow",     label: "Arrow",     icon: ArrowRight, activeClass: "bg-blue-600 hover:bg-blue-700" },
    { key: "line",      label: "Line",      icon: Minus,      activeClass: "bg-green-600 hover:bg-green-700" },
    { key: "text",      label: "Text",      icon: Type,       activeClass: "bg-purple-600 hover:bg-purple-700" },
    { key: "eraser",    label: "Eraser",    icon: Eraser,     activeClass: "bg-slate-600 hover:bg-slate-700" },
  ];

  const cursorStyle = tool === "pan" ? (panStartRef.current ? "grabbing" : "grab") : tool === "text" ? "text" : tool === "highlight" ? "cell" : "crosshair";

  if (!pdfUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Annotate Plan</span>
            <span className="text-sm text-slate-500">Page {pageNumber} of {numPages}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 pb-3 border-b flex-wrap">
          {toolConfig.map(({ key, label, icon: Icon, activeClass }) => (
            <Button
              key={key}
              variant={tool === key ? "default" : "outline"}
              size="sm"
              onClick={() => { setTool(key); setTextInput(null); }}
              className={tool === key ? activeClass : ""}
            >
              <Icon className="w-4 h-4 mr-1" /> {label}
            </Button>
          ))}

          <div className="border-l h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={clearPage}>Clear Page</Button>

          {tool === "highlight" ? (
            <div className="flex items-center gap-1.5 ml-1">
              <label className="text-sm text-slate-600 font-medium">Category:</label>
              {HIGHLIGHT_COLORS.map(hc => (
                <button
                  key={hc.label}
                  onClick={() => setHighlightColor(hc.color)}
                  title={hc.label}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                  style={{
                    background: hc.hex,
                    borderColor: highlightColor === hc.color ? hc.color : "transparent",
                    color: hc.color,
                    boxShadow: highlightColor === hc.color ? `0 0 0 2px ${hc.color}` : "none",
                    outline: "none"
                  }}
                >
                  {hc.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ml-1">
              <label className="text-sm text-slate-600">Color:</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
            </div>
          )}

          <div className="border-l h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.3, s - 0.15))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(3, s + 0.15))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="border-l h-6 mx-1" />
          <Button variant="outline" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>

          <div className="ml-auto flex gap-2">
            {!hideDownload && (
              <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
            )}
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
              Save Annotations
            </Button>
          </div>
        </div>

        {/* Notes field */}
        {showNotesField && (
          <div className="pb-3 border-b">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes for AI (included in analysis)</label>
            <textarea
              value={aiNotes}
              onChange={e => setAiNotes(e.target.value)}
              placeholder="e.g. Include island with seating, double stacked uppers in kitchen, built-in pantry..."
              className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        )}

        {/* PDF + Canvas */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-hidden bg-slate-100 rounded-lg select-none"
          onWheel={handleWheel}
          style={{ touchAction: "none" }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="relative inline-block"
              ref={pageContainerRef}
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)`, transition: "none" }}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<div className="flex items-center justify-center p-8 text-slate-500">Loading PDF...</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={() => setTimeout(syncCanvasSize, 50)}
                />
              </Document>

              {/* Annotation canvas — always captures pointer events (mouse + stylus) */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{
                  cursor: cursorStyle,
                  touchAction: "none",
                  // Always capture stylus/mouse; fingers fall through via touch handlers
                  pointerEvents: "auto",
                }}
                width={canvasSize.width}
                height={canvasSize.height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />

              {/* Floating text input */}
              {textInput && (
                <input
                  autoFocus
                  type="text"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onBlur={commitText}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitText();
                    if (e.key === "Escape") { setTextInput(null); setTextValue(""); }
                  }}
                  style={{
                    position: "absolute",
                    left: textInput.x,
                    top: textInput.y - 20,
                    color: color,
                    background: "rgba(255,255,255,0.95)",
                    border: `2px solid ${color}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 13,
                    fontWeight: "bold",
                    minWidth: 100,
                    outline: "none",
                    zIndex: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                  placeholder="Type note & Enter"
                />
              )}
            </div>
          </div>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Previous</Button>
            <span className="text-sm">Page {pageNumber} of {numPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}