import { useState, useRef, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Crop as CropIcon, Check } from "lucide-react";
import { parseImagesLayout } from "./slideHelpers";

function getPoint(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

// ─── Crop Overlay ─────────────────────────────────────────────────────────────
function CropOverlay({ crop, onChange, onApply, onCancel }) {
  const overlayRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const startHandle = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = getPoint(e);
    setDragging({ handle, startX: pt.x, startY: pt.y, orig: { ...crop } });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      e.preventDefault();
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pt = getPoint(e);
      const dxPct = ((pt.x - dragging.startX) / rect.width) * 100;
      const dyPct = ((pt.y - dragging.startY) / rect.height) * 100;
      const c = { ...dragging.orig };
      if (dragging.handle === "left") c.left = Math.max(0, Math.min(90 - c.right, dragging.orig.left + dxPct));
      if (dragging.handle === "right") c.right = Math.max(0, Math.min(90 - c.left, dragging.orig.right - dxPct));
      if (dragging.handle === "top") c.top = Math.max(0, Math.min(90 - c.bottom, dragging.orig.top + dyPct));
      if (dragging.handle === "bottom") c.bottom = Math.max(0, Math.min(90 - c.top, dragging.orig.bottom - dyPct));
      onChange(c);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, onChange]);

  const vL = crop.left, vT = crop.top;
  const vW = 100 - crop.left - crop.right;
  const vH = 100 - crop.top - crop.bottom;

  return (
    <div ref={overlayRef} className="absolute inset-0 z-50" onMouseDown={e => e.stopPropagation()}>
      <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: 0, right: 0, height: `${vT}%` }} />
      <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, bottom: 0, right: 0, height: `${crop.bottom}%` }} />
      <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: `${vT}%`, width: `${vL}%`, height: `${vH}%` }} />
      <div className="absolute bg-black/50 pointer-events-none" style={{ right: 0, top: `${vT}%`, width: `${crop.right}%`, height: `${vH}%` }} />

      <div className="absolute border-2 border-blue-400" style={{ left: `${vL}%`, top: `${vT}%`, width: `${vW}%`, height: `${vH}%` }}>
        <div onMouseDown={e => startHandle(e, "left")} onTouchStart={e => startHandle(e, "left")} className="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize" />
        <div onMouseDown={e => startHandle(e, "right")} onTouchStart={e => startHandle(e, "right")} className="absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize" />
        <div onMouseDown={e => startHandle(e, "top")} onTouchStart={e => startHandle(e, "top")} className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize" />
        <div onMouseDown={e => startHandle(e, "bottom")} onTouchStart={e => startHandle(e, "bottom")} className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize" />
      </div>

      <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-2">
        <button onClick={onApply} className="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow flex items-center gap-1 hover:bg-blue-700">
          <Check className="w-3 h-3" /> Apply
        </button>
        <button onClick={onCancel} className="px-3 py-1 bg-white text-slate-700 text-xs rounded shadow border hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  );
}

