import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Trash2, Undo2, Download, Type, Minus, Plus, StickyNote } from "lucide-react";

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];

export default function Notepad() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [paths, setPaths] = useState([]);
  const [textNote, setTextNote] = useState("");
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const storageKey = useRef(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      const key = `notepad_${u.email}`;
      storageKey.current = key;
      // Load saved text note
      const savedText = localStorage.getItem(`${key}_text`);
      if (savedText) setTextNote(savedText);
      // Load saved canvas paths
      const savedPaths = localStorage.getItem(`${key}_paths`);
      if (savedPaths) setPaths(JSON.parse(savedPaths));
    });
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffef5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    paths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      path.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });

    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }
  }, [paths, currentPath, color, lineWidth]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches || e.changedTouches) {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const eraseAt = (pos) => {
    const threshold = lineWidth * 5;
    setPaths((prev) =>
      prev.filter((path) => !path.points.some((pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < threshold))
    );
  };

  const startDraw = (e) => {
    if (e.type === "mousedown" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e);
    if (tool === "eraser") { eraseAt(pos); return; }
    setCurrentPath([pos]);
  };

  const moveDraw = (e) => {
    if (!drawing) return;
    if (e.type === "mousemove" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "eraser") { eraseAt(pos); return; }
    setCurrentPath((prev) => [...prev, pos]);
  };

  const stopDraw = (e) => {
    if (e?.type === "mouseup" && e.sourceCapabilities?.firesTouchEvents) return;
    if (drawing && tool === "pen" && currentPath.length > 0) {
      const newPaths = [...paths, { points: currentPath, color, lineWidth }];
      setPaths(newPaths);
      if (storageKey.current) localStorage.setItem(`${storageKey.current}_paths`, JSON.stringify(newPaths));
      setCurrentPath([]);
    }
    setDrawing(false);
  };

  const handleUndo = () => {
    setPaths((prev) => {
      const updated = prev.slice(0, -1);
      if (storageKey.current) localStorage.setItem(`${storageKey.current}_paths`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClear = () => {
    setPaths([]);
    if (storageKey.current) localStorage.removeItem(`${storageKey.current}_paths`);
  };

  const handleTextChange = (e) => {
    setTextNote(e.target.value);
    if (storageKey.current) localStorage.setItem(`${storageKey.current}_text`, e.target.value);
  };

  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "notepad.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const cursorStyle = tool === "eraser" ? "cell" : "crosshair";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <StickyNote className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Notepad</h1>
            {user && <p className="text-sm text-slate-500">{user.full_name}'s personal notepad</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Text Notes */}
          <div className="bg-white rounded-2xl shadow-md border border-amber-100 flex flex-col" style={{ minHeight: 400 }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100">
              <Type className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-slate-700">Text Notes</span>
              <span className="ml-auto text-xs text-slate-400">Auto-saved</span>
            </div>
            <textarea
              value={textNote}
              onChange={handleTextChange}
              placeholder="Write your notes here... auto-saved to your account."
              className="flex-1 p-4 resize-none text-slate-700 text-sm leading-relaxed outline-none rounded-b-2xl"
              style={{ minHeight: 360, backgroundColor: "#fffef5", fontFamily: "Georgia, serif" }}
            />
          </div>

          {/* Drawing Canvas */}
          <div className="bg-white rounded-2xl shadow-md border border-amber-100 flex flex-col">
            {/* Canvas Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100 flex-wrap">
              <Button
                size="sm"
                variant={tool === "pen" ? "default" : "outline"}
                onClick={() => setTool("pen")}
                className={tool === "pen" ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> Pen
              </Button>
              <Button
                size="sm"
                variant={tool === "eraser" ? "default" : "outline"}
                onClick={() => setTool("eraser")}
                className={tool === "eraser" ? "bg-slate-600 hover:bg-slate-700" : ""}
              >
                <Eraser className="w-3.5 h-3.5 mr-1" /> Erase
              </Button>

              {/* Color swatches */}
              <div className="flex items-center gap-1 ml-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setTool("pen"); }}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#f59e0b" : "#d1d5db",
                      transform: color === c ? "scale(1.2)" : undefined
                    }}
                  />
                ))}
              </div>

              {/* Line width */}
              <div className="flex items-center gap-1 ml-1">
                <button onClick={() => setLineWidth((w) => Math.max(1, w - 1))} className="text-slate-500 hover:text-slate-700">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-600 w-4 text-center">{lineWidth}</span>
                <button onClick={() => setLineWidth((w) => Math.min(20, w + 1))} className="text-slate-500 hover:text-slate-700">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={handleUndo}>
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadCanvas}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleClear} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-2">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full rounded-lg border border-amber-50"
                style={{ cursor: cursorStyle, touchAction: "none", backgroundColor: "#fffef5", display: "block" }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={stopDraw}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={stopDraw}
                onPointerLeave={stopDraw}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}