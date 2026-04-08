import { X, GripVertical, Plus, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState, useRef } from "react";

// Parse image_3d_url: supports JSON array or legacy string
export function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [raw];
  } catch {
    return [raw];
  }
}

// Parse notes JSON spec
export function parseSpec(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function ImageGrid({ images, onRemove, onAdd, uploading }) {
  const count = images.length;
  const gridClass = count === 1
    ? "grid-cols-1"
    : count === 2
    ? "grid-cols-2"
    : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={`grid gap-2 ${gridClass}`}>
      {images.map((url, i) => (
        <div key={i} className="relative group aspect-video bg-slate-100 rounded overflow-hidden">
          <img src={url} alt={`img-${i}`} className="w-full h-full object-cover" />
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <label className="aspect-video border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 transition-colors bg-white">
          {uploading ? (
            <span className="text-xs text-slate-500">Uploading...</span>
          ) : (
            <>
              <Plus className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-500 mt-1">Add Image</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={onAdd} />
        </label>
      )}
    </div>
  );
}

function SpecCell({ value, onEdit, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const commit = () => {
    setEditing(false);
    onEdit(val);
  };

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
    <table className="w-full border-collapse text-xs mt-2 print-spec-table">
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
          <td className="border border-slate-300 px-2 py-1 bg-slate-50 align-top" rowSpan={1}>
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

// Full WYSIWYG slide preview with editing
export default function SlidePreview({ slide, onUpdate, editable = true }) {
  const [uploading, setUploading] = useState(false);
  const images = parseImages(slide.image_3d_url);
  const spec = parseSpec(slide.notes);

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newImages = [...images, file_url];
      onUpdate({ image_3d_url: JSON.stringify(newImages) });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    onUpdate({ image_3d_url: JSON.stringify(newImages) });
  };

  const handleSpecChange = (newSpec) => {
    onUpdate({ notes: JSON.stringify(newSpec) });
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
          <ImageGrid
            images={images}
            onRemove={editable ? handleRemoveImage : null}
            onAdd={editable ? handleAddImage : null}
            uploading={uploading}
          />
        ) : null}
      </div>

      {/* Spec table */}
      <div className="px-6 pb-4">
        <SpecTable spec={spec} onSpecChange={editable ? handleSpecChange : () => {}} />
      </div>

      {/* 2D drawing */}
      {(slide.image_2d_url || editable) && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">2D Drawing</div>
          {slide.image_2d_url ? (
            <div className="relative group">
              <img src={slide.image_2d_url} alt="2D Drawing" className="w-full max-h-48 object-contain rounded border border-slate-200" />
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

export { ImageGrid };