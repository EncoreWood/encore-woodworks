import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, FileText, ChevronLeft, ChevronRight, Paperclip, Pencil } from "lucide-react";
import PdfViewer from "@/components/PdfViewer";
import ImageAnnotator from "@/components/measurements/ImageAnnotator";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function RoomFilesModal({ projectId, projectName, roomName, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pdfFile, setPdfFile] = useState(null);
  const [annotating, setAnnotating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["roomFiles", projectId, roomName],
    queryFn: () => base44.entities.RoomFile.filter({ project_id: projectId }),
    select: (all) => all.filter(f => f.room_name?.toLowerCase().trim() === roomName?.toLowerCase().trim()),
    enabled: !!projectId && !!roomName,
  });

  const imageFiles = files.filter(f => f.file_type === "image");
  const currentImage = imageFiles[currentIdx];

  // Save from the annotator: flatten the original photo + annotations into a
  // JPEG (so it displays everywhere with marks baked in), upload it as the
  // file_url, and preserve the raw photo in original_file_url for re-editing.
  // If all marks were removed, restore the clean original image instead.
  const handleSaveAnnotations = async ({ flattenedBlob, annotations }) => {
    if (!currentImage) return;
    try {
      const original = currentImage.original_file_url || currentImage.file_url;
      const update = { annotations: JSON.stringify(annotations) };
      if (!currentImage.original_file_url) update.original_file_url = original;
      if (flattenedBlob) {
        const baseName = (currentImage.file_name || "room image").replace(/\.[^.]+$/, "");
        const flatFile = new File([flattenedBlob], baseName + ".jpg", { type: "image/jpeg" });
        try {
          const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: flatFile });
          update.file_url = file_url;
        } catch (err) {
          console.error("flatten upload failed", err);
        }
      } else if (currentImage.original_file_url) {
        update.file_url = currentImage.original_file_url;
      }
      await base44.entities.RoomFile.update(currentImage.id, update);
      await queryClient.invalidateQueries({ queryKey: ["roomFiles", projectId, roomName] });
    } catch (err) {
      console.error("Failed to save annotations:", err);
      toast({ title: "Couldn't save annotations", variant: "destructive" });
    } finally {
      setAnnotating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/80 border-b border-white/10 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-white font-bold text-xl">{roomName}</p>
          <p className="text-white/60 text-sm">{projectName}</p>
        </div>
        <button onClick={onClose} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
            <Paperclip className="w-16 h-16 text-white/30" />
            <p className="text-white/70 text-2xl font-semibold">No files uploaded for this room yet</p>
            <p className="text-white/40 text-lg">Ask the office to upload room files in the project details.</p>
          </div>
        ) : (
          <div className="p-6 space-y-8 max-w-4xl mx-auto">
            {/* Images — swipeable gallery */}
            {imageFiles.length > 0 && (
              <div>
                <p className="text-white/60 text-sm uppercase tracking-widest mb-3 font-semibold">
                  Images ({imageFiles.length})
                </p>
                <div className="relative">
                  {currentImage && (
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-white text-xl font-semibold truncate">{currentImage.label || "Image"}</p>
                        <button
                          onClick={() => setAnnotating(true)}
                          className="flex items-center gap-1.5 flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                      <img
                        src={currentImage.file_url}
                        alt={currentImage.label || currentImage.file_name}
                        className="w-full rounded-2xl object-contain max-h-[60vh] bg-black/20"
                      />
                    </div>
                  )}
                  {imageFiles.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                        disabled={currentIdx === 0}
                        className="text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full p-4 transition-colors"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </button>
                      <span className="text-white/60 text-lg font-medium">
                        {currentIdx + 1} / {imageFiles.length}
                      </span>
                      <button
                        onClick={() => setCurrentIdx(i => Math.min(imageFiles.length - 1, i + 1))}
                        disabled={currentIdx === imageFiles.length - 1}
                        className="text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full p-4 transition-colors"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </button>
                    </div>
                  )}
                  {/* Thumbnail strip */}
                  {imageFiles.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {imageFiles.map((f, i) => (
                        <button
                          key={f.id}
                          onClick={() => setCurrentIdx(i)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === currentIdx ? "border-amber-400 opacity-100" : "border-white/20 opacity-50 hover:opacity-80"}`}
                        >
                          <img src={f.file_url} alt={f.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDFs */}
            {files.filter(f => f.file_type === "pdf").length > 0 && (
              <div>
                <p className="text-white/60 text-sm uppercase tracking-widest mb-3 font-semibold">
                  Documents ({files.filter(f => f.file_type === "pdf").length})
                </p>
                <div className="space-y-4">
                  {files.filter(f => f.file_type === "pdf").map(f => (
                    <div key={f.id}>
                      {f.label && <p className="text-white text-xl font-semibold mb-2">{f.label}</p>}
                      {pdfFile?.id === f.id ? (
                        <div className="rounded-2xl overflow-hidden bg-white h-[70vh]">
                          <PdfViewer url={f.file_url} className="h-full" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setPdfFile(f)}
                          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 transition-colors text-left"
                        >
                          <FileText className="w-10 h-10 text-red-400 flex-shrink-0" />
                          <div>
                            <p className="text-white font-semibold text-lg">{f.label || f.file_name}</p>
                            <p className="text-white/50 text-sm">{f.file_name} · Tap to open</p>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Annotation editor — opened via the Edit button (Apple Pencil + touch supported) */}
      {currentImage && (
        <ImageAnnotator
          open={annotating}
          onOpenChange={setAnnotating}
          title={`${roomName} — ${currentImage.label || "Annotate"}`}
          imageUrl={currentImage.original_file_url || currentImage.file_url}
          annotations={(() => { try { return JSON.parse(currentImage.annotations || "[]"); } catch { return []; } })()}
          onSave={handleSaveAnnotations}
        />
      )}
    </div>
  );
}