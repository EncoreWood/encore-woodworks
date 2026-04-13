import { format, startOfWeek, startOfMonth } from "date-fns";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const STAT_STAGES = ["face_frame", "spray", "build", "complete"];
const STAT_LABELS = { face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete" };
const STAGE_COLORS = {
  face_frame: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  spray:      { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  build:      { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  complete:   { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
};

export default function ProductionStatsPanel() {
  const { data: columnMoveLogs = [] } = useQuery({
    queryKey: ["columnMoveLogs"],
    queryFn: () => base44.entities.ColumnMoveLog.list(),
    staleTime: 30_000,
  });

  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const todayStr = format(nowLocal, "yyyy-MM-dd");
  const weekStart = startOfWeek(nowLocal, { weekStartsOn: 1 });
  const monthStart = startOfMonth(nowLocal);

  const getColStats = (stage) => {
    let day = 0, week = 0, month = 0;
    for (const log of columnMoveLogs) {
      // Same logic as ShopProduction: points earned when LEAVING a column (from_column),
      // except "complete" which counts arrivals (to_column).
      const matchCol = stage === "complete" ? log.to_column : log.from_column;
      if (matchCol !== stage) continue;
      const pts = parseFloat(log.points_awarded) || 0;
      if (pts === 0) continue;
      const movedAt = new Date(log.moved_at);
      const movedLocal = new Date(movedAt.toLocaleString("en-US", { timeZone: "America/Denver" }));
      const dateStr = format(movedLocal, "yyyy-MM-dd");
      if (dateStr === todayStr) day += pts;
      if (movedLocal >= weekStart) week += pts;
      if (movedLocal >= monthStart) month += pts;
    }
    return { day, week, month };
  };

  const colStats = Object.fromEntries(STAT_STAGES.map(s => [s, getColStats(s)]));

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
        {STAT_STAGES.map(stage => {
          const s = colStats[stage];
          const { color, bg, border } = STAGE_COLORS[stage];
          return (
            <div key={stage} className={`rounded-xl border ${border} ${bg} p-4`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${color}`}>{STAT_LABELS[stage]}</p>
              <div className="flex gap-3">
                {[{ label: "Day", val: s.day }, { label: "Week", val: s.week }, { label: "Month", val: s.month }].map(({ label, val }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                    <span className="text-xl font-bold text-green-600">{val}<span className="text-xs font-medium opacity-70 ml-0.5">p</span></span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}