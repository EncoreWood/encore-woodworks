import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Undo2, History } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";
import { stageLabel, formatDuration } from "@/components/production/moveHistoryUtils";
import { base44 } from "@/api/base44Client";
import CardMoveHistoryDialog from "./CardMoveHistoryDialog";

// Shows the cards behind one period stat tile (e.g. "60 in · 5 out" this month).
export default function PeriodCardsDialog({ stageId, search = "", periodKey, periodLabel, counts, open, onClose, onEdit }) {
  const [direction, setDirection] = useState("in");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  useEffect(() => {
    if (!open || !periodKey) return;
    let cancelled = false;
    setRows(null);
    setError(false);
    base44.functions.invoke("getProductionStageHistory", {
      stageId, search, offset: 0, listPeriod: periodKey, listDirection: direction
    }).then(res => {
      if (!cancelled) setRows(res.data?.rows || []);
    }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [open, stageId, search, periodKey, direction]);

  const dirCount = direction === "in" ? counts?.moved : counts?.movedOut;
  const otherDirection = direction === "in" ? "out" : "in";
  const otherCount = direction === "in" ? counts?.movedOut : counts?.moved;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {direction === "in" ? "Cards moved in" : "Cards moved out"} · {periodLabel}
          </DialogTitle>
          <p className="text-xs text-slate-400 -mt-1">{stageLabel(stageId)}</p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={direction === "in" ? "default" : "outline"}
              onClick={() => setDirection("in")}
            >
              In ({counts?.moved ?? 0})
            </Button>
            <Button
              size="sm"
              variant={direction === "out" ? "default" : "outline"}
              onClick={() => setDirection("out")}
            >
              Out ({counts?.movedOut ?? 0})
            </Button>
          </div>
        </DialogHeader>

        {rows === null ? (
          error ? (
            <p className="text-sm text-destructive py-6 text-center">Could not load the card list.</p>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading cards...</p>
          )
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No cards in this period.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(r => (
              <div
                key={r.id}
                className="py-2.5 flex items-center gap-3 cursor-pointer select-none hover:bg-slate-50 rounded px-1"
                onClick={() => setHistoryItem({ id: r.itemId, name: r.name, project_name: r.project })}
                title="View move history"
              >
                {r.sentBack && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap flex-shrink-0">
                    <Undo2 className="w-3 h-3" /> Pass {r.passIndex}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {r.project}
                    {r.pts > 0 && <span> · {r.pts} pts</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    {r.eventLabel} · {r.moved_at ? format(parseDate(r.moved_at), "MMM d, h:mm a") : "—"}
                  </p>
                  {r.moved_by && <p className="text-[11px] text-slate-400">by {r.moved_by}</p>}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0 w-28 justify-end">
                  <Clock className="w-3 h-3" />
                  {r.isCurrent ? `${formatDuration(r.duration)} so far` : (formatDuration(r.duration) || "Time unknown")}
                </span>
                <History className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        <CardMoveHistoryDialog
          item={historyItem}
          open={!!historyItem}
          onClose={() => setHistoryItem(null)}
          onViewCard={(full) => { setHistoryItem(null); onClose(); onEdit?.(full); }}
        />
      </DialogContent>
    </Dialog>
  );
}