import { X, Plus, Upload, Pencil, GripVertical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState, useRef, useCallback } from "react";
import ImageAnnotator from "./ImageAnnotator";

// ─── IMAGE FORMAT HELPERS ─────────────────────────────────────────────────────
// Each image is stored as {url, width} or legacy plain string
export function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizeImg);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(normalizeImg);
    // plain string
    return [normalizeImg(raw)];
  } catch {
    return [normalizeImg(raw)];
  }
}

function normalizeImg(item) {
  if (typeof item === "string") return { url: item, width: null };
  return { url: item.url, width: item.width || null };
}

export function serializeImages(imgs) {
  return JSON.stringify(imgs);
}

// ─── SPEC HELPERS ─────────────────────────────────────────────────────────────
export function parseSpec(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── RESIZABLE IMAGE ITEM ─────────────────────────────────────────────────────
function ResizableImage({ img, index, editable, onRemove, onResize, onAnnotate }) {
  const containerRef = useRef(null);
  const startRef = useRef(null);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const startW = containerRef.current ? containerRef.current.offsetWidth : (img.width || 300);
    startRef.current = { startX, startW };

    const onMove = (ev) => {
      const x = ev.clientX || (ev.touches && ev.touches[0].clientX);
      const delta = x - startRef.current.startX;
      const newW = Math.max(80, startRef.current.startW + delta);
      onResize(index, Math.round(newW));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [index, img.width, onResize]);

  const style = img.width ? { width: img.width + "px" } : {};

  return (
    <div
      ref={containerRef}
      className="relative group flex-shrink-0"
      style={style}
    >
      {/* Image with contain */}
      <div
        className="bg-slate-50 border border-slate-200 rounded overflow-hidden flex items-center justify-center"
        style={{ minHeight: 120, width: "100%" }}
      >
        <img
          src={img.url}
          alt={`img-${index}`}
          style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain", display: "block" }}
        />
      </div>

      {/* Hover controls */}
      {editable && (
        <>
          {/* Remove */}
          <button
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10"
          >
            <X className="w-3 h-3" />
          </button>
          {/* Annotate */}
          <button
            onClick={() => onAnnotate(index)}
            title="Annotate"
            className="absolute top-1 left-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-80 transition-opacity z-10 flex items-center justify-center bg-white/80 rounded"
            title="Drag to resize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-600" fill="currentColor">
              <rect x="6" y="0" width="2" height="10" />
              <rect x="0" y="6" width="10" height="2" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// ─── IMAGE GALLERY ────────────────────────────────────────────────────────────
function ImageGallery({ images, editable, onUpdate, uploading, onStartUpload }) {
  const [annotatingIdx, setAnnotatingIdx] = useState(null);

  const handleRemove = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    onUpdate(updated);
  };

  const handleResize = (idx, newWidth) => {
    const updated = images.map((img, i) => i === idx ? { ...img, width: newWidth } : img);
    onUpdate(updated);
  };

  const handleAnnotateSave = (dataUrl) => {
    const updated = images.map((img, i) => i === annotatingIdx ? { ...img, url: dataUrl } : img);
    onUpdate(updated);
    setAnnotatingIdx(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <ResizableImage
            key={i}
            img={img}
            index={i}
            editable={editable}
            onRemove={handleRemove}
            onResize={handleResize}
            onAnnotate={setAnnotatingIdx}
          />
        ))}
        {editable && (
          <label className="flex-shrink-0 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-colors bg-white border-2 border-dashed border-slate-300 rounded"
            style={{ minWidth: 100, minHeight: 80, padding: "12px 16px" }}>
            {uploading ? (
              <span className="text-xs text-slate-500">Uploading...</span>
            ) : (
              <>
                <Plus className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500 mt-1">Add Image</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={onStartUpload} />
          </label>
        )}
      </div>

      {annotatingIdx !== null && (
        <ImageAnnotator
          imageUrl={images[annotatingIdx]?.url}
          onSave={handleAnnotateSave}
          onClose={() => setAnnotatingIdx(null)}
        />
      )}
    </>
  );
}

// ─── SPEC TABLE ───────────────────────────────────────────────────────────────
function SpecCell({ value, onEdit, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const commit = () => { setEditing(false); onEdit(val); };

  if (editing) {
    return (
      <input
        autoFocus
        className="border border-amber-400 rounded px-1 py-0 text-xs w-full min-w-[60px] outline-none"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); }}
      />
    );
  }
  return (
    <span
      className="cursor-pointer hover:bg-amber-50 rounded px-1 py-0.5 min-w-[40px] inline-block text-xs"
      onClick={() => { setVal(value || ""); setEditing(true); }}
    >
      {value || <span className="text-slate-300">{placeholder || "—"}</span>}
    </span>
  );
}

function SpecTable({ spec, onSpecChange }) {
  const s = (key) => spec[key] || "";
  const upd = (key) => (val) => onSpecChange({ ...spec, [key]: val });

  return (
    <table className="w-full border-collapse text-xs mt-2">
      <tbody>
        <tr className="border border-slate-300">
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Wood Species / Finish</td>
          <td className="border border-slate-300 px-2 py-1"><SpecCell value={s("wood_species")} onEdit={upd("wood_species")} /></td>
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Crown Type</td>
          <td className="border border-slate-300 px-2 py-1"><SpecCell value={s("crown_type")} onEdit={upd("crown_type")} /></td>
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Ceiling Height</td>
          <td className="border border-slate-300 px-2 py-1"><SpecCell value={s("ceiling_height")} onEdit={upd("ceiling_height")} /></td>
        </tr>
        <tr className="border border-slate-300">
          <td className="border border-slate-300 px-2 py-1 bg-slate-50 align-top">
            <span className="font-semibold">Notes</span>
          </td>
          <td className="border border-slate-300 px-2 py-1" colSpan={3}>
            <SpecCell value={s("notes_bullets")} onEdit={upd("notes_bullets")} placeholder="• bullet notes" />
          </td>
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Door Profile</td>
          <td className="border border-slate-300 px-2 py-1"><SpecCell value={s("door_profile")} onEdit={upd("door_profile")} /></td>
        </tr>
        <tr className="border border-slate-300">
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Finish</td>
          <td className="border border-slate-300 px-2 py-1"><SpecCell value={s("finish")} onEdit={upd("finish")} /></td>
          <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 whitespace-nowrap">Cab Finished to Height</td>
          <td className="border border-slate-300 px-2 py-1" colSpan={3}><SpecCell value={s("cab_finished_height")} onEdit={upd("cab_finished_height")} /></td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── MAIN SLIDE PREVIEW ───────────────────────────────────────────────────────
export default function SlidePreview({ slide, onUpdate, editable = true }) {
  const [uploading, setUploading] = useState(false);
  const images = parseImages(slide.image_3d_url);
  const spec = parseSpec(slide.notes);

  const handleImagesUpdate = (updatedImgs) => {
    onUpdate({ image_3d_url: serializeImages(updatedImgs) });
  };

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = [...images, { url: file_url, width: null }];
      onUpdate({ image_3d_url: serializeImages(updated) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg overflow-hidden" style={{ fontFamily: "Georgia, serif" }}>
      {/* Room name header */}
      <div className="border-b-2 border-slate-800 px-6 pt-4 pb-3 bg-white">
        {editable ? (
          <input
            className="text-2xl font-bold text-slate-900 w-full border-none outline-none bg-transparent placeholder-slate-300"
            value={slide.room_name}
            onChange={e => onUpdate({ room_name: e.target.value })}
            placeholder="Room Name"
          />
        ) : (
          <h2 className="text-2xl font-bold text-slate-900">{slide.room_name}</h2>
        )}
        {editable ? (
          <input
            className="text-sm text-slate-500 w-full border-none outline-none bg-transparent placeholder-slate-300 mt-0.5"
            value={slide.slide_label || ""}
            onChange={e => onUpdate({ slide_label: e.target.value })}
            placeholder="Slide label (optional)"
          />
        ) : (
          slide.slide_label && <p className="text-sm text-slate-500 mt-0.5">{slide.slide_label}</p>
        )}
      </div>

      {/* Image gallery */}
      <div className="px-6 py-4">
        {images.length > 0 || editable ? (
          <ImageGallery
            images={images}
            editable={editable}
            onUpdate={handleImagesUpdate}
            uploading={uploading}
            onStartUpload={handleAddImage}
          />
        ) : null}
      </div>

      {/* Spec table */}
      <div className="px-6 pb-4">
        <SpecTable spec={spec} onSpecChange={editable ? (s) => onUpdate({ notes: JSON.stringify(s) }) : () => {}} />
      </div>

      {/* 2D drawing */}
      {(slide.image_2d_url || editable) && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">2D Drawing</div>
          {slide.image_2d_url ? (
            <div className="relative group">
              <img src={slide.image_2d_url} alt="2D Drawing"
                className="w-full rounded border border-slate-200"
                style={{ maxHeight: 300, objectFit: "contain", background: "#f8fafc" }} />
              {editable && (
                <button
                  onClick={() => onUpdate({ image_2d_url: null })}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : editable && (
            <label className="border-2 border-dashed border-slate-200 rounded p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-amber-400 transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Upload 2D Drawing</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  onUpdate({ image_2d_url: file_url });
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}