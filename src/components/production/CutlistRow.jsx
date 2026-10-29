import { useState } from "react";
import { FileText } from "lucide-react";
import CutlistFilesDialog from "@/components/production/CutlistFilesDialog";

/**
 * Compact stand-in for a card's stacked file rows: one Cutlist button, the PTS
 * value beside it, and a small notes chip. A single file opens straight from the
 * button; several open a picker listing them.
 */
export default function CutlistRow({
  item,
  isAdmin,
  editingPts,
  setEditingPts,
  onInlinePtsChange,
  onAnnotate,
  onOpenPdf,
}) {
  const [showPicker, setShowPicker] = useState(false);

  const files = (item.files || [])
    .map((file, idx) => ({ file, idx }))
    .filter(({ file }) => file.url);

  if (files.length === 0) return null;

  const noteCount = files.reduce((sum, { file }) => sum + (file.annotations?.length || 0), 0);
  const totalPts = files.reduce((sum, { file }) => sum + (parseFloat(file.pts) || 0), 0);
  const hasPts = files.some(({ file }) => file.pts !== undefined && file.pts !== null && file.pts !== "");
  const single = files.length === 1;
  const editing = isAdmin && editingPts?.itemId === item.id && editingPts?.fileIdx === (single ? files[0].idx : -2);

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

      {single ? (
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[9px] font-bold text-slate-400">PTS</span>
          {editing ? (
            <input
              type="number"
              min="0"
              step="any"
              defaultValue={files[0].file.pts ?? ""}
              autoFocus
              onBlur={(e) => { onInlinePtsChange(item, files[0].idx, e.target.value); setEditingPts(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onInlinePtsChange(item, files[0].idx, e.target.value); setEditingPts(null); } }}
              className="w-12 h-7 text-[11px] border border-amber-300 rounded px-1 text-center font-bold text-amber-600 bg-amber-50"
              placeholder="0"
            />
          ) : (
            <button
              type="button"
              onClick={() => { if (isAdmin && setEditingPts) setEditingPts({ itemId: item.id, fileIdx: files[0].idx }); }}
              className={`h-7 px-1.5 text-[11px] border border-amber-200 rounded font-bold text-amber-600 bg-amber-50 min-w-[42px] text-center ${isAdmin ? "hover:bg-amber-100" : "cursor-default"}`}
              title={isAdmin ? "Edit points" : "Points"}
            >
              {files[0].file.pts ?? "—"}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
          className="flex-shrink-0 flex items-center gap-1 h-7 px-1.5 rounded border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
          title="Total points — tap to edit per file"
        >
          <span className="text-[9px] font-bold text-slate-400">PTS</span>
          <span className="text-[11px] font-bold min-w-[22px] text-center">{hasPts ? totalPts : "—"}</span>
        </button>
      )}

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
          isAdmin={isAdmin}
          editingPts={editingPts}
          setEditingPts={setEditingPts}
          onInlinePtsChange={onInlinePtsChange}
          onOpenFile={openFile}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}