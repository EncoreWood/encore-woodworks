import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Type, ArrowRight, Minus, Hand, Undo2, Trash2, ZoomIn, ZoomOut, Save } from "lucide-react";

const TOOLS = [
  { key: "pan",    label: "Pan",   icon: Hand,       activeClass: "bg-sky-600",    activeBorder: "#0284c7" },
  { key: "pen",    label: "Draw",  icon: Pencil,     activeClass: "bg-amber-600",  activeBorder: "#d97706" },
  { key: "arrow",  label: "Arrow", icon: ArrowRight, activeClass: "bg-blue-600",   activeBorder: "#2563eb" },
  { key: "line",   label: "Line",  icon: Minus,      activeClass: "bg-green-600",  activeBorder: "#16a34a" },
  { key: "text",   label: "Text",  icon: Type,       activeClass: "bg-purple-600", activeBorder: "#9333ea" },
  { key: "eraser", label: "Erase", icon: Eraser,     activeClass: "bg-slate-600",  activeBorder: "#475569" },
];

// Large tap targets that work with Apple Pencil (pointerDown instead of onClick)
function ToolButton({ toolDef, active, onSelect }) {
  const Icon = toolDef.icon;
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(toolDef.key); }}
      style={active ? { background: toolDef.activeBorder, borderColor: toolDef.activeBorder } : {}}
      className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl border-2 transition-all select-none touch-manipulation
        ${active
          ? "text-white shadow-md scale-105"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold leading-none">{toolDef.label}</span>
    </button>
  );
}

