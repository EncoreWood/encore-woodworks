import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Minus, Square, Circle, Type, Undo2, Trash2, X, Check, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
  "#92400e", "#1e40af",
];

const SIZES = [2, 4, 8, 14, 22];

export default function SketchPad({ onClose, onSave, existingImageUrl }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const snapshotRef = useRef(null);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext("2d");

  // Fill background
  const fillBackground = useCallback((ctx, canvas) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [bgColor]);

  useEffect(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    canvas.width = 800;
    canvas.height = 540;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (existingImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = existingImageUrl;
    }
  }, []);

  const saveSnapshot = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const snapshot = canvas.toDataURL();
    setHistory(prev => [...prev.slice(-30), snapshot]);
  };

  const getPos = (e) => {
    const canvas = getCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    saveSnapshot();
    setIsDrawing(true);
    setStartPos(pos);
    snapshotRef.current = getCanvas().toDataURL();

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === "fill") {
      floodFill(ctx, Math.round(pos.x), Math.round(pos.y), color);
      setIsDrawing(false);
    } else if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.font = `${size * 4}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(text, pos.x, pos.y);
      }
      setIsDrawing(false);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    const canvas = getCanvas();
    const pos = getPos(e);

    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.strokeStyle = bgColor;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "line" || tool === "rect" || tool === "circle") {
      // Restore snapshot to avoid ghosting
      const img = new Image();
      img.src = snapshotRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "source-over";
        if (tool === "line") {
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (tool === "rect") {
          ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        } else if (tool === "circle") {
          const rx = Math.abs(pos.x - startPos.x) / 2;
          const ry = Math.abs(pos.y - startPos.y) / 2;
          const cx = Math.min(startPos.x, pos.x) + rx;
          const cy = Math.min(startPos.y, pos.y) + ry;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      };
    }
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const ctx = getCtx();
    ctx.globalCompositeOperation = "source-over";
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    const canvas = getCanvas();
    const ctx = getCtx();
    const img = new Image();
    img.src = prev;
    img.onload = () => ctx.drawImage(img, 0, 0);
  };

  const clearCanvas = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    saveSnapshot();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    setSaving(true);
    const canvas = getCanvas();
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    const file = new File([blob], "sketch.png", { type: "image/png" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSaving(false);
    onSave(file_url);
  };

  const toolList = [
    { key: "pen", icon: Pencil, label: "Pen" },
    { key: "eraser", icon: Eraser, label: "Eraser" },
    { key: "line", icon: Minus, label: "Line" },
    { key: "rect", icon: Square, label: "Rectangle" },
    { key: "circle", icon: Circle, label: "Circle" },
    { key: "text", icon: Type, label: "Text" },
  ];

  const cursor = tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-300 border-b border-gray-400 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          {toolList.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => setTool(key)}
              className={`p-1.5 rounded text-sm transition-all ${tool === key ? "bg-amber-500 text-white shadow" : "bg-white hover:bg-gray-100 text-slate-700"}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Sizes */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-full transition-all border ${size === s ? "border-amber-500 bg-amber-100" : "border-gray-300 bg-white"}`}
              style={{ width: s + 14, height: s + 14 }}
              title={`Size ${s}`}
            >
              <span className="sr-only">{s}</span>
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 flex-wrap border-r border-gray-400 pr-2 mr-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ background: c, border: color === c ? "2px solid #f59e0b" : "1px solid #9ca3af" }}
              className="w-6 h-6 rounded transition-all"
              title={c}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-gray-300" title="Custom color" />
        </div>

        {/* BG Color */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          <span className="text-xs text-slate-600">BG:</span>
          <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-gray-300" title="Background color" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={undo} title="Undo" className="p-1.5 rounded bg-white hover:bg-gray-100 text-slate-700 border border-gray-300">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={clearCanvas} title="Clear" className="p-1.5 rounded bg-white hover:bg-gray-100 text-red-600 border border-gray-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onClose} variant="outline" size="sm" className="bg-white">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={saving}>
            {saving ? "Saving..." : <><Check className="w-4 h-4 mr-1" /> Save Sketch</>}
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <canvas
          ref={canvasRef}
          style={{ cursor, touchAction: "none", maxWidth: "100%", background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.18)", border: "1px solid #d1d5db" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    </div>,
    document.body
  );
}