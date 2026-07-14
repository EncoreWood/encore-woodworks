import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X } from "lucide-react";
import { parseSpecs, parseImageUrl, SPEC_FIELDS } from "./slideHelpers";

/**
 * Structured slide layout — pure HTML/CSS, no canvas.
 * Top: room name + label. Middle: images. Bottom: specs table.
 */
export default function SlideCard({ slide, onUpdate, editable = true }) {
  const specs = parseSpecs(slide);
  const image3d = parseImageUrl(slide.image_3d_url);
  const image2d = slide.image_2d_url;
  const [uploading, setUploading] = useState(false);
  const fileInput3d = useRef(null);
  const fileInput2d = useRef(null);

  const updateSpec = (key, value) => {
    const newSpecs = { ...specs, [key]: value };
    onUpdate({ specs: JSON.stringify(newSpecs) });
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpdate({ [field]: file_url });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload("image_3d_url", file);
    }
  };

  return (
    <div
      className="bg-white shadow-xl flex flex-col rounded-lg overflow-hidden"
      style={{ aspectRatio: "11 / 8.5", width: "100%" }}
    >
      {/* ── Top: room name + label ── */}
      <div className="px-6 pt-4 pb-3 border-b-2 border-slate-800 flex-shrink-0">
        {editable ? (
          <input
            className="text-2xl font-bold text-slate-900 w-full border-none outline-none bg-transparent placeholder-slate-300"
            value={slide.room_name || ""}
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
          slide.slide_label ? <p className="text-sm text-slate-500 mt-0.5">{slide.slide_label}</p> : null
        )}
      </div>

      {/* ── Middle: images ── */}
      <div
        className="flex gap-3 p-4 bg-slate-50 flex-1 min-h-0"
        onDragOver={e => { if (editable) e.preventDefault(); }}
        onDrop={editable && !image3d ? handleDrop : undefined}
      >
        {/* Main 3D image */}
        <div className="flex-1 relative bg-white border border-slate-200 rounded overflow-hidden flex items-center justify-center min-h-0">
          {image3d ? (
            <>
              <img
                src={image3d}
                alt="3D render"
                className="max-w-full max-h-full"
                style={{ objectFit: "contain" }}
              />
              {editable && (
                <>
                  <button
                    onClick={() => onUpdate({ image_3d_url: null })}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fileInput3d.current?.click()}
                    className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded hover:bg-black/80 transition-colors"
                  >
                    Replace
                  </button>
                </>
              )}
            </>
          ) : editable ? (
            <button
              onClick={() => fileInput3d.current?.click()}
              className="flex flex-col items-center gap-2 text-slate-400 hover:text-amber-600 transition-colors p-8"
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm">{uploading ? "Uploading..." : "Drop image here or click to upload"}</span>
            </button>
          ) : (
            <span className="text-slate-300 text-sm">No image</span>
          )}
          <input
            ref={fileInput3d}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { handleImageUpload("image_3d_url", e.target.files?.[0]); e.target.value = ""; }}
          />
        </div>

        {/* 2D image (smaller, beside main) */}
        {(image2d || editable) && (
          <div className="w-1/4 relative bg-white border border-slate-200 rounded overflow-hidden flex items-center justify-center min-h-0">
            {image2d ? (
              <>
                <img
                  src={image2d}
                  alt="2D drawing"
                  className="max-w-full max-h-full"
                  style={{ objectFit: "contain" }}
                />
                {editable && (
                  <>
                    <button
                      onClick={() => onUpdate({ image_2d_url: null })}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => fileInput2d.current?.click()}
                      className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-black/80"
                    >
                      Replace
                    </button>
                  </>
                )}
              </>
            ) : editable ? (
              <button
                onClick={() => fileInput2d.current?.click()}
                className="flex flex-col items-center gap-1 text-slate-300 hover:text-amber-600 transition-colors p-3"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] text-center">2D Drawing</span>
              </button>
            ) : null}
            <input
              ref={fileInput2d}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { handleImageUpload("image_2d_url", e.target.files?.[0]); e.target.value = ""; }}
            />
          </div>
        )}
      </div>

      {/* ── Bottom: specs table ── */}
      <div className="px-6 pb-4 pt-2 flex-shrink-0">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "37%" }} />
          </colgroup>
          <tbody>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td
                  key={f.key}
                  className="border border-slate-300 px-1.5 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {f.label}
                </td>
              ))}
            </tr>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td key={f.key} className="border border-slate-300 p-0">
                  {editable ? (
                    <input
                      value={specs[f.key] || ""}
                      onChange={e => updateSpec(f.key, e.target.value)}
                      placeholder="—"
                      className="w-full border-none bg-transparent px-1.5 py-1 text-[11px] outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    />
                  ) : (
                    <div className="px-1.5 py-1 text-[11px] text-slate-700 truncate" title={specs[f.key] || ""}>
                      {specs[f.key] || "—"}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}