export default function ImageAnnotator({ open, onOpenChange, imageUrl, annotations = [], onSave, title = "Annotate" }) {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#e53e3e");
  const [annList, setAnnList] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const [isDown, setIsDown] = useState(false);
  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState("");
  const [scale, setScale] = useState(1);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const panStart = useRef(null);
  const lastTouchDist = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => { setAnnList(annotations); }, [annotations]);
  useEffect(() => {
    if (open) { setTool("pen"); setCurrentPath([]); setCurrentLine(null); setTextInput(null); }
  }, [open]);

  const syncCanvas = () => {
    if (imgRef.current) {
      setCanvasSize({ width: imgRef.current.offsetWidth, height: imgRef.current.offsetHeight });
    }
  };

  useEffect(() => {
    if (imgLoaded) setTimeout(syncCanvas, 50);
  }, [imgLoaded, scale]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Touch handlers (finger gestures: pinch-zoom, pan)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else if (e.touches.length === 1 && tool === "pan") {
      panStart.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        sl: scrollRef.current?.scrollLeft || 0, st: scrollRef.current?.scrollTop || 0
      };
    } else if (e.touches.length === 1 && tool !== "pan") {
      e.preventDefault();
      startDraw(getPos(e));
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist.current) setScale(s => Math.max(0.5, Math.min(3, s * (dist / lastTouchDist.current))));
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && tool === "pan" && panStart.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      if (scrollRef.current) { scrollRef.current.scrollLeft = panStart.current.sl - dx; scrollRef.current.scrollTop = panStart.current.st - dy; }
    } else if (e.touches.length === 1 && tool !== "pan" && isDown) {
      e.preventDefault();
      moveDraw(getPos(e));
    }
  };

  const handleTouchEnd = () => { lastTouchDist.current = null; panStart.current = null; endDraw(); };

  const startDraw = (pos) => {
    setIsDown(true);
    if (tool === "pen") setCurrentPath([pos]);
    else if (tool === "arrow" || tool === "line") setCurrentLine({ start: pos, end: pos });
    else if (tool === "text") { setTextInput(pos); setTextValue(""); }
    else if (tool === "eraser") eraseAt(pos);
  };

  const moveDraw = (pos) => {
    if (!isDown) return;
    if (tool === "pen") setCurrentPath(p => [...p, pos]);
    else if (tool === "arrow" || tool === "line") setCurrentLine(p => p ? { ...p, end: pos } : null);
    else if (tool === "eraser") eraseAt(pos);
  };

  const endDraw = (pos) => {
    if (!isDown) return;
    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(p => [...p, { type: "pen", points: currentPath, color }]);
      setCurrentPath([]);
    } else if ((tool === "arrow" || tool === "line") && currentLine && pos) {
      const dist = Math.hypot(pos.x - currentLine.start.x, pos.y - currentLine.start.y);
      if (dist > 5) setAnnList(p => [...p, { type: tool, start: currentLine.start, end: pos, color }]);
      setCurrentLine(null);
    } else if (tool === "arrow" || tool === "line") {
      setCurrentLine(null);
    }
    setIsDown(false);
  };

  const eraseAt = ({ x, y }) => {
    const t = 20;
    setAnnList(prev => prev.filter(ann => {
      if (ann.type === "pen") return !ann.points.some(pt => Math.hypot(pt.x - x, pt.y - y) < t);
      if (ann.type === "arrow" || ann.type === "line") return Math.hypot(ann.start.x - x, ann.start.y - y) >= t && Math.hypot(ann.end.x - x, ann.end.y - y) >= t;
      if (ann.type === "text") return Math.hypot(ann.x - x, ann.y - y) >= t * 2;
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim()) setAnnList(p => [...p, { type: "text", x: textInput.x, y: textInput.y, text: textValue.trim(), color }]);
    setTextInput(null); setTextValue("");
  };

  const handleUndo = () => setAnnList(p => p.slice(0, -1));

  // Pointer events — Apple Pencil fires as pointerType="pen", finger as "touch"
  // For the canvas: pencil draws, finger pans (when tool is pan) or also draws
  const onPointerDown = (e) => {
    // Let pencil always draw, finger only draws when tool is not pan
    if (e.pointerType === "touch" && tool === "pan") return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    startDraw(getPos(e));
  };
  const onPointerMove = (e) => {
    if (!isDown) return;
    if (e.pointerType === "touch" && tool === "pan") return;
    e.preventDefault();
    moveDraw(getPos(e));
  };
  const onPointerUp = (e) => {
    if (e.pointerType === "touch" && tool === "pan") return;
    e.preventDefault();
    endDraw(getPos(e));
  };

  // Pan — only for finger touch or mouse, not pencil
  const onPanDown = (e) => {
    if (e.pointerType === "pen") return; // pencil goes to canvas
    if (tool !== "pan") return;
    panStart.current = { x: e.clientX, y: e.clientY, sl: scrollRef.current?.scrollLeft || 0, st: scrollRef.current?.scrollTop || 0 };
  };
  const onPanMove = (e) => {
    if (e.pointerType === "pen" || tool !== "pan" || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (scrollRef.current) { scrollRef.current.scrollLeft = panStart.current.sl - dx; scrollRef.current.scrollTop = panStart.current.st - dy; }
  };
  const onPanUp = () => { panStart.current = null; };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawArrow = (from, to, head) => {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      if (head) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const hl = 14;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y); ctx.lineTo(to.x - hl * Math.cos(angle - Math.PI / 6), to.y - hl * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(to.x, to.y); ctx.lineTo(to.x - hl * Math.cos(angle + Math.PI / 6), to.y - hl * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    };

    annList.forEach(ann => {
      ctx.strokeStyle = ann.color; ctx.fillStyle = ann.color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (ann.type === "pen") { ctx.beginPath(); ann.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); }
      else if (ann.type === "arrow") drawArrow(ann.start, ann.end, true);
      else if (ann.type === "line") drawArrow(ann.start, ann.end, false);
      else if (ann.type === "text") {
        ctx.font = "bold 14px sans-serif";
        const m = ctx.measureText(ann.text);
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(ann.x - 3, ann.y - 16, m.width + 8, 20);
        ctx.strokeStyle = ann.color; ctx.lineWidth = 1; ctx.strokeRect(ann.x - 3, ann.y - 16, m.width + 8, 20);
        ctx.fillStyle = ann.color; ctx.fillText(ann.text, ann.x, ann.y);
      }
    });

    if (currentPath.length > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); currentPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
    }
    if (currentLine && (tool === "arrow" || tool === "line")) {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      drawArrow(currentLine.start, currentLine.end, tool === "arrow");
    }
  }, [annList, currentPath, currentLine, tool, color, canvasSize]);

  const cursor = tool === "pan" ? "grab" : tool === "text" ? "text" : "crosshair";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-3 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <button
              onPointerDown={(e) => { e.preventDefault(); onSave(annList); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors select-none touch-manipulation"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </DialogHeader>

        {/* Canvas area + floating tool palette */}
        <div className="flex-1 relative overflow-hidden">
          {/* Scrollable canvas */}
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-auto bg-slate-200 select-none"
            style={{ touchAction: "none" }}
            onPointerDown={onPanDown}
            onPointerMove={onPanMove}
            onPointerUp={onPanUp}
            onPointerLeave={onPanUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-center min-h-full p-4 pl-20">
              <div className="relative inline-block" ref={containerRef}>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Measurement"
                  onLoad={() => { setImgLoaded(true); syncCanvas(); }}
                  style={{ width: `${scale * 100}%`, maxWidth: "none", display: "block", userSelect: "none", WebkitUserSelect: "none" }}
                  draggable={false}
                />
                {imgLoaded && (
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="absolute top-0 left-0"
                    style={{ cursor, touchAction: "none", pointerEvents: "auto", width: canvasSize.width, height: canvasSize.height }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                )}
                {textInput && (
                  <input
                    autoFocus
                    type="text"
                    value={textValue}
                    onChange={e => setTextValue(e.target.value)}
                    onBlur={commitText}
                    onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") { setTextInput(null); setTextValue(""); } }}
                    style={{
                      position: "absolute", left: textInput.x, top: textInput.y - 20,
                      color, background: "rgba(255,255,255,0.95)", border: `2px solid ${color}`,
                      borderRadius: 4, padding: "2px 6px", fontSize: 14, fontWeight: "bold",
                      minWidth: 120, outline: "none", zIndex: 20
                    }}
                    placeholder="Type & press Enter"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Floating vertical tool palette — left side, large targets for Apple Pencil */}
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-2 rounded-2xl shadow-xl border border-slate-200 bg-white/95 backdrop-blur"
            style={{ pointerEvents: "auto" }}
          >
            {/* Tool buttons */}
            {TOOLS.map(toolDef => (
              <ToolButton key={toolDef.key} toolDef={toolDef} active={tool === toolDef.key} onSelect={(k) => { setTool(k); setTextInput(null); }} />
            ))}

            <div className="h-px bg-slate-200 my-0.5" />

            {/* Color picker — large tap target */}
            <label className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 border-slate-200 bg-white cursor-pointer hover:border-slate-400 transition-colors">
              <div className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: color }} />
              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Color</span>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="sr-only" />
            </label>

            <div className="h-px bg-slate-200 my-0.5" />

            {/* Undo */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleUndo(); }}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors select-none touch-manipulation"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Undo</span>
            </button>

            {/* Clear */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setAnnList([]); }}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 border-red-100 bg-white hover:bg-red-50 text-red-500 hover:border-red-300 transition-colors select-none touch-manipulation"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Clear</span>
            </button>

            <div className="h-px bg-slate-200 my-0.5" />

            {/* Zoom out */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setScale(s => Math.max(0.3, s - 0.15)); }}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors select-none touch-manipulation"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-bold text-slate-500 text-center">{Math.round(scale * 100)}%</div>
            {/* Zoom in */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setScale(s => Math.min(3, s + 0.15)); }}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-400 transition-colors select-none touch-manipulation"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}