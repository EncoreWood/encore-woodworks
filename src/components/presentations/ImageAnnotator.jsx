import { useEffect, useRef, useState } from "react";
import { X, Pencil, ArrowRight, Type, Undo2, Trash2, Check, Minus, Plus } from "lucide-react";

// Load Fabric.js from CDN once
let fabricPromise = null;
function loadFabric() {
  if (!fabricPromise) {
    fabricPromise = new Promise((resolve, reject) => {
      if (window.fabric) return resolve(window.fabric);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
      script.onload = () => resolve(window.fabric);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return fabricPromise;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#000000", "#ffffff"];

export default function ImageAnnotator({ imageUrl, onSave, onClose }) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const imgRef = useRef(null);
  const [fabric, setFabric] = useState(null);
  const [tool, setTool] = useState("draw"); // draw | arrow | text
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const arrowStartRef = useRef(null);
  const arrowLineRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFabric().then(f => setFabric(f));
  }, []);

  useEffect(() => {
    if (!fabric || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Max display size
      const maxW = Math.min(img.naturalWidth, window.innerWidth * 0.85);
      const maxH = Math.min(img.naturalHeight, window.innerHeight * 0.7);
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      setImgSize({ w, h });
      imgRef.current = img;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: w,
        height: h,
        isDrawingMode: true,
      });
      fabricRef.current = canvas;

      // Draw the base image as background
      canvas.setBackgroundImage(
        img.src,
        canvas.renderAll.bind(canvas),
        { scaleX: w / img.naturalWidth, scaleY: h / img.naturalHeight }
      );

      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
      setLoaded(true);
    };
    img.src = imageUrl;

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [fabric]);

  // Sync brush settings
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = strokeWidth;
  }, [color, strokeWidth]);

  // Switch tool modes
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = tool === "draw";
    canvas.selection = tool !== "draw" && tool !== "arrow";
    if (tool === "arrow") {
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");
      canvas.on("mouse:down", handleArrowDown);
      canvas.on("mouse:move", handleArrowMove);
      canvas.on("mouse:up", handleArrowUp);
    } else {
      canvas.off("mouse:down", handleArrowDown);
      canvas.off("mouse:move", handleArrowMove);
      canvas.off("mouse:up", handleArrowUp);
    }
    if (tool === "text") {
      canvas.off("mouse:down");
      canvas.on("mouse:down", handleTextDown);
    } else {
      canvas.off("mouse:down", handleTextDown);
    }
  }, [tool, color, strokeWidth]);

  const handleArrowDown = (opt) => {
    if (!fabricRef.current) return;
    const p = fabricRef.current.getPointer(opt.e);
    arrowStartRef.current = p;
    const line = new fabric.Line([p.x, p.y, p.x, p.y], {
      stroke: color, strokeWidth, selectable: false, evented: false,
    });
    fabricRef.current.add(line);
    arrowLineRef.current = line;
    setIsDrawingArrow(true);
  };

  const handleArrowMove = (opt) => {
    if (!isDrawingArrow || !arrowLineRef.current || !fabricRef.current) return;
    const p = fabricRef.current.getPointer(opt.e);
    arrowLineRef.current.set({ x2: p.x, y2: p.y });
    fabricRef.current.renderAll();
  };

  const handleArrowUp = (opt) => {
    if (!fabricRef.current || !arrowStartRef.current) return;
    setIsDrawingArrow(false);
    const p = fabricRef.current.getPointer(opt.e);
    const start = arrowStartRef.current;
    if (arrowLineRef.current) fabricRef.current.remove(arrowLineRef.current);

    // Draw arrow with arrowhead using triangle
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    const line = new fabric.Line([start.x, start.y, p.x - (15 * dx / len), p.y - (15 * dy / len)], {
      stroke: color, strokeWidth, selectable: true,
    });
    const head = new fabric.Triangle({
      width: strokeWidth * 4 + 8,
      height: strokeWidth * 4 + 8,
      fill: color,
      left: p.x,
      top: p.y,
      angle: angle + 90,
      originX: "center",
      originY: "center",
      selectable: true,
    });
    fabricRef.current.add(line, head);
    fabricRef.current.renderAll();
    arrowLineRef.current = null;
    arrowStartRef.current = null;
  };

  const handleTextDown = (opt) => {
    if (!fabricRef.current) return;
    const p = fabricRef.current.getPointer(opt.e);
    const text = new fabric.IText("Text", {
      left: p.x, top: p.y,
      fontSize: 18, fill: color,
      fontFamily: "Arial",
      selectable: true, editable: true,
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    text.enterEditing();
    fabricRef.current.renderAll();
    // Switch back to select so user can move
    setTool("select");
  };

  const handleUndo = () => {
    if (!fabricRef.current) return;
    const objs = fabricRef.current.getObjects();
    if (objs.length > 0) {
      fabricRef.current.remove(objs[objs.length - 1]);
    }
  };

  const handleClear = () => {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects().forEach(o => fabricRef.current.remove(o));
    fabricRef.current.renderAll();
  };

  const handleSave = () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: "png", quality: 1 });
    onSave(dataUrl);
  };

  const tools = [
    { id: "draw", icon: <Pencil className="w-4 h-4" />, label: "Draw" },
    { id: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow" },
    { id: "text", icon: <Type className="w-4 h-4" />, label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-2xl px-4 py-2 mb-3 flex items-center gap-3 flex-wrap">
        {/* Tool buttons */}
        <div className="flex gap-1">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`p-2 rounded-lg transition-colors ${tool === t.id ? "bg-amber-100 text-amber-700" : "hover:bg-slate-100 text-slate-600"}`}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-slate-200" />
        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "border-slate-800 scale-125" : "border-slate-300"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-slate-200" />
        {/* Stroke width */}
        <div className="flex items-center gap-1">
          <button onClick={() => setStrokeWidth(w => Math.max(1, w - 1))} className="p-1 hover:bg-slate-100 rounded"><Minus className="w-3 h-3" /></button>
          <span className="text-xs w-4 text-center font-mono">{strokeWidth}</span>
          <button onClick={() => setStrokeWidth(w => Math.min(12, w + 1))} className="p-1 hover:bg-slate-100 rounded"><Plus className="w-3 h-3" /></button>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        {/* Actions */}
        <button onClick={handleUndo} title="Undo" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Undo2 className="w-4 h-4" /></button>
        <button onClick={handleClear} title="Clear all" className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
        <button onClick={handleSave} title="Save" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Save</button>
        <button onClick={onClose} title="Cancel" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
      </div>

      {/* Canvas */}
      <div className="relative shadow-2xl rounded overflow-hidden" style={{ background: "#f8f8f8" }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">Loading...</div>
        )}
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}