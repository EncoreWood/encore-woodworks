import { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, ArrowRight, Type, MousePointer, Undo2, Trash2, Image, Minus, Plus } from "lucide-react";

// Canvas dimensions — fixed, always 11" x 8.5" at 96dpi
export const CANVAS_W = 1056;
export const CANVAS_H = 816;

const COLORS = ["#1e293b", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"];

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

function buildDefaultJSON(roomName, spec) {
  const objects = [];
  objects.push({
    type: "textbox", left: 40, top: 28, width: 700,
    text: roomName || "Room Name",
    fontSize: 32, fontFamily: "Georgia", fontWeight: "bold", fill: "#1e293b",
    editable: true, name: "room_name",
  });
  objects.push({
    type: "line", x1: 0, y1: 0, x2: CANVAS_W - 80, y2: 0,
    left: 40, top: 84, stroke: "#1e293b", strokeWidth: 2,
    selectable: false, evented: false, name: "title_rule",
  });
  objects.push({
    type: "rect", left: 40, top: 100, width: CANVAS_W - 80, height: 480,
    fill: "#f8fafc", stroke: "#cbd5e1", strokeWidth: 1, strokeDashArray: [6, 4],
    rx: 4, ry: 4, selectable: false, evented: false, name: "image_zone",
  });
  objects.push({
    type: "textbox", left: CANVAS_W / 2 - 120, top: 310, width: 240,
    text: "Drop images here\nor use Add Image",
    fontSize: 14, fill: "#94a3b8", textAlign: "center",
    selectable: false, evented: false, name: "image_zone_hint",
  });
  const tableTop = 600;
  const colW = (CANVAS_W - 80) / SPEC_FIELDS.length;
  SPEC_FIELDS.forEach((field, i) => {
    const x = 40 + i * colW;
    objects.push({ type: "rect", left: x, top: tableTop, width: colW, height: 28, fill: "#f1f5f9", stroke: "#cbd5e1", strokeWidth: 1, selectable: false, evented: false, name: `th_bg_${field.key}` });
    objects.push({ type: "textbox", left: x + 4, top: tableTop + 4, width: colW - 8, height: 20, text: field.label, fontSize: 9, fontWeight: "bold", fill: "#475569", selectable: false, evented: false, name: `th_${field.key}` });
    objects.push({ type: "rect", left: x, top: tableTop + 28, width: colW, height: 32, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, selectable: false, evented: false, name: `td_bg_${field.key}` });
    objects.push({ type: "textbox", left: x + 4, top: tableTop + 32, width: colW - 8, height: 24, text: (spec && spec[field.key]) || "", fontSize: 10, fill: "#1e293b", editable: true, name: `td_${field.key}` });
  });
  return { version: "5.3.1", objects };
}

function extractSpec(canvas) {
  if (!canvas) return {};
  const spec = {};
  SPEC_FIELDS.forEach(f => {
    const obj = canvas.getObjects().find(o => o.name === `td_${f.key}`);
    if (obj) spec[f.key] = obj.text || "";
  });
  return spec;
}

function extractRoomName(canvas) {
  if (!canvas) return "";
  const obj = canvas.getObjects().find(o => o.name === "room_name");
  return obj?.text || "";
}

// ─── Context Menu Component ───────────────────────────────────────────────────
function ContextMenu({ x, y, target, onCrop, onRemoveCrop, onBringForward, onSendBackward, onDelete, onClose }) {
  const isImage = target?.type === "image";
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px] text-sm"
      style={{ left: x, top: y }}
      onMouseDown={e => e.stopPropagation()}
    >
      {isImage && (
        <>
          <button onClick={onCrop} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
            ✂️ Crop Image
          </button>
          {target.clipPath && (
            <button onClick={onRemoveCrop} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
              🔄 Remove Crop
            </button>
          )}
          <div className="border-t border-slate-100 my-1" />
        </>
      )}
      <button onClick={onBringForward} className="w-full text-left px-4 py-2 hover:bg-slate-50">
        ⬆️ Bring Forward
      </button>
      <button onClick={onSendBackward} className="w-full text-left px-4 py-2 hover:bg-slate-50">
        ⬇️ Send Backward
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600">
        🗑️ Delete
      </button>
    </div>
  );
}

