import { Box, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, X, Download } from "lucide-react";

/**
 * Full-screen gallery modal for a list of room files. Images render inline with
 * prev/next navigation; non-image files (PDF / 3D models / other) render a
 * download / open-in-new-tab card.
 */
export default function RoomFileGallery({ title, files, index, onClose, onIndex }) {
  if (!files || files.length === 0) return null;
  const file = files[index];

  const prev = (e) => { e?.stopPropagation(); onIndex((index - 1 + files.length) % files.length); };
  const next = (e) => { e?.stopPropagation(); onIndex((index + 1) % files.length); };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full max-h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide flex items-center gap-1.5">
            {title}
            <span className="text-white/50 normal-case tracking-normal font-normal">
              · {index + 1} of {files.length}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <a href={file.file_url} target="_blank" rel="noopener noreferrer" download
              className="bg-white/15 hover:bg-white/25 rounded-full p-1.5 transition-colors" title="Download / open">
              <Download className="w-4 h-4" />
            </a>
            <button className="bg-white/15 hover:bg-white/25 rounded-full p-1.5 transition-colors" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex items-center justify-center min-h-[40vh]">
          {file.file_type === "image" ? (
            <img src={file.file_url} alt={file.label || file.file_name}
              className="max-h-[78vh] max-w-full rounded-xl object-contain" />
          ) : (
            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-3 w-full py-16 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
              {file.file_type === "3d" ? <Box className="w-12 h-12 text-violet-300" />
                : file.file_type === "pdf" ? <FileText className="w-12 h-12 text-red-300" />
                : <ImageIcon className="w-12 h-12 text-blue-300" />}
              <p className="text-white text-sm truncate px-4 max-w-full">{file.label || file.file_name}</p>
              <span className="text-xs text-white/60 underline">Open in new tab</span>
            </a>
          )}

          {/* File caption */}
          {(file.label || file.file_name) && file.file_type === "image" && (
            <p className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-xs truncate px-4">
              {file.label || file.file_name}
            </p>
          )}
        </div>

        {/* Navigation */}
        {files.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white rounded-full p-2 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white rounded-full p-2 transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}