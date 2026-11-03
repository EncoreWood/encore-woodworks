import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MousePointer2, PenLine, Type, Square, Circle, Minus,
  ImageIcon, Undo2, Trash2, X, Check, Save, FolderOpen, Loader2
} from "lucide-react";
import { Canvas, IText, Rect, Ellipse, Line, Image as FabricImage, PencilBrush } from "fabric";
import { base44 } from "@/api/base44Client";
import { useUpdateGuard } from "@/lib/updateGuards";
import { validSketchJson } from "@/lib/productionItemDraft";

// Simple modal that doesn't conflict with Radix parent dialogs
function SimpleModal({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Fabric.js v6 is bundled locally (npm) — no CDN script to load or block, so
// the sketch pad opens reliably on the shop iPad as well.

const COLORS = ["#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];
const SIZES = [2, 4, 8, 14, 22];

// (v5 CDN loader removed — fabric v6 is imported directly at the top.)

export default function SketchPad({ onClose, onSave, existingImageUrl, initialSketchJson, onDraftJson }) {
  useUpdateGuard(); // unsaved drawing in progress
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const padRootRef = useRef(null);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [saving, setSaving] = useState(false);
  const [historyStack, setHistoryStack] = useState([]);
  const isDrawingShape = useRef(false);
  const shapeOrigin = useRef(null);
  const activeShape = useRef(null);
  const imageInputRef = useRef(null);

  // One-time canvas guard + draft plumbing. The canvas must never be rebuilt
  // because a parent re-rendered, and its strokes are handed back to the form
  // (debounced) so a crash can still recover the drawing.
  const initRef = useRef(false);
  const hydratingRef = useRef(false);
  const checkpointRef = useRef(null);
  const latestJsonRef = useRef(null);
  const draftTimerRef = useRef(null);
  const initialPropsRef = useRef({ existingImageUrl, initialSketchJson });
  const onDraftJsonRef = useRef(onDraftJson);

  useEffect(() => {
    onDraftJsonRef.current = onDraftJson;
  }, [onDraftJson]);

  const serializeCanvas = useCallback((fc) => {
    try {
      return JSON.stringify(fc.toJSON(["selectable", "evented"]));
    } catch {
      return null;
    }
  }, []);

  const queueDraftSave = useCallback((snapshot) => {
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (snapshot) onDraftJsonRef.current?.(snapshot);
    }, 500);
  }, []);

  useEffect(() => () => clearTimeout(draftTimerRef.current), []);

  // Template saving
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateShared, setTemplateShared] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Template loading
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  // iPad: block iOS pinch-zoom while the pad is open, so a palm resting on
  // the screen mid-sketch doesn't zoom the page out from under the canvas.
  useEffect(() => {
    const el = padRootRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });
    return () => {
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
    };
  }, []);

  // Build the canvas exactly ONCE. Rebuilding it on a parent re-render (or
  // disposing it mid-stroke) is what used to crash the pad and lose the drawing.
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || initRef.current) return;
    initRef.current = true;

    const fc = new Canvas(el, {
      width: 900,
      height: 560,
      backgroundColor: "#ffffff",
      selection: true,
    });
    fabricCanvasRef.current = fc;

    // iPad/Safari: stop the browser from treating stylus and touch moves on
    // the canvas as page pan/zoom gestures, which breaks strokes mid-draw.
    el.style.touchAction = "none";
    if (fc.wrapperEl) fc.wrapperEl.style.touchAction = "none";
    if (fc.upperCanvasEl) fc.upperCanvasEl.style.touchAction = "none";

    // Checkpoint only when a stroke/object actually finishes — never mid-draw —
    // and keep the last 20 snapshots so a long session can't exhaust memory.
    const checkpoint = () => {
      if (hydratingRef.current || fabricCanvasRef.current !== fc) return;
      const snapshot = serializeCanvas(fc);
      if (!snapshot) return;
      latestJsonRef.current = snapshot;
      setHistoryStack((prev) => {
        const next = [...prev, snapshot];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
      queueDraftSave(snapshot);
    };
    checkpointRef.current = checkpoint;

    // Reopen an in-progress sketch from the draft, otherwise fall back to the
    // image of a sketch that was already saved on the card.
    const hydrate = async () => {
      hydratingRef.current = true;
      const saved = validSketchJson(initialPropsRef.current.initialSketchJson);
      if (saved) {
        try {
          await fc.loadFromJSON(saved);
          if (fabricCanvasRef.current !== fc) return;
          fc.getObjects().forEach((o) => o.set({ selectable: true, evented: true }));
          fc.renderAll();
          return;
        } catch (e) {
          console.warn("Sketch restore failed — starting from the saved image:", e);
        }
      }
      const url = initialPropsRef.current.existingImageUrl;
      if (url) {
        try {
          const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
          if (fabricCanvasRef.current !== fc) return;
          img.scaleToWidth(fc.width);
          fc.add(img);
          fc.sendObjectToBack(img);
          fc.renderAll();
        } catch {
          // image unavailable — leave the pad blank rather than failing
        }
      }
    };

    Promise.resolve(hydrate()).finally(() => {
      if (fabricCanvasRef.current !== fc) return;
      hydratingRef.current = false;
      fc.on("path:created", checkpoint); // freehand stroke finished
      fc.on("object:modified", checkpoint); // object moved / scaled
      fc.on("object:removed", checkpoint);
      const baseline = serializeCanvas(fc);
      if (baseline) {
        latestJsonRef.current = baseline;
        setHistoryStack([baseline]);
      }
    });

    return () => {
      initRef.current = false;
      checkpointRef.current = null;
      clearTimeout(draftTimerRef.current);
      if (fabricCanvasRef.current === fc) fabricCanvasRef.current = null;
      try {
        fc.dispose();
      } catch {
        // already disposed
      }
    };
  }, [serializeCanvas, queueDraftSave]);

  // Update drawing mode and tool behavior
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    // Remove shape-drawing listeners
    fc.off("mouse:down");
    fc.off("mouse:move");
    fc.off("mouse:up");

    if (tool === "pen") {
      fc.isDrawingMode = true;
      // fabric 6 doesn't auto-create the drawing brush — create it on demand
      if (!fc.freeDrawingBrush) fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = color;
      fc.freeDrawingBrush.width = strokeWidth;
      fc.selection = false;
    } else if (tool === "select") {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.getObjects().forEach(o => o.set({ selectable: true, evented: true }));
      fc.renderAll();
    } else if (tool === "text") {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.getObjects().forEach(o => o.set({ selectable: false, evented: false }));
      fc.renderAll();
      fc.on("mouse:down", (opt) => {
        const pointer = fc.getPointer(opt.e);
        const text = new IText("Text", {
          left: pointer.x,
          top: pointer.y,
          fontSize: strokeWidth * 4 + 8,
          fill: color,
          selectable: true,
          evented: true,
        });
        fc.add(text);
        fc.setActiveObject(text);
        text.enterEditing();
        fc.renderAll();
        checkpointRef.current?.();
        // Switch back to select after placing
        setTool("select");
      });
    } else if (["rect", "circle", "line"].includes(tool)) {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.getObjects().forEach(o => o.set({ selectable: false, evented: false }));
      fc.renderAll();

      fc.on("mouse:down", (opt) => {
        isDrawingShape.current = true;
        const pointer = fc.getPointer(opt.e);
        shapeOrigin.current = { x: pointer.x, y: pointer.y };

        if (tool === "rect") {
          activeShape.current = new Rect({
            left: pointer.x, top: pointer.y,
            width: 1, height: 1,
            stroke: color, strokeWidth, fill: "transparent",
            selectable: false, evented: false,
          });
        } else if (tool === "circle") {
          activeShape.current = new Ellipse({
            left: pointer.x, top: pointer.y,
            rx: 1, ry: 1,
            stroke: color, strokeWidth, fill: "transparent",
            selectable: false, evented: false,
          });
        } else if (tool === "line") {
          activeShape.current = new Line(
            [pointer.x, pointer.y, pointer.x, pointer.y],
            { stroke: color, strokeWidth, selectable: false, evented: false }
          );
        }
        if (activeShape.current) fc.add(activeShape.current);
      });

      fc.on("mouse:move", (opt) => {
        if (!isDrawingShape.current || !activeShape.current) return;
        const pointer = fc.getPointer(opt.e);
        const origin = shapeOrigin.current;

        if (tool === "rect") {
          const w = pointer.x - origin.x;
          const h = pointer.y - origin.y;
          activeShape.current.set({
            left: w < 0 ? pointer.x : origin.x,
            top: h < 0 ? pointer.y : origin.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        } else if (tool === "circle") {
          const rx = Math.abs(pointer.x - origin.x) / 2;
          const ry = Math.abs(pointer.y - origin.y) / 2;
          activeShape.current.set({
            left: Math.min(origin.x, pointer.x),
            top: Math.min(origin.y, pointer.y),
            rx, ry,
          });
        } else if (tool === "line") {
          activeShape.current.set({ x2: pointer.x, y2: pointer.y });
        }
        fc.renderAll();
      });

      fc.on("mouse:up", () => {
        if (!isDrawingShape.current) return;
        isDrawingShape.current = false;
        if (activeShape.current) {
          activeShape.current.set({ selectable: true, evented: true });
          fc.setActiveObject(activeShape.current);
          activeShape.current = null;
        }
        fc.renderAll();
        checkpointRef.current?.();
        setTool("select");
      });
    }
  }, [tool, color, strokeWidth]);

  // Keep pen color/width in sync
  useEffect(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || !fc.freeDrawingBrush) return;
    fc.freeDrawingBrush.color = color;
    fc.freeDrawingBrush.width = strokeWidth;
  }, [color, strokeWidth]);

  const undo = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || historyStack.length < 2) return;
    const prev = historyStack[historyStack.length - 2];
    setHistoryStack((s) => s.slice(0, -1));
    hydratingRef.current = true;
    fc.loadFromJSON(prev)
      .then(() => {
        fc.getObjects().forEach((o) => o.set({ selectable: true, evented: true }));
        fc.renderAll();
      })
      .catch(() => {})
      .finally(() => {
        hydratingRef.current = false;
        latestJsonRef.current = prev;
        queueDraftSave(prev);
      });
  }, [historyStack, queueDraftSave]);

  const clearCanvas = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    hydratingRef.current = true;
    fc.clear();
    fc.backgroundColor = "#ffffff";
    fc.renderAll();
    hydratingRef.current = false;
    const snapshot = serializeCanvas(fc);
    if (snapshot) {
      latestJsonRef.current = snapshot;
      setHistoryStack((prev) => [...prev, snapshot].slice(-20));
      queueDraftSave(snapshot);
    }
  }, [serializeCanvas, queueDraftSave]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      FabricImage.fromURL(ev.target.result).then((img) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        img.scaleToWidth(Math.min(300, fc.width / 2));
        fc.add(img);
        fc.setActiveObject(img);
        fc.renderAll();
        checkpointRef.current?.();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    setSaving(true);
    try {
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "sketch.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSave(file_url);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    const fc = fabricCanvasRef.current;
    if (!fc || !templateName.trim()) return;
    setSavingTemplate(true);
    // Deselect all objects before saving so no active selection is captured
    fc.discardActiveObject();
    fc.renderAll();
    const canvasJson = JSON.stringify(fc.toJSON(["selectable", "evented"]));
    const dataUrl = fc.toDataURL({ format: "png", multiplier: 0.5 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "sketch_thumb.png", { type: "image/png" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.SavedSketch.create({
      name: templateName.trim(),
      canvas_json: canvasJson,
      thumbnail_url: file_url,
      is_shared: templateShared,
      owner_email: currentUser?.email || "",
    });
    setSavingTemplate(false);
    setShowSaveTemplate(false);
    setTemplateName("");
    setTemplateShared(false);
  };

  const openLoadTemplate = async () => {
    setShowLoadTemplate(true);
    setLoadingTemplates(true);
    const all = await base44.entities.SavedSketch.list();
    const userEmail = currentUser?.email;
    const filtered = all.filter(s => s.is_shared || s.owner_email === userEmail);
    setTemplates(filtered);
    setLoadingTemplates(false);
  };

  const loadTemplate = (sketch) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    setShowLoadTemplate(false);
    // canvas_json may be a string or already parsed object — never load junk
    const json = validSketchJson(typeof sketch.canvas_json === "string" ? sketch.canvas_json : JSON.stringify(sketch.canvas_json));
    if (!json) return;
    hydratingRef.current = true;
    fc.loadFromJSON(json)
      .then(() => {
        fc.getObjects().forEach(o => o.set({ selectable: true, evented: true }));
        fc.renderAll();
      })
      .catch(() => {})
      .finally(() => {
        hydratingRef.current = false;
        queueDraftSave(json);
      });
  };

  const toolList = [
    { key: "select", icon: MousePointer2, label: "Select" },
    { key: "pen", icon: PenLine, label: "Pen" },
    { key: "text", icon: Type, label: "Text" },
    { key: "rect", icon: Square, label: "Rectangle" },
    { key: "circle", icon: Circle, label: "Circle" },
    { key: "line", icon: Minus, label: "Line" },
  ];

  return createPortal(
    <div ref={padRootRef} className="fixed inset-0 z-[9999] flex flex-col bg-gray-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-300 border-b border-gray-400 flex-wrap shrink-0">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          {toolList.map(({ key, icon: Icon, label }) => (
            <button key={key} type="button" title={label} onClick={() => setTool(key)}
              className={`p-1.5 rounded text-sm transition-all ${tool === key ? "bg-amber-500 text-white shadow" : "bg-white hover:bg-gray-100 text-slate-700"}`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
          {/* Image upload */}
          <button type="button" title="Upload Image" onClick={() => imageInputRef.current?.click()}
            className="p-1.5 rounded text-sm bg-white hover:bg-gray-100 text-slate-700 transition-all">
            <ImageIcon className="w-4 h-4" />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Stroke widths */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          {SIZES.map(s => (
            <button key={s} type="button" onClick={() => setStrokeWidth(s)}
              className={`rounded-full transition-all border ${strokeWidth === s ? "border-amber-500 bg-amber-100" : "border-gray-300 bg-white"}`}
              style={{ width: s + 12, height: s + 12 }} title={`Size ${s}`} />
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 flex-wrap border-r border-gray-400 pr-2 mr-1">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ background: c, border: color === c ? "2px solid #f59e0b" : "1px solid #9ca3af" }}
              className="w-6 h-6 rounded transition-all" title={c} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-gray-300" />
        </div>

        {/* Undo / Clear */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          <button type="button" onClick={undo} title="Undo"
            className="p-1.5 rounded bg-white hover:bg-gray-100 text-slate-700 border border-gray-300">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={clearCanvas} title="Clear Canvas"
            className="p-1.5 rounded bg-white hover:bg-gray-100 text-red-600 border border-gray-300">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Templates */}
        <div className="flex items-center gap-1 border-r border-gray-400 pr-2 mr-1">
          <button type="button" onClick={() => setShowSaveTemplate(true)} title="Save as Template"
            className="p-1.5 rounded bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 flex items-center gap-1 text-xs px-2">
            <Save className="w-3.5 h-3.5" /> Template
          </button>
          <button type="button" onClick={openLoadTemplate} title="Load Template"
            className="p-1.5 rounded bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 flex items-center gap-1 text-xs px-2">
            <FolderOpen className="w-3.5 h-3.5" /> Load
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" onClick={onClose} variant="outline" size="sm" className="bg-white">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button type="button" onClick={handleSave} size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            {saving ? "Saving..." : "Save Sketch"}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <canvas ref={canvasElRef}
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)", border: "1px solid #d1d5db", maxWidth: "100%" }} />
      </div>

      {/* Save Template Modal */}
      <SimpleModal open={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Save as Template">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Template Name</label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g., Base Cabinet Layout" autoFocus />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Visibility:</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTemplateShared(false)}
                className={`px-3 py-1.5 rounded text-sm border transition-all ${!templateShared ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-700 border-gray-300"}`}>
                Private
              </button>
              <button type="button" onClick={() => setTemplateShared(true)}
                className={`px-3 py-1.5 rounded text-sm border transition-all ${templateShared ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-700 border-gray-300"}`}>
                Shared
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700"
              onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </SimpleModal>

      {/* Load Template Modal */}
      <SimpleModal open={showLoadTemplate} onClose={() => setShowLoadTemplate(false)} title="Load Template">
        {loadingTemplates ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : templates.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No saved templates found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {templates.map(sketch => (
              <button key={sketch.id} type="button" onClick={() => loadTemplate(sketch)}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-amber-400 hover:shadow-md transition-all text-left">
                {sketch.thumbnail_url ? (
                  <img src={sketch.thumbnail_url} alt={sketch.name} className="w-full h-28 object-contain bg-white" />
                ) : (
                  <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-slate-400 text-xs">No preview</div>
                )}
                <div className="px-2 py-1.5 bg-white">
                  <p className="text-xs font-medium text-slate-800 truncate">{sketch.name}</p>
                  <p className="text-xs text-slate-400">{sketch.is_shared ? "Shared" : "Private"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </SimpleModal>
    </div>,
    document.body
  );
}