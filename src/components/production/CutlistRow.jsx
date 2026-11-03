import { useState } from "react";
import { FileText } from "lucide-react";
import CutlistFilesDialog from "@/components/production/CutlistFilesDialog";
import { cardPoints } from "@/lib/cardPoints";

/**
 * Compact stand-in for a card's stacked file rows: one Cutlist button, the PTS
 * value beside it, and a small notes chip. A single file opens straight from the
 * button; several open a picker listing them.
 */
export default function CutlistRow({
  item,
  onAnnotate,
  onOpenPdf,
}) {
  const [showPicker, setShowPicker] = useState(false);

  const files = (item.files || [])
    .map((file, idx) => ({ file, idx }))
    .filter(({ file }) => file.url);

  if (files.length === 0) return null;

  const noteCount = files.reduce((sum, { file }) => sum + (file.annotations?.length || 0), 0);
  // The card's own total_points is what the face shows — never a separate file sum
  const totalPts = cardPoints(item);
  const single = files.length === 1;

  const openFile = ({ file, idx }) => {
    const isPdf = /\.pdf($|\?)/i.test(file.url);
    if (isPdf && onAnnotate) return onAnnotate(item, idx);
    if (isPdf && onOpenPdf) return onOpenPdf(file);
    window.open(file.url, "_blank");
  };

  const onCutlistClick = (e) => {
    e.stopPropagation();
    if (single) openFile(files[0]);
    else setShowPicker(true);
  };

  const onNotesClick = (e) => {
    e.stopPropagation();
    const annotated = files.filter(({ file }) => (file.annotations?.length || 0) > 0);
    if (annotated.length === 1) openFile(annotated[0]);
    else setShowPicker(true);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <button
        type="button"
        onClick={onCutlistClick}
        className="flex-1 min-w-0 flex items-center justify-center gap-1 h-7 px-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-bold hover:bg-amber-100 active:bg-amber-200 transition-colors"
        title={single ? "Open cutlist" : `Open cutlist (${files.length} files)`}
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Cutlist</span>
        {!single && <span className="text-[9px] font-semibold text-amber-600">({files.length})</span>}
      </button>

      {/* Read-only total. Points are only changed from the Edit Production Item modal. */}
      <span
        className="flex-shrink-0 flex items-center gap-1 h-7 px-1.5 rounded border border-amber-200 bg-amber-50 text-amber-600 select-none"
        title="Points — change them in the Edit card modal"
      >
        <span className="text-[9px] font-bold text-slate-400">PTS</span>
        <span className="text-[11px] font-bold min-w-[22px] text-center">{totalPts || "—"}</span>
      </span>

      {noteCount > 0 && (
        <button
          type="button"
          onClick={onNotesClick}
          className="flex-shrink-0 h-7 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors"
          title={`${noteCount} cutlist note${noteCount !== 1 ? "s" : ""}`}
        >
          {noteCount}
        </button>
      )}

      {showPicker && (
        <CutlistFilesDialog
          item={item}
          files={files}
          onOpenFile={openFile}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}