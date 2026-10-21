import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Clock, Undo2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";
import { STAGES, stageLabel, stageChip, formatDuration, buildPasses } from "./moveHistoryUtils";

export default function CardMoveHistoryDialog({ item, open, onClose, onViewCard }) {
  const [moves, setMoves] = useState(null);
  const [openingCard, setOpeningCard] = useState(false);
  const now = Date.now();

  const handleViewCard = async () => {
    if (openingCard || !item?.id) return;
    setOpeningCard(true);
    try {
      const full = await base44.entities.ProductionItem.get(item.id);
      onViewCard(full || item);
    } finally {
      setOpeningCard(false);
    }
  };

  useEffect(() => {
    if (!open || !item?.id) return;
    let cancelled = false;
    setMoves(null);
    base44.entities.ColumnMoveLog.filter({ item_id: item.id })
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) => (a.moved_at || "").localeCompare(b.moved_at || ""));
        setMoves(sorted);
      })
      .catch((err) => {
        console.error("Failed to load move history:", err);
        if (!cancelled) setMoves([]);
      });
    return () => { cancelled = true; };
  }, [open, item?.id]);

  const passes = moves ? buildPasses(moves, now) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-slate-500" />
            Move History — {item?.name}
          </DialogTitle>
          {item?.project_name && <p className="text-xs text-slate-400 -mt-1">{item.project_name}</p>}
          {onViewCard && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={openingCard}
              onClick={handleViewCard}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {openingCard ? "Opening..." : "View card"}
            </Button>
          )}
        </DialogHeader>

        {moves === null && (
          <p className="text-sm text-slate-400 py-6 text-center">Loading history...</p>
        )}
        {moves !== null && passes.length === 0 && (
          <p className="text-sm text-slate-400 py-6 text-center">No stage moves logged yet for this card.</p>
        )}

        <div className="space-y-2">
          {passes?.map((p, idx) => {
            const isCurrentPass = idx === passes.length - 1;
            const entries = STAGES.filter(s => (p.stageTimes[s.id] || 0) > 0 || (isCurrentPass && p.lastStage === s.id && p.currentDwell != null))
              .map(s => ({
                key: s.id,
                label: stageLabel(s.id),
                chip: stageChip(s.id),
                ms: isCurrentPass && p.lastStage === s.id
                  ? (p.stageTimes[s.id] || 0) + p.currentDwell
                  : p.stageTimes[s.id]
              }));
            return (
              <div key={idx} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  Pass {idx + 1}
                  {p.sentBack && (
                    <span className="inline-flex items-center gap-1 text-rose-600 normal-case font-semibold">
                      <Undo2 className="w-3 h-3" /> sent back for missing items
                    </span>
                  )}
                  <span className="text-slate-400 normal-case font-medium">started {format(parseDate(p.startAt), "MMM d, h:mm a")}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {entries.map(e => (
                    <span key={e.key} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${e.chip}`}>
                      {e.label}: {formatDuration(e.ms)}
                    </span>
                  ))}
                </div>
                {p.moves.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                    {p.moves.map((mv, mi) => (
                      <div key={mi} className="flex items-center gap-2 text-xs text-slate-500">
                        <Undo2 className={`w-3 h-3 text-rose-400 flex-shrink-0 ${mi === 0 && p.sentBack ? "" : "invisible"}`} />
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${stageChip(mv.to_stage)}`}>
                          {stageLabel(mv.to_stage)}
                        </span>
                        <span>moved {mv.moved_at ? format(parseDate(mv.moved_at), "MMM d, h:mm a") : "—"}</span>
                        {mv.moved_by && <span className="text-slate-400 truncate">by {mv.moved_by}</span>}
                        <span className="ml-auto font-medium text-slate-600 flex-shrink-0">
                          {mv.duration != null ? `${formatDuration(mv.duration)} in ${stageLabel(mv.to_stage)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}