import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, Loader2, X } from "lucide-react";
import PrivateThumb from "./PrivateThumb";

/**
 * Photo upload field: multiple images with thumbnail previews and removal.
 * Files are stored privately; thumbnails resolve short-lived signed URLs.
 */
export default function ImagesField({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const images = value || [];

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        uploaded.push({ name: file.name, uri: file_uri });
      }
      onChange([...images, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (uri) => onChange(images.filter((img) => img.uri !== uri));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img.uri} className="relative">
            <PrivateThumb
              uri={img.uri}
              alt={img.name || "Checklist photo"}
              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={() => remove(img.uri)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-600 flex items-center justify-center shadow-sm hover:text-red-600"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border border-dashed border-slate-300 text-slate-400 flex flex-col items-center justify-center gap-0.5 hover:border-teal-400 hover:text-teal-600 disabled:opacity-60"
          title="Add photos"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              <span className="text-[9px] font-medium">Add</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
}