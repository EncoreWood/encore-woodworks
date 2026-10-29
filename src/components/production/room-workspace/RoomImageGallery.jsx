import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import ImageAnnotator from "@/components/measurements/ImageAnnotator";
import { useToast } from "@/components/ui/use-toast";

/**
 * Room image viewer for the Room Workspace right pane: one main image with
 * prev / next arrows and a counter, a thumbnail strip, and an Edit button that
 * opens the annotation editor. Saving flattens the marks into the displayed
 * image and keeps the clean original for re-editing.
 */
export default function RoomImageGallery({ projectId, roomName, images = [] }) {
  const [idx, setIdx] = useState(0);
  const [annotating, setAnnotating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const current = images[Math.min(idx, images.length - 1)];

  const handleSaveAnnotations = async ({ flattenedBlob, annotations }) => {
    if (!current) return;
    try {
      const original = current.original_file_url || current.file_url;
      const update = { annotations: JSON.stringify(annotations) };
      if (!current.original_file_url) update.original_file_url = original;
      if (flattenedBlob) {
        const baseName = (current.file_name || "room image").replace(/\.[^.]+$/, "");
        const flatFile = new File([flattenedBlob], baseName + ".jpg", { type: "image/jpeg" });
        try {
          const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: flatFile });
          update.file_url = file_url;
        } catch (err) {
          console.error("flatten upload failed", err);
        }
      } else if (current.original_file_url) {
        update.file_url = current.original_file_url;
      }
      await base44.entities.RoomFile.update(current.id, update);
      await queryClient.invalidateQueries({ queryKey: ["roomFiles", projectId, roomName] });
    } catch (err) {
      console.error("Failed to save annotations:", err);
      toast({ title: "Couldn't save annotations", variant: "destructive" });
    } finally {
      setAnnotating(false);
    }
  };

  if (!current) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-[11px] text-slate-500 truncate flex-1 min-w-0">{current.label || current.file_name || "Image"}</p>
        <button
          type="button"
          onClick={() => setAnnotating(true)}
          className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200">
        <img
          src={current.file_url}
          alt={current.label || current.file_name}
          className="w-full max-h-[38vh] object-contain bg-slate-50"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 text-slate-700 shadow disabled:opacity-30"
              title="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))}
              disabled={idx >= images.length - 1}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 text-slate-700 shadow disabled:opacity-30"
              title="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold text-white bg-slate-900/60 rounded-full px-1.5 py-0.5">
              {Math.min(idx, images.length - 1) + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {images.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === Math.min(idx, images.length - 1) ? "border-amber-400 opacity-100" : "border-slate-200 opacity-60 hover:opacity-90"}`}
              title={f.label || f.file_name}
            >
              <img src={f.file_url} alt={f.label || f.file_name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <ImageAnnotator
        open={annotating}
        onOpenChange={setAnnotating}
        title={`${roomName} — ${current.label || "Annotate"}`}
        imageUrl={current.original_file_url || current.file_url}
        annotations={(() => { try { return JSON.parse(current.annotations || "[]"); } catch { return []; } })()}
        onSave={handleSaveAnnotations}
      />
    </div>
  );
}