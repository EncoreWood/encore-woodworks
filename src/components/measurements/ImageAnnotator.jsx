import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Type, ArrowRight, Minus, Hand, Undo2, Trash2, ZoomIn, ZoomOut, Save } from "lucide-react";

const TOOLS = [
  { key: "pan",    label: "Pan",    icon: Hand,       activeClass: "bg-sky-600 hover:bg-sky-700" },
  { key: "pen",    label: "Draw",   icon: Pencil,     activeClass: "bg-amber-600 hover:bg-amber-700" },
  { key: "arrow",  label: "Arrow",  icon: ArrowRight, activeClass: "bg-blue-600 hover:bg-blue-700" },
  { key: "line",   label: "Line",   icon: Minus,      activeClass: "bg-green-600 hover:bg-green-700" },
  { key: "text",   label: "Text",   icon: Type,       activeClass: "bg-purple-600 hover:bg-purple-700" },
  { key: "eraser", label: "Erase",  icon: Eraser,     activeClass: "bg-slate-600 hover:bg-slate-700" },
];

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

  // Touch handlers
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
      const pos = getPos(e);
      startDraw(pos);
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

  // Pointer events (mouse/stylus)
  const onPointerDown = (e) => {
    if (tool === "pan") return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    startDraw(getPos(e));
  };
  const onPointerMove = (e) => { if (tool === "pan" || !isDown) return; e.preventDefault(); moveDraw(getPos(e)); };
  const onPointerUp = (e) => { if (tool === "pan") return; e.preventDefault(); endDraw(getPos(e)); };

  // Pan (mouse)
  const onPanDown = (e) => {
    if (tool !== "pan") return;
    panStart.current = { x: e.clientX, y: e.clientY, sl: scrollRef.current?.scrollLeft || 0, st: scrollRef.current?.scrollTop || 0 };
  };
  const onPanMove = (e) => {
    if (tool !== "pan" || !panStart.current) return;
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
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b flex-wrap bg-slate-50">
          {TOOLS.map(({ key, label, icon: Icon, activeClass }) => (
            <Button key={key} size="sm" variant={tool === key ? "default" : "outline"}
              onClick={() => { setTool(key); setTextInput(null); }}
              className={`${tool === key ? activeClass : ""} min-h-[40px] px-3`}>
              <Icon className="w-4 h-4 mr-1" /> {label}
            </Button>
          ))}
          <div className="border-l h-6 mx-1" />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" title="Color" />
          <div className="border-l h-6 mx-1" />
          <Button size="sm" variant="outline" onClick={handleUndo} className="min-h-[40px]"><Undo2 className="w-4 h-4 mr-1" /> Undo</Button>
          <Button size="sm" variant="outline" onClick={() => setAnnList([])} className="text-red-600 min-h-[40px]"><Trash2 className="w-4 h-4 mr-1" /> Clear</Button>
          <div className="border-l h-6 mx-1" />
          <Button size="sm" variant="outline" onClick={() => setScale(s => Math.max(0.3, s - 0.15))} className="min-h-[40px]"><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setScale(s => Math.min(3, s + 0.15))} className="min-h-[40px]"><ZoomIn className="w-4 h-4" /></Button>
          <Button onClick={() => onSave(annList)} className="ml-auto bg-amber-600 hover:bg-amber-700 min-h-[40px] gap-1.5">
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>

        {/* Canvas area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-slate-200 select-none"
          style={{ touchAction: "none" }}
          onPointerDown={onPanDown}
          onPointerMove={onPanMove}
          onPointerUp={onPanUp}
          onPointerLeave={onPanUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-center min-h-full p-4">
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
                  style={{ cursor, touchAction: "none", pointerEvents: tool === "pan" ? "none" : "auto", width: canvasSize.width, height: canvasSize.height }}
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
      </DialogContent>
    </Dialog>
  );
}