// ─── Image Layer ──────────────────────────────────────────────────────────────
export default function ImageLayer({ slide, onUpdate, editable = true }) {
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [localImages, setLocalImages] = useState([]);
  const [interacting, setInteracting] = useState(false);
  const [cropIdx, setCropIdx] = useState(null);
  const [cropState, setCropState] = useState(null);

  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const localImagesRef = useRef([]);

  const parsedImages = useMemo(
    () => parseImagesLayout(slide),
    [slide.images, slide.image_3d_url]
  );

  useEffect(() => { localImagesRef.current = localImages; }, [localImages]);
  useEffect(() => { setLocalImages(parsedImages); }, [parsedImages]);

  const commit = (newImages) => {
    setLocalImages(newImages);
    onUpdate({ images: JSON.stringify(newImages) });
  };

  const addImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newImg = {
        url: file_url, x: 10, y: 5, width: 50, height: 70,
        crop: null, zIndex: localImagesRef.current.length,
      };
      commit([...localImagesRef.current, newImg]);
    } finally { setUploading(false); }
  };

  const removeImage = (idx) => {
    commit(localImagesRef.current.filter((_, i) => i !== idx));
  };

  const onDragStart = (e, idx) => {
    if (!editable || cropIdx !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = getPoint(e);
    const img = localImagesRef.current[idx];
    if (!img) return;
    dragRef.current = { idx, startX: pt.x, startY: pt.y, origX: img.x, origY: img.y };
    setInteracting(true);
  };

  const onResizeStart = (e, idx) => {
    if (!editable || cropIdx !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = getPoint(e);
    const img = localImagesRef.current[idx];
    if (!img) return;
    resizeRef.current = { idx, startX: pt.x, startY: pt.y, origW: img.width, origH: img.height };
    setInteracting(true);
  };

  // Global move/end handlers — only active during drag/resize
  useEffect(() => {
    if (!interacting) return;

    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pt = getPoint(e);

      if (dragRef.current) {
        const { idx, startX, startY, origX, origY } = dragRef.current;
        const dxPct = ((pt.x - startX) / rect.width) * 100;
        const dyPct = ((pt.y - startY) / rect.height) * 100;
        const img = localImagesRef.current[idx];
        if (!img) return;
        const newX = Math.max(0, Math.min(100 - img.width, origX + dxPct));
        const newY = Math.max(0, Math.min(100 - img.height, origY + dyPct));
        setLocalImages(prev => prev.map((im, i) => i === idx ? { ...im, x: newX, y: newY } : im));
      }

      if (resizeRef.current) {
        const { idx, startX, startY, origW, origH } = resizeRef.current;
        const dxPct = ((pt.x - startX) / rect.width) * 100;
        const dyPct = ((pt.y - startY) / rect.height) * 100;
        const img = localImagesRef.current[idx];
        if (!img) return;
        const newW = Math.max(10, Math.min(100 - img.x, origW + dxPct));
        const newH = Math.max(10, Math.min(100 - img.y, origH + dyPct));
        setLocalImages(prev => prev.map((im, i) => i === idx ? { ...im, width: newW, height: newH } : im));
      }
    };

    const onEnd = () => {
      onUpdate({ images: JSON.stringify(localImagesRef.current) });
      dragRef.current = null;
      resizeRef.current = null;
      setInteracting(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [interacting, onUpdate]);

  // Crop
  const startCrop = (idx) => {
    const img = localImagesRef.current[idx];
    setCropIdx(idx);
    setCropState(img.crop || { top: 0, right: 0, bottom: 0, left: 0 });
  };

  const applyCrop = () => {
    if (cropIdx !== null && cropState) {
      const updated = localImagesRef.current.map((img, i) =>
        i === cropIdx ? { ...img, crop: cropState } : img
      );
      commit(updated);
    }
    setCropIdx(null);
    setCropState(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-50 border border-slate-200 rounded overflow-hidden"
      onDragOver={editable ? (e) => e.preventDefault() : undefined}
      onDrop={editable ? (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) addImage(f);
      } : undefined}
    >
      {localImages.length === 0 && editable && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-amber-600 transition-colors"
        >
          <Upload className="w-7 h-7" />
          <span className="text-sm">{uploading ? "Uploading..." : "Drop image here or click to upload"}</span>
        </button>
      )}

      {localImages.length === 0 && !editable && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">No image</div>
      )}

      {localImages.map((img, idx) => {
        const isCropping = cropIdx === idx;
        const cropStyle = img.crop
          ? { clipPath: `inset(${img.crop.top}% ${img.crop.right}% ${img.crop.bottom}% ${img.crop.left}%)` }
          : {};
        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: `${img.x}%`,
              top: `${img.y}%`,
              width: `${img.width}%`,
              height: `${img.height}%`,
              zIndex: img.zIndex || 0,
            }}
          >
            <div className="w-full h-full relative group">
              <img
                src={img.url}
                alt=""
                draggable={false}
                className="w-full h-full select-none"
                style={{ objectFit: "cover", ...cropStyle }}
                onMouseDown={editable && !isCropping ? (e) => onDragStart(e, idx) : undefined}
                onTouchStart={editable && !isCropping ? (e) => onDragStart(e, idx) : undefined}
              />

              {editable && !isCropping && (
                <>
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startCrop(idx)}
                    className="absolute top-1 left-1 bg-black/60 text-white rounded p-1 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Crop"
                  >
                    <CropIcon className="w-3.5 h-3.5" />
                  </button>
                  <div
                    onMouseDown={(e) => onResizeStart(e, idx)}
                    onTouchStart={(e) => onResizeStart(e, idx)}
                    className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize bg-white border border-slate-400 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  />
                </>
              )}

              {isCropping && (
                <CropOverlay
                  crop={cropState}
                  onChange={setCropState}
                  onApply={applyCrop}
                  onCancel={() => { setCropIdx(null); setCropState(null); }}
                />
              )}
            </div>
          </div>
        );
      })}

      {editable && localImages.length > 0 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-2 right-2 bg-white border border-slate-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-slate-50 z-20"
          title="Add image"
        >
          <Upload className="w-4 h-4 text-slate-600" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}