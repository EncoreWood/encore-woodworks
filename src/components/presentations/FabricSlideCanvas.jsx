import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, ArrowRight, Type, MousePointer, Undo2, Trash2, Image, Upload, Minus, Plus } from "lucide-react";

// Canvas dimensions — fixed, always 11" x 8.5" at 96dpi
export const CANVAS_W = 1056;
export const CANVAS_H = 816;

const COLORS = ["#1e293b", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"];

// Spec fields for the table
const SPEC_FIELDS = [
  { key: "wood_species", label: "Wood Species" },
  { key: "finish", label: "Finish" },
  { key: "crown_type", label: "Crown Type" },
  { key: "door_profile", label: "Door Profile" },
  { key: "ceiling_height", label: "Ceiling Ht" },
  { key: "cab_finished_height", label: "Cab Ht" },
  { key: "notes_bullets", label: "Notes" },
];

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

// Build the default initial canvas JSON for a new slide
function buildDefaultJSON(roomName, spec) {
  // We'll build objects array programmatically
  const objects = [];

  // Room name textbox
  objects.push({
    type: "textbox",
    left: 40,
    top: 28,
    width: 700,
    text: roomName || "Room Name",
    fontSize: 32,
    fontFamily: "Georgia",
    fontWeight: "bold",
    fill: "#1e293b",
    editable: true,
    name: "room_name",
  });

  // Horizontal rule (line under title)
  objects.push({
    type: "line",
    x1: 0, y1: 0, x2: CANVAS_W - 80, y2: 0,
    left: 40, top: 84,
    stroke: "#1e293b",
    strokeWidth: 2,
    selectable: false,
    evented: false,
    name: "title_rule",
  });

  // Image drop zone placeholder
  objects.push({
    type: "rect",
    left: 40,
    top: 100,
    width: CANVAS_W - 80,
    height: 480,
    fill: "#f8fafc",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    strokeDashArray: [6, 4],
    rx: 4,
    ry: 4,
    selectable: false,
    evented: false,
    name: "image_zone",
  });

  objects.push({
    type: "textbox",
    left: CANVAS_W / 2 - 120,
    top: 310,
    width: 240,
    text: "Drop images here\nor use Add Image",
    fontSize: 14,
    fill: "#94a3b8",
    textAlign: "center",
    selectable: false,
    evented: false,
    name: "image_zone_hint",
  });

  // Spec table at bottom
  const tableTop = 600;
  const colW = (CANVAS_W - 80) / SPEC_FIELDS.length;
  SPEC_FIELDS.forEach((field, i) => {
    const x = 40 + i * colW;
    // Header cell bg
    objects.push({
      type: "rect",
      left: x, top: tableTop,
      width: colW, height: 28,
      fill: "#f1f5f9", stroke: "#cbd5e1", strokeWidth: 1,
      selectable: false, evented: false,
      name: `th_bg_${field.key}`,
    });
    // Header label
    objects.push({
      type: "textbox",
      left: x + 4, top: tableTop + 4,
      width: colW - 8, height: 20,
      text: field.label,
      fontSize: 9,
      fontWeight: "bold",
      fill: "#475569",
      selectable: false, evented: false,
      name: `th_${field.key}`,
    });
    // Value cell bg
    objects.push({
      type: "rect",
      left: x, top: tableTop + 28,
      width: colW, height: 32,
      fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1,
      selectable: false, evented: false,
      name: `td_bg_${field.key}`,
    });
    // Value text (editable)
    objects.push({
      type: "textbox",
      left: x + 4, top: tableTop + 32,
      width: colW - 8, height: 24,
      text: (spec && spec[field.key]) || "",
      fontSize: 10,
      fill: "#1e293b",
      editable: true,
      name: `td_${field.key}`,
    });
  });

  return { version: "5.3.1", objects };
}

// Extract spec values from canvas objects
function extractSpec(canvas) {
  if (!canvas) return {};
  const spec = {};
  SPEC_FIELDS.forEach(f => {
    const obj = canvas.getObjects().find(o => o.name === `td_${f.key}`);
    if (obj) spec[f.key] = obj.text || "";
  });
  return spec;
}

// Extract room name from canvas
function extractRoomName(canvas) {
  if (!canvas) return "";
  const obj = canvas.getObjects().find(o => o.name === "room_name");
  return obj?.text || "";
}

export default function FabricSlideCanvas({ slide, onUpdate, editable = true, containerWidth = 900 }) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const [fabric, setFabric] = useState(null);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [uploading, setUploading] = useState(false);
  const saveTimerRef = useRef(null);
  const arrowStartRef = useRef(null);
  const arrowLineRef = useRef(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);

  // Scale to fit container
  const scale = Math.min(1, (containerWidth - 32) / CANVAS_W);

  useEffect(() => {
    loadFabric().then(f => setFabric(f));
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!fabric || !canvasElRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: "#ffffff",
      selection: editable,
    });
    fabricRef.current = canvas;

    // Load existing JSON or build default
    const json = slide.canvas_json;
    if (json) {
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        canvas.loadFromJSON(parsed, () => {
          canvas.renderAll();
          if (!editable) canvas.getObjects().forEach(o => { o.selectable = false; o.evented = false; });
        });
      } catch {
        initDefault(canvas, fabric);
      }
    } else {
      initDefault(canvas, fabric);
    }

    if (editable) {
      canvas.on("object:modified", scheduleSave);
      canvas.on("object:added", scheduleSave);
      canvas.on("object:removed", scheduleSave);
      canvas.on("text:changed", scheduleSave);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [fabric]);

  const initDefault = (canvas, fab) => {
    const spec = (() => { try { return JSON.parse(slide.notes || "{}"); } catch { return {}; } })();
    const defaultJSON = buildDefaultJSON(slide.room_name, spec);
    canvas.loadFromJSON(defaultJSON, () => canvas.renderAll());
  };

  const scheduleSave = useCallback(() => {
    if (!fabricRef.current || !editable) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const json = JSON.stringify(canvas.toJSON(["name"]));
      const thumbnail = canvas.toDataURL({ format: "png", quality: 0.8, multiplier: 0.5 });
      const roomName = extractRoomName(canvas);
      const spec = extractSpec(canvas);
      onUpdate({
        canvas_json: json,
        thumbnail_url: thumbnail,
        room_name: roomName || slide.room_name,
        notes: JSON.stringify(spec),
      });
    }, 1500);
  }, [editable, onUpdate, slide.room_name]);

  // Tool switching
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === "draw";
    if (tool === "draw") {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    // Remove old arrow/text listeners
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    if (tool === "arrow") {
      canvas.on("mouse:down", handleArrowDown);
      canvas.on("mouse:move", handleArrowMove);
      canvas.on("mouse:up", handleArrowUp);
    } else if (tool === "text") {
      canvas.on("mouse:down", handleTextDown);
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
    const canvas = fabricRef.current;
    if (!canvas || !arrowLineRef.current || !arrowStartRef.current) return;
    const p = canvas.getPointer(opt.e);
    arrowLineRef.current.set({ x2: p.x, y2: p.y });
    canvas.renderAll();
  };

  const handleArrowUp = (opt) => {
    const canvas = fabricRef.current;
    if (!canvas || !arrowStartRef.current) return;
    setIsDrawingArrow(false);
    const p = canvas.getPointer(opt.e);
    const start = arrowStartRef.current;
    if (arrowLineRef.current) canvas.remove(arrowLineRef.current);
    arrowLineRef.current = null;
    arrowStartRef.current = null;

    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const line = new fabric.Line(
      [start.x, start.y, p.x - (14 * dx) / len, p.y - (14 * dy) / len],
      { stroke: color, strokeWidth, selectable: true }
    );
    const head = new fabric.Triangle({
      width: strokeWidth * 4 + 6,
      height: strokeWidth * 4 + 6,
      fill: color,
      left: p.x, top: p.y,
      angle: angle + 90,
      originX: "center", originY: "center",
      selectable: true,
    });
    canvas.add(line, head);
    canvas.renderAll();
    scheduleSave();
  };

  const handleTextDown = (opt) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const p = canvas.getPointer(opt.e);
    const text = new fabric.Textbox("Label", {
      left: p.x, top: p.y,
      width: 150,
      fontSize: 16, fill: color,
      fontFamily: "Arial", editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
    setTool("select");
    scheduleSave();
  };

  // Add image from File object (shared by file picker and paste)
  const addImageFile = useCallback(async (file) => {
    if (!file || !fabricRef.current) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      window.fabric.Image.fromURL(file_url, (img) => {
        const maxW = 500;
        const maxH = 400;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        img.scale(ratio);
        img.set({ left: 80, top: 120, selectable: true });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
        scheduleSave();
      }, { crossOrigin: "anonymous" });
    } finally {
      setUploading(false);
    }
  }, [scheduleSave]);

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (file) await addImageFile(file);
  };

  // Global paste handler — picks up Ctrl+V clipboard images
  useEffect(() => {
    if (!editable) return;
    const handlePaste = async (e) => {
      if (!fabricRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) await addImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [editable, addImageFile]);

  const handleUndo = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (objs.length > 0) {
      canvas.remove(objs[objs.length - 1]);
      canvas.renderAll();
    }
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
    scheduleSave();
  };

  const tools = [
    { id: "select", icon: <MousePointer className="w-4 h-4" />, label: "Select" },
    { id: "draw", icon: <Pencil className="w-4 h-4" />, label: "Draw" },
    { id: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow" },
    { id: "text", icon: <Type className="w-4 h-4" />, label: "Text" },
  ];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Toolbar */}
      {editable && (
        <div className="no-print flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 mb-3 shadow-sm flex-wrap">
          {/* Tools */}
          <div className="flex gap-1">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={`p-1.5 rounded transition-colors text-sm ${tool === t.id ? "bg-amber-100 text-amber-700" : "hover:bg-slate-100 text-slate-600"}`}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-200" />
          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition-transform ${color === c ? "border-slate-800 scale-125" : "border-slate-300"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="w-px h-5 bg-slate-200" />
          {/* Stroke */}
          <div className="flex items-center gap-1">
            <button onClick={() => setStrokeWidth(w => Math.max(1, w - 1))} className="p-1 hover:bg-slate-100 rounded"><Minus className="w-3 h-3" /></button>
            <span className="text-xs font-mono w-3 text-center">{strokeWidth}</span>
            <button onClick={() => setStrokeWidth(w => Math.min(12, w + 1))} className="p-1 hover:bg-slate-100 rounded"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          {/* Add image */}
          <label className="flex items-center gap-1 cursor-pointer px-2 py-1 hover:bg-slate-100 rounded text-xs text-slate-600 transition-colors">
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Image className="w-3.5 h-3.5" /> Add Image
              </>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleAddImage} />
          </label>
          <div className="w-px h-5 bg-slate-200" />
          {/* Undo / Delete */}
          <button onClick={handleUndo} title="Undo last" className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={handleDeleteSelected} title="Delete selected" className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Canvas wrapper — scaled to fit, but internal size is fixed 1056×816 */}
      <div
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            background: "#fff",
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  );
}