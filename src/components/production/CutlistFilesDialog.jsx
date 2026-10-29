import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Image as ImageIcon, ExternalLink } from "lucide-react";

/**
 * Picker for a card's cutlist files. Only appears when a card carries more than
 * one attached file — a single file is opened directly from the Cutlist button.
 * Per-file PTS stays editable for admins here, so the card face can show one
 * compact total instead of a stack of rows.
 */
export default function CutlistFilesDialog({
  item,
  files,
  isAdmin,
  editingPts,
  setEditingPts,
  onInlinePtsChange,
  onOpenFile,
  onClose,
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-sm">Cutlist — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {files.map(({ file, idx }) => {
            const isPdf = /\.pdf($|\?)/i.test(file.url);
            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.url);
            const notes = file.annotations?.length || 0;
            const editing = isAdmin && editingPts?.itemId === item.id && editingPts?.fileIdx === idx;

            return (
              <div key={idx} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => onOpenFile({ file, idx })}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  title={isPdf ? "Open / annotate PDF" : "Open file"}
                >
                  {isImg
                    ? <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    : <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isPdf ? "text-red-500" : "text-slate-400"}`} />}
                  <span className="text-[11px] font-medium text-amber-700 underline truncate">{file.name}</span>
                  {notes > 0 && (
                    <span className="flex-shrink-0 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5">
                      {notes}
                    </span>
                  )}
                  {!isPdf && !isImg && <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[9px] font-bold text-slate-400">PTS</span>
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={file.pts ?? ""}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { onInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                      className="w-14 h-6 text-[11px] border border-amber-300 rounded px-1 text-center font-bold text-amber-600 bg-amber-50"
                      placeholder="0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { if (isAdmin) setEditingPts({ itemId: item.id, fileIdx: idx }); }}
                      className={`h-6 px-1.5 text-[11px] border border-amber-200 rounded font-bold text-amber-600 bg-amber-50 min-w-[40px] text-center ${isAdmin ? "hover:bg-amber-100" : "cursor-default"}`}
                    >
                      {file.pts ?? "—"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}