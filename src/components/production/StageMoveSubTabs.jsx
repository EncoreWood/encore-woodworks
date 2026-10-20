import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Undo2, ArrowRightCircle, Timer, Gauge } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";
import { stageLabel, stageChip, formatDuration, buildPasses } from "./moveHistoryUtils";

// Per-stage overview: recent moves into the stage, avg time a card spends
// there, and avg minutes-per-point (e.g. 1h in stage on a 2pt card = 30 min/pt).
export default function StageMoveSubTabs({ stageId, columnMoveLogs = [], items = [], search = "" }) {
  const now = Date.now();

  const rows = useMemo(() => {
    const cardMap = {};
    items.forEach(i => { if (i.id) cardMap[i.id] = i; });

    const byItem = {};
    columnMoveLogs.forEach(log => {
      if (!log.item_id) return;
      (byItem[log.item_id] = byItem[log.item_id] || []).push(log);
    });

    const out = [];
    Object.entries(byItem).forEach(([itemId, moves]) => {
      const card = cardMap[itemId];
      if (card && card.is_job_info) return;
      moves.sort((a, b) => (a.moved_at || "").localeCompare(b.moved_at || ""));
      const passes = buildPasses(moves, now);
      const pts = card
        ? (card.pts != null ? card.pts : (card.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0))
        : null;
      const name = card?.name || moves[0]?.item_name || "";
      const project = card?.project_name || moves[0]?.project_name || "";
      passes.forEach((p, pi) => {
        p.moves.forEach((mv, mi) => {
          if (mv.to_stage !== stageId) return;
          const isLastOfPass = mi === p.moves.length - 1;
          const isCurrent = isLastOfPass && pi === passes.length - 1 && p.currentDwell != null;
          const duration = isCurrent ? p.currentDwell : mv.duration;
          if (duration == null) return;
          out.push({
            id: `${itemId}-${mv.moved_at}-${mi}`,
            name,
            project,
            pts,
            isBeingWorked: !!card?.is_being_worked,
            moved_at: mv.moved_at,
            moved_by: mv.moved_by,
            duration,
            isCurrent,
            sentBack: p.sentBack,
            passIndex: pi + 1,
            passCount: passes.length
          });
        });
      });
    });
    out.sort((a, b) => (b.moved_at || "").localeCompare(a.moved_at || ""));
    return out;
  }, [columnMoveLogs, items, stageId, now]);

  const stats = useMemo(() => {
    const durations = rows.map(r => r.duration);
    const avgMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const perPointVals = rows.filter(r => r.pts > 0 && r.isBeingWorked).map(r => r.duration / 60000 / r.pts);
    const avgPerPoint = perPointVals.length ? perPointVals.reduce((a, b) => a + b, 0) / perPointVals.length : null;
    const currentCount = rows.filter(r => r.isCurrent).length;
    return { count: rows.length, avgMs, avgPerPoint, currentCount };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => !q || r.name?.toLowerCase().includes(q) || r.project?.toLowerCase().includes(q))
      .slice(0, 60);
  }, [rows, search]);

  const statCards = [
    {
      icon: ArrowRightCircle,
      label: "Moves into " + stageLabel(stageId),
      value: String(stats.count),
      sub: stats.currentCount > 0 ? `${stats.currentCount} currently in stage` : "none currently in stage"
    },
    {
      icon: Timer,
      label: "Avg time in stage",
      value: formatDuration(stats.avgMs) || "—",
      sub: "across all recorded stays"
    },
    {
      icon: Gauge,
      label: "Avg per point",
      value: stats.avgPerPoint != null ? `${stats.avgPerPoint < 10 ? stats.avgPerPoint.toFixed(1) : Math.round(stats.avgPerPoint)} min/pt` : "—",
      sub: "cards currently being worked on"
    }
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

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Stage moves — newest first
          </p>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No moves into {stageLabel(stageId)} logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleRows.map(r => (
                <div key={r.id} className="py-2.5 flex items-center gap-3">
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
                      {r.moved_at ? format(parseDate(r.moved_at), "MMM d, h:mm a") : "—"}
                    </p>
                    {r.moved_by && <p className="text-[11px] text-slate-400">by {r.moved_by}</p>}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0 w-28 justify-end">
                    <Clock className="w-3 h-3" />
                    {r.isCurrent ? `${formatDuration(r.duration)} so far` : formatDuration(r.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}