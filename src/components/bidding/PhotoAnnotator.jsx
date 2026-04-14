import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Pencil, Type, Eraser, Undo2, Check, ZoomIn, ZoomOut } from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff", "#1e1e1e"];

export default function PhotoAnnotator({ photo, onSave, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [tool, setTool] = useState("pen"); // pen | text | eraser
  const [color, setColor] = useState("#ef4444");
  const [thickness, setThickness] = useState(3);
  const [annotations, setAnnotations] = useState(photo.annotations || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [addingText, setAddingText] = useState(null); // {x, y}
  const [textInput, setTextInput] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    annotations.forEach(ann => {
      if (ann.type === "stroke") {
        ctx.strokeStyle = ann.color; ctx.lineWidth = ann.thickness;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        ann.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (ann.type === "text") {
        ctx.font = `bold ${ann.size || 18}px sans-serif`;
        ctx.fillStyle = "#000000"; ctx.fillText(ann.text, ann.x + 1, ann.y + 1); // shadow
        ctx.fillStyle = ann.color; ctx.fillText(ann.text, ann.x, ann.y);
      }
    });

    if (currentStroke?.points?.length > 1) {
      ctx.strokeStyle = currentStroke.color; ctx.lineWidth = currentStroke.thickness;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      currentStroke.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    }
  }, [annotations, currentStroke, imgLoaded]);

  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    const cx = touch ? touch.clientX : e.clientX;
    const cy = touch ? touch.clientY : e.clientY;
    const z = zoomRef.current;
    return { x: (cx - rect.left) / z, y: (cy - rect.top) / z };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    const pos = getPos(e);
    if (tool === "text") {
      setAddingText(pos);
      setTextInput("");
      return;
    }
    setIsDrawing(true);
    if (tool === "pen") {
      setCurrentStroke({ type: "stroke", color, thickness, points: [pos] });
    } else if (tool === "eraser") {
      // Remove strokes/texts near click
      setAnnotations(prev => prev.filter(ann => {
        if (ann.type === "stroke") return !ann.points.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 20);
        if (ann.type === "text") return Math.hypot(ann.x - pos.x, ann.y - pos.y) > 40;
        return true;
      }));
    }
  };

  const onPointerMove = (e) => {
    if (!isDrawing || tool !== "pen") return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
  };

  const onPointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (tool === "pen" && currentStroke?.points?.length > 1) {
      setAnnotations(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const commitText = () => {
    if (addingText && textInput.trim()) {
      setAnnotations(prev => [...prev, { type: "text", text: textInput.trim(), x: addingText.x, y: addingText.y, color, size: 18 }]);
    }
    setAddingText(null);
    setTextInput("");
  };

  const undo = () => setAnnotations(prev => prev.slice(0, -1));

  const handleSave = () => {
    const canvas = canvasRef.current;
    const annotatedUrl = canvas.toDataURL("image/jpeg", 0.92);
    onSave({ ...photo, url: annotatedUrl, annotations });
  };

  // Fit image into fixed display size
  const MAX_W = Math.min(window.innerWidth - 40, 900);
  const MAX_H = Math.min(window.innerHeight - 200, 600);

  const [canvasSize, setCanvasSize] = useState({ w: MAX_W, h: MAX_H });

  const onImgLoad = () => {
    const img = imgRef.current;
    const ar = img.naturalWidth / img.naturalHeight;
    let w = MAX_W, h = MAX_W / ar;
    if (h > MAX_H) { h = MAX_H; w = MAX_H * ar; }
    setCanvasSize({ w: Math.round(w), h: Math.round(h) });
    setImgLoaded(true);
  };

  const toolBtn = (t, label, icon) => (
    <button onPointerDown={e => { e.stopPropagation(); setTool(t); addingText && setAddingText(null); }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${tool === t ? "bg-slate-800 text-white border-transparent" : "bg-white text-slate-600 border-slate-200"}`}>
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxWidth: MAX_W + 40, width: "100%" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-white">
          <span className="font-semibold text-sm flex-1">Annotate Photo</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
          {toolBtn("pen", "Draw", <Pencil className="w-3.5 h-3.5" />)}
          {toolBtn("text", "Text", <Type className="w-3.5 h-3.5" />)}
          {toolBtn("eraser", "Erase", <Eraser className="w-3.5 h-3.5" />)}
          <div className="w-px h-6 bg-slate-300 mx-0.5" />
          {COLORS.map(c => (
            <button key={c} onPointerDown={e => { e.stopPropagation(); setColor(c); }}
              className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: color === c ? "#f59e0b" : "#d1d5db" }} />
          ))}
          <div className="w-px h-6 bg-slate-300 mx-0.5" />
          {[2, 4, 8].map(t => (
            <button key={t} onPointerDown={e => { e.stopPropagation(); setThickness(t); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border ${thickness === t ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="rounded-full bg-slate-700" style={{ width: Math.min(t * 2.5, 14), height: Math.min(t * 2.5, 14) }} />
            </button>
          ))}
          <div className="ml-auto flex gap-1.5">
            <button onPointerDown={e => { e.stopPropagation(); undo(); }} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500"><Undo2 className="w-3.5 h-3.5" /></button>
            <button onPointerDown={e => { e.stopPropagation(); handleSave(); }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />Save
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="overflow-auto flex items-center justify-center bg-slate-100 p-3">
          <div style={{ position: "relative", width: canvasSize.w * zoom, height: canvasSize.h * zoom }}>
            <img ref={imgRef} src={photo.url} alt="" onLoad={onImgLoad} style={{ display: "none" }} crossOrigin="anonymous" />
            <canvas ref={canvasRef}
              width={canvasSize.w} height={canvasSize.h}
              style={{ width: canvasSize.w * zoom, height: canvasSize.h * zoom, cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair", touchAction: "none", display: "block", userSelect: "none" }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            />
            {/* Text input overlay */}
            {addingText && (
              <div style={{ position: "absolute", left: addingText.x * zoom, top: addingText.y * zoom, zIndex: 10 }}>
                <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setAddingText(null); }}
                  onBlur={commitText}
                  style={{ background: "rgba(0,0,0,0.7)", color: color, border: "2px dashed " + color, borderRadius: 4, padding: "2px 6px", fontSize: 16, fontWeight: "bold", minWidth: 80, outline: "none" }}
                  placeholder="Type here, Enter to place"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <span>{tool === "text" ? "Click on photo to place text" : tool === "eraser" ? "Click strokes to erase" : "Draw on the photo"}</span>
          <div className="flex items-center gap-2">
            <button onPointerDown={e => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.25)); }} className="p-1 rounded hover:bg-slate-200"><ZoomIn className="w-3.5 h-3.5" /></button>
            <span className="font-mono">{Math.round(zoom * 100)}%</span>
            <button onPointerDown={e => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.25)); }} className="p-1 rounded hover:bg-slate-200"><ZoomOut className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}