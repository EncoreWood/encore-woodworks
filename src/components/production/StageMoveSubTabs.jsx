import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Undo2, ArrowRightCircle, Timer, Gauge, History } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";
import { stageLabel, formatDuration } from "@/components/production/moveHistoryUtils";
import { Button } from "@/components/ui/button";
import useProductionStageHistory from "@/hooks/useProductionStageHistory";
import CardMoveHistoryDialog from "./CardMoveHistoryDialog";
import PeriodCardsDialog from "./PeriodCardsDialog";

// Per-stage overview: recent moves into the stage, avg time a card spends
// there, and avg minutes-per-point (e.g. 1h in stage on a 2pt card = 30 min/pt).
export default function StageMoveSubTabs({ stageId, search = "", onEdit }) {
  const { rows: visibleRows, stats, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useProductionStageHistory(stageId, search);
  const [historyItem, setHistoryItem] = useState(null);
  const [periodModal, setPeriodModal] = useState(null);

  if (isPending) return <p className="text-sm text-muted-foreground py-6 text-center">Loading stage history...</p>;
  if (isError) return (
    <div role="alert" className="py-6 text-center space-y-2">
      <p className="text-sm text-destructive">Could not load stage history.</p>
      <Button variant="outline" onClick={() => refetch()}>Try again</Button>
    </div>
  );

  const fmtPerPoint = (v) =>
    v == null ? "—" : `${v < 10 ? v.toFixed(1) : Math.round(v)} min/pt`;

  const statCards = [
    {
      icon: ArrowRightCircle,
      label: "Recorded stays in " + stageLabel(stageId),
      value: String(stats.count),
      sub: stats.currentCount > 0 ? `${stats.currentCount} currently in stage` : "none currently in stage"
    },
    {
      icon: Timer,
      label: "Avg time in stage",
      value: formatDuration(stats.avgMs) || "—",
      sub: "stays with known entry times"
    },
    {
      icon: Gauge,
      label: "Avg per point",
      value: fmtPerPoint(stats.avgPerPointAll),
      sub: "cards currently being worked on"
    }
  ];

  const periodStats = [
    { key: "all", label: "All time", value: stats.avgPerPointAll, moved: stats.movedAll, movedOut: stats.movedOutAll },
    { key: "month", label: "This month (30d)", value: stats.avgPerPointMonth, moved: stats.movedMonth, movedOut: stats.movedOutMonth },
    { key: "week", label: "This week (7d)", value: stats.avgPerPointWeek, moved: stats.movedWeek, movedOut: stats.movedOutWeek },
    { key: "day", label: "Today", value: stats.avgPerPointDay, moved: stats.movedDay, movedOut: stats.movedOutDay }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map(sc => (
          <Card key={sc.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <sc.icon className="w-4 h-4" />
                {sc.label}
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-1">{sc.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sc.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {periodStats.map(ps => (
          <Card
            key={ps.label}
            className="border-0 shadow-sm bg-slate-50 cursor-pointer select-none hover:bg-slate-100 transition-colors"
            role="button"
            onClick={() => setPeriodModal({ key: ps.key, label: ps.label })}
            title="Show cards in this period"
          >
            <CardContent className="p-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{ps.label}</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {ps.moved} in · {ps.movedOut} out
              </p>
              <p className="text-[11px] text-slate-400">
                cards moved here
              </p>
              <p className="text-[11px] text-slate-400">
                {ps.value == null ? "no min/pt yet, being worked on" : `avg ${fmtPerPoint(ps.value)}, being worked on`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Stage visits — newest first
          </p>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No matching moves into or out of {stageLabel(stageId)} for cards still on the production board.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleRows.map(r => (
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
                  {!r.sentBack && r.passCount > 1 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap flex-shrink-0">
                      Pass {r.passIndex}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {r.project}
                      {r.pts > 0 && <span className="text-slate-400"> · {r.pts} pts</span>}
                      {r.pts > 0 && r.duration >= 60000 && (
                        <span className="text-slate-500 font-medium"> · {Math.round(r.duration / 60000 / r.pts)} min/pt</span>
                      )}
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
          {hasNextPage && (
            <Button variant="outline" className="mt-4" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          )}
        </CardContent>
      </Card>

      <CardMoveHistoryDialog
        item={historyItem}
        open={!!historyItem}
        onClose={() => setHistoryItem(null)}
        onViewCard={(full) => { setHistoryItem(null); onEdit?.(full); }}
      />

      <PeriodCardsDialog
        stageId={stageId}
        search={search}
        periodKey={periodModal?.key}
        periodLabel={periodModal?.label}
        counts={periodModal ? periodStats.find(ps => ps.key === periodModal.key) : null}
        open={!!periodModal}
        onClose={() => setPeriodModal(null)}
        onEdit={(item) => { setPeriodModal(null); onEdit?.(item); }}
      />
    </div>
  );
}