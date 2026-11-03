import { format, startOfWeek, startOfMonth } from "date-fns";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { denverDateStr } from "@/lib/stagePoints";
import useProductionBoardPoints from "@/hooks/useProductionBoardPoints";

const STAT_STAGES = ["face_frame", "spray", "build", "complete"];
const STAT_LABELS = { face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete" };
const STAGE_COLORS = {
  face_frame: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  spray:      { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  build:      { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  complete:   { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
};

export default function ProductionStatsPanel() {
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const todayStr = denverDateStr(new Date());
  const weekStartStr = format(startOfWeek(nowLocal, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStartStr = format(startOfMonth(nowLocal), "yyyy-MM-dd");

  // Same server calculation as the production board's daily pills: D is that exact
  // number, W/M sum it day by day across the window.
  // One call for day, week and month: the server reads the board's cards once.
  const { data: boardPoints } = useProductionBoardPoints({
    enabled: true,
    weekFrom: weekStartStr,
    monthFrom: monthStartStr,
  });
  const todayPoints = boardPoints;
  const weekPoints = boardPoints?.windows?.week;
  const monthPoints = boardPoints?.windows?.month;

  // Days elapsed this month, for the Avg/Day figure
  const daysElapsed = Number(todayStr.slice(8, 10)) || 1;

  const colStats = Object.fromEntries(STAT_STAGES.map(s => {
    const month = monthPoints?.points?.[s] || 0;
    return [s, {
      day: todayPoints?.points?.[s] || 0,
      week: weekPoints?.points?.[s] || 0,
      month,
      avgPerDay: Math.round((month / daysElapsed) * 10) / 10,
    }];
  }));

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
              <div className="flex gap-3 flex-wrap">
                {[{ label: "Day", val: s.day }, { label: "Week", val: s.week }, { label: "Month", val: s.month }].map(({ label, val }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                    <span className="text-xl font-bold text-green-600">{val}<span className="text-xs font-medium opacity-70 ml-0.5">p</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-medium">Avg/Day</span>
                <span className="ml-1.5 text-sm font-bold text-slate-600">{s.avgPerDay}<span className="text-xs font-medium opacity-70 ml-0.5">p</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}