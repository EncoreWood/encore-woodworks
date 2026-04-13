import { format, startOfWeek, startOfMonth } from "date-fns";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STAGES = [
  { id: "face_frame", label: "Face Frame", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", numColor: "text-green-600" },
  { id: "spray",      label: "Spray",      color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", numColor: "text-green-600" },
  { id: "build",      label: "Build",      color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", numColor: "text-green-600" },
  { id: "complete",   label: "Complete",   color: "text-green-700", bg: "bg-green-50", border: "border-green-200", numColor: "text-green-600" },
];

// Get pts earned by a stage using stage_move_log entries
// A stage earns pts when the item moves FROM that stage to the next one.
// We look at stage_move_log for moves where from_stage === stageId, and use the timestamp date.
function getPtsForStageInRange(items, stageId, fromDate) {
  let total = 0;
  const fromMs = fromDate ? fromDate.getTime() : 0;

  for (const item of items) {
    const log = item.stage_move_log;
    if (!Array.isArray(log) || log.length === 0) continue;

    // Find move(s) FROM this stage
    const moves = log.filter(l => l.from_stage === stageId && l.timestamp);
    for (const move of moves) {
      const moveDate = new Date(move.timestamp);
      if (moveDate.getTime() >= fromMs) {
        // Sum pts from files on this item at the time (use pts_logged as the canonical value, fall back to files)
        const pts = item.pts_logged != null
          ? item.pts_logged
          : (item.pts != null ? item.pts : (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0));
        total += pts;
        break; // Only count once per item per stage
      }
    }
  }
  return total;
}

export default function ProductionStatsPanel({ items = [] }) {
  const MST_TZ = "America/Denver";
  const nowUtc = new Date();
  const now = new Date(nowUtc.toLocaleString("en-US", { timeZone: MST_TZ }));

  const todayStr = format(now, "yyyy-MM-dd");
  // Start of today in local time
  const todayStart = new Date(todayStr + "T00:00:00");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">Production Stage Breakdown</h2>
        <Link to={createPageUrl("ShopProduction")}>
          <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-800 text-xs">
            <Factory className="w-3 h-3" /> View Board
          </Button>
        </Link>
      </div>

      <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const dayPts = getPtsForStageInRange(items, stage.id, todayStart);
          const weekPts = getPtsForStageInRange(items, stage.id, weekStart);
          const monthPts = getPtsForStageInRange(items, stage.id, monthStart);

          return (
            <div key={stage.id} className={`rounded-xl border ${stage.border} ${stage.bg} p-4`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${stage.color}`}>{stage.label}</p>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Day</span>
                  <span className={`text-xl font-bold ${stage.numColor}`}>{dayPts}p</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Week</span>
                  <span className={`text-xl font-bold ${stage.numColor}`}>{weekPts}p</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Month</span>
                  <span className={`text-xl font-bold ${stage.numColor}`}>{monthPts}p</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}