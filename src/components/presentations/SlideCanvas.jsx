import { useEffect, useRef, useState } from "react";
import { Canvas, PencilBrush, FabricImage, Rect, Circle, Line, Textbox, Group, Triangle } from "fabric";
import { base44 } from "@/api/base44Client";
import CanvasToolbar from "./CanvasToolbar";
import { parseImagesLayout } from "./slideHelpers";

export default function SlideCanvas({ slide, onUpdate, editable = true }) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const saveTimerRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isRestoringRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const slideRef = useRef(slide);

  const toolRef = useRef("select");
  const strokeColorRef = useRef("#ef4444");
  const strokeWidthRef = useRef(3);
  const fillColorRef = useRef("#3b82f6");
  const fillEnabledRef = useRef(false);
  const cropModeRef = useRef(false);
  const editableRef = useRef(editable);

  const shapeStartRef = useRef(null);
  const currentShapeRef = useRef(null);
  const cropRectRef = useRef(null);
  const fileInputRef = useRef(null);

  const [activeTool, setActiveTool] = useState("select");
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillColor, setFillColor] = useState("#3b82f6");
  const [fillEnabled, setFillEnabled] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { slideRef.current = slide; }, [slide]);
  useEffect(() => { toolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);
  useEffect(() => { fillEnabledRef.current = fillEnabled; }, [fillEnabled]);
  useEffect(() => { cropModeRef.current = cropMode; }, [cropMode]);
  useEffect(() => { editableRef.current = editable; }, [editable]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getCanvasState = (canvas) => {
    const json = canvas.toJSON();
    delete json.backgroundImage;
    return JSON.stringify(json);
  };

  const pushUndoState = () => {
    if (isRestoringRef.current || !fabricRef.current) return;
    const state = getCanvasState(fabricRef.current);
    undoStackRef.current.push(state);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(false);
  };

  const debouncedSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!fabricRef.current) return;
      const json = fabricRef.current.toJSON();
      delete json.backgroundImage;
      onUpdateRef.current({ canvas_json: JSON.stringify(json) });
    }, 800);
  };

  const restoreState = async (state) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    isRestoringRef.current = true;
    const bg = canvas.backgroundImage;
    await canvas.loadFromJSON(JSON.parse(state));
    canvas.backgroundImage = bg;
    canvas.renderAll();
    isRestoringRef.current = false;
  };

  // ─── Undo / Redo / Delete ─────────────────────────────────────────────────
  const handleUndo = () => {
    if (undoStackRef.current.length < 2) return;
    const current = undoStackRef.current.pop();
    redoStackRef.current.push(current);
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    restoreState(prev);
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const state = redoStackRef.current.pop();
    undoStackRef.current.push(state);
    restoreState(state);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleDelete = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  // ─── Crop ──────────────────────────────────────────────────────────────────
  const startCropMode = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const w = canvas.width * 0.6;
    const h = canvas.height * 0.6;
    const rect = new Rect({
      left: (canvas.width - w) / 2,
      top: (canvas.height - h) / 2,
      width: w, height: h,
      fill: "rgba(59,130,246,0.08)",
      stroke: "#3b82f6",
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      cornerColor: "#3b82f6",
      cornerSize: 10,
      transparentCorners: false,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    cropRectRef.current = rect;
    setCropMode(true);
  };

  const cancelCrop = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (cropRectRef.current) {
      canvas.remove(cropRectRef.current);
      cropRectRef.current = null;
    }
    canvas.renderAll();
    setCropMode(false);
    setActiveTool("select");
  };

  const applyCrop = async () => {
    const canvas = fabricRef.current;
    const rect = cropRectRef.current;
    if (!canvas || !rect) return;

    const cl = rect.left;
    const ct = rect.top;
    const cw = rect.width * (rect.scaleX || 1);
    const ch = rect.height * (rect.scaleY || 1);

    // Hide annotations, capture background-only
    const objects = canvas.getObjects().filter(o => o !== rect);
    objects.forEach(o => o.set({ visible: false }));
    canvas.renderAll();

    try {
      const fullDataUrl = canvas.toDataURL({ format: "png" });

      // Restore + remove crop rect
      objects.forEach(o => o.set({ visible: true }));
      canvas.remove(rect);
      canvas.renderAll();

      // Crop via off-screen canvas
      const img = new Image();
      img.src = fullDataUrl;
      await new Promise(r => { img.onload = r; });

      const tc = document.createElement("canvas");
      tc.width = Math.round(cw);
      tc.height = Math.round(ch);
      const ctx = tc.getContext("2d");
      ctx.drawImage(img, cl, ct, cw, ch, 0, 0, cw, ch);

      const blob = await new Promise(r => tc.toBlob(r, "image/png"));
      const file = new File([blob], "cropped.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Set as new background
      const newImg = await FabricImage.fromURL(file_url, { crossOrigin: "anonymous" });
      const scale = Math.min(canvas.width / cw, canvas.height / ch);
      newImg.set({
        left: (canvas.width - cw * scale) / 2,
        top: (canvas.height - ch * scale) / 2,
        scaleX: scale, scaleY: scale,
        selectable: false, evented: false,
      });
      canvas.backgroundImage = newImg;
      canvas.renderAll();

      // Persist canvas_json + updated images field
      const json = canvas.toJSON();
      delete json.backgroundImage;
      const imgs = parseImagesLayout(slideRef.current);
      const newImgs = imgs.length > 0
        ? imgs.map((im, i) => i === 0 ? { ...im, url: file_url } : im)
        : [{ url: file_url, x: 5, y: 5, width: 90, height: 90, crop: null, zIndex: 0 }];
      onUpdateRef.current({
        canvas_json: JSON.stringify(json),
        images: JSON.stringify(newImgs),
      });
      pushUndoState();
    } catch (e) {
      console.error("Crop failed:", e);
      objects.forEach(o => o.set({ visible: true }));
      canvas.renderAll();
    }

    cropRectRef.current = null;
    setCropMode(false);
    setActiveTool("select");
  };

  // ─── Initialize Fabric canvas (re-init on slide change) ─────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return;
    let disposed = false;
    setReady(false);

    const canvas = new Canvas(canvasElRef.current, {
      backgroundColor: "#f8fafc",
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Responsive resize
    const resize = () => {
      if (!containerRef.current || disposed) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        canvas.setDimensions({ width: w, height: h });
        canvas.renderAll();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    // Load canvas — image lives ONLY as a Fabric object, never as a background <img>
    const init = async () => {
      canvas.clear();

      if (slideRef.current.canvas_json) {
        // Saved canvas JSON already contains the image + annotations
        try {
          const saved = JSON.parse(slideRef.current.canvas_json);
          if (disposed) return;
          await canvas.loadFromJSON(saved);
          canvas.renderAll();
        } catch (e) { console.error("Canvas JSON load failed:", e); }
      } else {
        // No saved canvas — load image_3d as a Fabric object only
        const imgs = parseImagesLayout(slideRef.current);
        const imgUrl = imgs[0]?.url;
        if (imgUrl) {
          try {
            const img = await FabricImage.fromURL(imgUrl, { crossOrigin: "anonymous" });
            if (disposed) return;
            img.scaleToWidth(canvas.width);
            canvas.add(img);
            canvas.sendToBack(img);
            canvas.renderAll();
          } catch (e) { console.error("Image load failed:", e); }
        }
      }

      if (disposed) return;
      setReady(true);
      undoStackRef.current = [getCanvasState(canvas)];
      setCanUndo(false);
      setCanRedo(false);
    };

    init();

    // ── Mouse handlers for shape drawing ───────────────────────────────────
    const onMouseDown = (opt) => {
      if (!editableRef.current || cropModeRef.current) return;
      const tool = toolRef.current;
      if (tool === "select") return;

      const pointer = canvas.getPointer(opt.e);
      shapeStartRef.current = { x: pointer.x, y: pointer.y };

      if (tool === "text") {
        const text = new Textbox("", {
          left: pointer.x, top: pointer.y,
          width: 200, fontSize: 20,
          fill: strokeColorRef.current,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        shapeStartRef.current = null;
        setActiveTool("select");
        return;
      }

      if (tool === "rect") {
        const r = new Rect({
          left: pointer.x, top: pointer.y, width: 1, height: 1,
          fill: fillEnabledRef.current ? fillColorRef.current : "transparent",
          stroke: strokeColorRef.current, strokeWidth: strokeWidthRef.current,
        });
        canvas.add(r);
        currentShapeRef.current = r;
      } else if (tool === "circle") {
        const c = new Circle({
          left: pointer.x, top: pointer.y, radius: 1,
          originX: "center", originY: "center",
          fill: fillEnabledRef.current ? fillColorRef.current : "transparent",
          stroke: strokeColorRef.current, strokeWidth: strokeWidthRef.current,
        });
        canvas.add(c);
        currentShapeRef.current = c;
      } else if (tool === "line" || tool === "arrow") {
        const l = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColorRef.current, strokeWidth: strokeWidthRef.current,
        });
        canvas.add(l);
        currentShapeRef.current = l;
      }
    };

    const onMouseMove = (opt) => {
      const shape = currentShapeRef.current;
      if (!shape) return;
      const pointer = canvas.getPointer(opt.e);
      const start = shapeStartRef.current;

      if (shape instanceof Rect) {
        shape.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
        });
      } else if (shape instanceof Circle) {
        const r = Math.sqrt((pointer.x - start.x) ** 2 + (pointer.y - start.y) ** 2) / 2;
        shape.set({
          left: (start.x + pointer.x) / 2,
          top: (start.y + pointer.y) / 2,
          radius: Math.max(1, r),
        });
      } else if (shape instanceof Line) {
        shape.set({ x2: pointer.x, y2: pointer.y });
      }

      canvas.renderAll();
    };

    const onMouseUp = () => {
      const shape = currentShapeRef.current;
      if (!shape) return;

      // Arrow: replace line with line+triangle group
      if (toolRef.current === "arrow" && shape instanceof Line) {
        const { x1, y1, x2, y2 } = shape;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLen = 10 + strokeWidthRef.current * 2;
        const tri = new Triangle({
          left: x2, top: y2,
          originX: "center", originY: "center",
          width: arrowLen, height: arrowLen,
          angle: (angle * 180) / Math.PI + 90,
          fill: strokeColorRef.current,
        });
        canvas.remove(shape);
        const group = new Group([shape, tri]);
        canvas.add(group);
      }

      currentShapeRef.current = null;
      shapeStartRef.current = null;
      if (toolRef.current !== "draw") setActiveTool("select");
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    // Selection tracking
    canvas.on("selection:created", () => setHasSelection(true));
    canvas.on("selection:updated", () => setHasSelection(true));
    canvas.on("selection:cleared", () => setHasSelection(false));

    // Auto-save + undo push
    const onChange = () => {
      if (isRestoringRef.current) return;
      pushUndoState();
      debouncedSave();
    };
    canvas.on("object:added", onChange);
    canvas.on("object:modified", onChange);
    canvas.on("object:removed", onChange);
    canvas.on("path:created", onChange);

    return () => {
      disposed = true;
      ro.disconnect();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [slide.id]);

  // ─── Tool state effect ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    const isSelect = activeTool === "select" && !cropMode;
    canvas.selection = isSelect && editable;
    canvas.isDrawingMode = activeTool === "draw" && editable && !cropMode;

    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    canvas.forEachObject(obj => {
      const isCropRect = obj === cropRectRef.current;
      if (cropMode) {
        obj.selectable = isCropRect;
        obj.evented = isCropRect;
      } else {
        obj.selectable = isSelect && editable;
        obj.evented = isSelect && editable;
      }
    });

    canvas.defaultCursor = isSelect ? "default" : "crosshair";
    canvas.renderAll();
  }, [activeTool, editable, ready, cropMode, strokeColor, strokeWidth]);

  // ─── Add image ──────────────────────────────────────────────────────────────
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const img = await FabricImage.fromURL(file_url, { crossOrigin: "anonymous" });

      const maxW = canvas.width * 0.7;
      const maxH = canvas.height * 0.7;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);

      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      // If no background image exists yet, set this as the first image (for thumbnail + print)
      const imgs = parseImagesLayout(slideRef.current);
      if (imgs.length === 0) {
        const newImgs = [{ url: file_url, x: 5, y: 5, width: 90, height: 90, crop: null, zIndex: 0 }];
        onUpdateRef.current({ images: JSON.stringify(newImgs) });
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  // ─── Tool change handler ────────────────────────────────────────────────────
  const handleToolChange = (tool) => {
    if (tool === "crop") {
      startCropMode();
    } else {
      if (cropMode) cancelCrop();
      setActiveTool(tool);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {editable && (
        <CanvasToolbar
          activeTool={cropMode ? "crop" : activeTool}
          onToolChange={handleToolChange}
          strokeColor={strokeColor}
          onStrokeColorChange={setStrokeColor}
          fillColor={fillColor}
          onFillColorChange={setFillColor}
          fillEnabled={fillEnabled}
          onFillEnabledChange={setFillEnabled}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={hasSelection}
          cropMode={cropMode}
          onApplyCrop={applyCrop}
          onCancelCrop={cancelCrop}
          onAddImage={() => fileInputRef.current?.click()}
        />
      )}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <canvas ref={canvasElRef} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
}