// ─── Google Slides-style Crop Overlay ────────────────────────────────────────
// Shows dark overlay outside crop area, with draggable handles
function CropOverlay({ canvas, img, onApply, onCancel, scale }) {
  const overlayRef = useRef(null);
  const isDragging = useRef(false);
  const dragHandle = useRef(null);
  const dragStart = useRef(null);

  // Initial crop = full image bounds
  const imgBounds = img.getBoundingRect(true);
  const [crop, setCrop] = useState({
    x: imgBounds.left,
    y: imgBounds.top,
    w: imgBounds.width,
    h: imgBounds.height,
  });

  const imgB = { x: imgBounds.left, y: imgBounds.top, w: imgBounds.width, h: imgBounds.height };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const handleMouseDown = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragHandle.current = handle;
    dragStart.current = { x: e.clientX, y: e.clientY, crop: { ...crop } };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.x) / scale;
    const dy = (e.clientY - dragStart.current.y) / scale;
    const c = { ...dragStart.current.crop };

    if (dragHandle.current === "move") {
      setCrop({
        x: clamp(c.x + dx, imgB.x, imgB.x + imgB.w - c.w),
        y: clamp(c.y + dy, imgB.y, imgB.y + imgB.h - c.h),
        w: c.w, h: c.h,
      });
      return;
    }
    let nx = c.x, ny = c.y, nw = c.w, nh = c.h;
    if (dragHandle.current.includes("e")) nw = clamp(c.w + dx, 20, imgB.x + imgB.w - c.x);
    if (dragHandle.current.includes("s")) nh = clamp(c.h + dy, 20, imgB.y + imgB.h - c.y);
    if (dragHandle.current.includes("w")) {
      const delta = clamp(dx, c.x - imgB.x - c.w + 20, c.w - 20);
      nx = c.x + delta; nw = c.w - delta;
    }
    if (dragHandle.current.includes("n")) {
      const delta = clamp(dy, c.y - imgB.y - c.h + 20, c.h - 20);
      ny = c.y + delta; nh = c.h - delta;
    }
    setCrop({ x: nx, y: ny, w: nw, h: nh });
  }, [scale, imgB]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  // Canvas container pixel positions
  const cx = crop.x * scale;
  const cy = crop.y * scale;
  const cw = crop.w * scale;
  const ch = crop.h * scale;
  const cw2 = CANVAS_W * scale;
  const ch2 = CANVAS_H * scale;

  const handleStyle = "absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize z-10";
  const edgeStyle = "absolute bg-white border-2 border-blue-500 z-10";

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20"
      style={{ width: cw2, height: ch2, pointerEvents: "all" }}
      onDoubleClick={() => onApply(crop)}
    >
      {/* Dark overlay — 4 rects around the crop area */}
      {/* Top */}
      <div className="absolute bg-black/50" style={{ left: 0, top: 0, width: cw2, height: cy }} />
      {/* Bottom */}
      <div className="absolute bg-black/50" style={{ left: 0, top: cy + ch, width: cw2, height: ch2 - cy - ch }} />
      {/* Left */}
      <div className="absolute bg-black/50" style={{ left: 0, top: cy, width: cx, height: ch }} />
      {/* Right */}
      <div className="absolute bg-black/50" style={{ left: cx + cw, top: cy, width: cw2 - cx - cw, height: ch }} />

      {/* Crop border */}
      <div
        className="absolute border-2 border-blue-400 cursor-move"
        style={{ left: cx, top: cy, width: cw, height: ch }}
        onMouseDown={e => handleMouseDown(e, "move")}
      >
        {/* Rule of thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute border-white/30 border-dashed border" style={{ left: "33.33%", top: 0, bottom: 0, width: 0, borderLeft: "1px dashed rgba(255,255,255,0.4)" }} />
          <div className="absolute border-white/30 border-dashed border" style={{ left: "66.66%", top: 0, bottom: 0, width: 0, borderLeft: "1px dashed rgba(255,255,255,0.4)" }} />
          <div className="absolute border-white/30 border-dashed border" style={{ top: "33.33%", left: 0, right: 0, height: 0, borderTop: "1px dashed rgba(255,255,255,0.4)" }} />
          <div className="absolute border-white/30 border-dashed border" style={{ top: "66.66%", left: 0, right: 0, height: 0, borderTop: "1px dashed rgba(255,255,255,0.4)" }} />
        </div>
      </div>

      {/* Corner handles */}
      <div className={handleStyle} style={{ left: cx - 6, top: cy - 6, cursor: "nw-resize" }} onMouseDown={e => handleMouseDown(e, "nw")} />
      <div className={handleStyle} style={{ left: cx + cw - 6, top: cy - 6, cursor: "ne-resize" }} onMouseDown={e => handleMouseDown(e, "ne")} />
      <div className={handleStyle} style={{ left: cx - 6, top: cy + ch - 6, cursor: "sw-resize" }} onMouseDown={e => handleMouseDown(e, "sw")} />
      <div className={handleStyle} style={{ left: cx + cw - 6, top: cy + ch - 6, cursor: "se-resize" }} onMouseDown={e => handleMouseDown(e, "se")} />

      {/* Edge handles */}
      <div className={edgeStyle} style={{ left: cx + cw / 2 - 12, top: cy - 4, width: 24, height: 8, cursor: "n-resize" }} onMouseDown={e => handleMouseDown(e, "n")} />
      <div className={edgeStyle} style={{ left: cx + cw / 2 - 12, top: cy + ch - 4, width: 24, height: 8, cursor: "s-resize" }} onMouseDown={e => handleMouseDown(e, "s")} />
      <div className={edgeStyle} style={{ left: cx - 4, top: cy + ch / 2 - 12, width: 8, height: 24, cursor: "w-resize" }} onMouseDown={e => handleMouseDown(e, "w")} />
      <div className={edgeStyle} style={{ left: cx + cw - 4, top: cy + ch / 2 - 12, width: 8, height: 24, cursor: "e-resize" }} onMouseDown={e => handleMouseDown(e, "e")} />

      {/* Action buttons */}
      <div className="absolute flex gap-2" style={{ left: cx, top: cy + ch + 8 }}>
        <button
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded shadow-lg hover:bg-blue-700"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => onApply(crop)}
        >
          ✓ Apply Crop
        </button>
        <button
          className="px-3 py-1.5 bg-white text-slate-700 text-xs rounded shadow-lg border hover:bg-slate-50"
          onMouseDown={e => e.stopPropagation()}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FabricSlideCanvas({ slide, onUpdate, editable = true, containerWidth = 900 }) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const [fabric, setFabric] = useState(null);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropTarget, setCropTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, target }
  const saveTimerRef = useRef(null);
  const arrowStartRef = useRef(null);
  const arrowLineRef = useRef(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const canvasWrapperRef = useRef(null);

  const scale = Math.min(1, (containerWidth - 16) / CANVAS_W);

  useEffect(() => {
    loadFabric().then(f => setFabric(f));
  }, []);

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
    }, 1200);
  }, [editable, onUpdate, slide.room_name]);

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

      // Double-click on image → enter crop mode
      canvas.on("mouse:dblclick", (opt) => {
        const target = opt.target;
        if (target && target.type === "image") {
          canvas.discardActiveObject();
          canvas.renderAll();
          setCropTarget(target);
          setIsCropping(true);
        }
      });
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [fabric]);

  // Suppress browser context menu on canvas, show custom one
  useEffect(() => {
    if (!editable || !canvasWrapperRef.current) return;
    const el = canvasWrapperRef.current;
    const handleContextMenu = (e) => {
      e.preventDefault();
      if (!fabricRef.current) return;
      // Find object under cursor (account for scale)
      const rect = el.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) / scale;
      const canvasY = (e.clientY - rect.top) / scale;
      const target = fabricRef.current.findTarget({ clientX: e.clientX, clientY: e.clientY }) ||
        fabricRef.current.getObjects().reverse().find(obj => {
          const b = obj.getBoundingRect(true);
          return canvasX >= b.left && canvasX <= b.left + b.width && canvasY >= b.top && canvasY <= b.top + b.height;
        });
      if (target) {
        fabricRef.current.setActiveObject(target);
        fabricRef.current.renderAll();
        setContextMenu({ x: e.clientX, y: e.clientY, target });
      }
    };
    el.addEventListener("contextmenu", handleContextMenu);
    return () => el.removeEventListener("contextmenu", handleContextMenu);
  }, [editable, scale]);

  const initDefault = (canvas, fab) => {
    const spec = (() => { try { return JSON.parse(slide.notes || "{}"); } catch { return {}; } })();
    const defaultJSON = buildDefaultJSON(slide.room_name, spec);
    canvas.loadFromJSON(defaultJSON, () => canvas.renderAll());
  };

  // Tool switching
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = tool === "draw";
    if (tool === "draw") {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
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
    const line = new fabric.Line([p.x, p.y, p.x, p.y], { stroke: color, strokeWidth, selectable: false, evented: false });
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
    const line = new fabric.Line([start.x, start.y, p.x - (14 * dx) / len, p.y - (14 * dy) / len], { stroke: color, strokeWidth, selectable: true });
    const head = new fabric.Triangle({ width: strokeWidth * 4 + 6, height: strokeWidth * 4 + 6, fill: color, left: p.x, top: p.y, angle: angle + 90, originX: "center", originY: "center", selectable: true });
    canvas.add(line, head);
    canvas.renderAll();
    scheduleSave();
  };

  const handleTextDown = (opt) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const p = canvas.getPointer(opt.e);
    const text = new fabric.Textbox("Label", { left: p.x, top: p.y, width: 150, fontSize: 16, fill: color, fontFamily: "Arial", editable: true });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
    setTool("select");
    scheduleSave();
  };

  // Add image — reliable: read as data URL first, load into fabric from that
  const addImageFile = useCallback(async (file) => {
    if (!file || !fabricRef.current) return;
    setUploading(true);
    try {
      // Read locally first for immediate display
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Load into canvas immediately from local data URL (no CORS issues)
      window.fabric.Image.fromURL(dataUrl, (img) => {
        if (!fabricRef.current) return;
        const maxW = 500, maxH = 400;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        img.scale(ratio);
        img.set({ left: 80, top: 120, selectable: true });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        fabricRef.current.renderAll();
        // Upload in background and swap src (so saved JSON has remote URL)
        base44.integrations.Core.UploadFile({ file }).then(({ file_url }) => {
          window.fabric.Image.fromURL(file_url, (remoteImg) => {
            if (!fabricRef.current) return;
            remoteImg.set({
              left: img.left, top: img.top,
              scaleX: img.scaleX, scaleY: img.scaleY,
              clipPath: img.clipPath,
            });
            fabricRef.current.remove(img);
            fabricRef.current.add(remoteImg);
            fabricRef.current.setActiveObject(remoteImg);
            fabricRef.current.renderAll();
            scheduleSave();
          }, { crossOrigin: "anonymous" });
        }).catch(() => {
          // If upload fails, keep the local version and save anyway
          scheduleSave();
        });
      });
    } catch (err) {
      console.error("Image load error", err);
    } finally {
      setUploading(false);
    }
  }, [scheduleSave]);

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (file) { await addImageFile(file); e.target.value = ""; }
  };

  // Global paste handler
  useEffect(() => {
    if (!editable) return;
    const handlePaste = async (e) => {
      if (!fabricRef.current) return;
      const active = fabricRef.current.getActiveObject();
      if (active && (active.type === "textbox" || active.type === "text") && active.isEditing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
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
    if (objs.length > 0) { canvas.remove(objs[objs.length - 1]); canvas.renderAll(); }
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

  const handleBringForward = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) { canvas.bringForward(obj); canvas.renderAll(); scheduleSave(); }
  };

  const handleSendBackward = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) { canvas.sendBackwards(obj); canvas.renderAll(); scheduleSave(); }
  };

  // Apply crop from overlay
  const handleApplyCrop = useCallback((cropArea) => {
    const img = cropTarget;
    const canvas = fabricRef.current;
    if (!img || !canvas) { setIsCropping(false); setCropTarget(null); return; }

    const clip = new window.fabric.Rect({
      left: (cropArea.x - img.left) / img.scaleX,
      top: (cropArea.y - img.top) / img.scaleY,
      width: cropArea.w / img.scaleX,
      height: cropArea.h / img.scaleY,
      absolutePositioned: false,
    });
    img.clipPath = clip;
    canvas.renderAll();
    setIsCropping(false);
    setCropTarget(null);
    scheduleSave();
  }, [cropTarget, scheduleSave]);

  const handleCancelCrop = useCallback(() => {
    setIsCropping(false);
    setCropTarget(null);
  }, []);

  const handleRemoveCrop = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && obj.type === "image") { obj.clipPath = null; canvas.renderAll(); scheduleSave(); }
  }, [scheduleSave]);

  // Context menu actions
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

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
          <div className="flex gap-1">
            {tools.map(t => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                className={`p-1.5 rounded transition-colors text-sm ${tool === t.id ? "bg-amber-100 text-amber-700" : "hover:bg-slate-100 text-slate-600"}`}>
                {t.icon}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition-transform ${color === c ? "border-slate-800 scale-125" : "border-slate-300"}`}
                style={{ background: c }} />
            ))}
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-1">
            <button onClick={() => setStrokeWidth(w => Math.max(1, w - 1))} className="p-1 hover:bg-slate-100 rounded"><Minus className="w-3 h-3" /></button>
            <span className="text-xs font-mono w-3 text-center">{strokeWidth}</span>
            <button onClick={() => setStrokeWidth(w => Math.min(12, w + 1))} className="p-1 hover:bg-slate-100 rounded"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <label className="flex items-center gap-1 cursor-pointer px-2 py-1 hover:bg-slate-100 rounded text-xs text-slate-600 transition-colors">
            {uploading ? <span className="animate-pulse">Uploading…</span> : <><Image className="w-3.5 h-3.5" /> Add Image</>}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleAddImage} />
          </label>
          <div className="w-px h-5 bg-slate-200" />
          <button onClick={handleUndo} title="Undo last" className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={handleDeleteSelected} title="Delete selected" className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          {isCropping && (
            <>
              <div className="w-px h-5 bg-slate-200" />
              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 font-medium animate-pulse">✂ Cropping… drag handles or Apply</span>
              <button onClick={handleCancelCrop} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
            </>
          )}
        </div>
      )}

      {/* Canvas wrapper */}
      <div
        ref={canvasWrapperRef}
        style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, position: "relative", flexShrink: 0 }}
      >
        <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "top left", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", background: "#fff" }}>
          <canvas ref={canvasElRef} />
        </div>

        {/* Google Slides-style crop overlay */}
        {isCropping && cropTarget && (
          <CropOverlay
            canvas={fabricRef.current}
            img={cropTarget}
            onApply={handleApplyCrop}
            onCancel={handleCancelCrop}
            scale={scale}
          />
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onCrop={() => {
            if (contextMenu.target?.type === "image") {
              fabricRef.current?.discardActiveObject();
              fabricRef.current?.renderAll();
              setCropTarget(contextMenu.target);
              setIsCropping(true);
            }
            closeContextMenu();
          }}
          onRemoveCrop={() => {
            if (contextMenu.target?.type === "image") {
              contextMenu.target.clipPath = null;
              fabricRef.current?.renderAll();
              scheduleSave();
            }
            closeContextMenu();
          }}
          onBringForward={() => { handleBringForward(); closeContextMenu(); }}
          onSendBackward={() => { handleSendBackward(); closeContextMenu(); }}
          onDelete={() => {
            const canvas = fabricRef.current;
            if (canvas && contextMenu.target) {
              canvas.remove(contextMenu.target);
              canvas.discardActiveObject();
              canvas.renderAll();
              scheduleSave();
            }
            closeContextMenu();
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}