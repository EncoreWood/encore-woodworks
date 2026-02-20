import { useState } from "react";
import { format, subDays, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STAGES = [
  { id: "face_frame", label: "Face Frame", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "spray",      label: "Spray",      color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "build",      label: "Build",      color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { id: "complete",   label: "Complete",   color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
];

// Returns the "effective" stage a card was in just before moving to the next one.
// Since we only stamp completed_date when a card reaches "complete", we approximate:
// For non-complete stages, we use updated_date as the day that stage was last active.
// PTS earned by a stage = sum of pts for cards that have passed THROUGH that stage
// (they're now in a later stage). We track this by looking at cards whose current stage
// index is GREATER than the stage in question.
const stageIndex = (stageId) => STAGES.findIndex(s => s.id === stageId);

function getPtsForStageOnDay(items, stageId, dateStr) {
  // A card "earns" pts for a stage when it moves to the NEXT stage.
  // For complete stage specifically we use completed_date.
  // For others we use updated_date (the day it moved past that stage).
  const thisIdx = stageIndex(stageId);

  return items.reduce((sum, item) => {
    const itemStageIdx = stageIndex(item.stage);
    if (itemStageIdx <= thisIdx) return sum; // hasn't passed this stage yet

    let effectiveDate = null;
    if (item.stage === "complete") {
      // completed_date is stamped when moving to complete
      effectiveDate = item.completed_date;
    } else {
      // Use updated_date as proxy
      effectiveDate = item.updated_date ? format(new Date(item.updated_date), "yyyy-MM-dd") : null;
    }

    if (effectiveDate === dateStr) {
      return sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
    }
    return sum;
  }, 0);
}

function getCompletedPtsOnDay(items, dateStr) {
  // Only complete stage, use completed_date
  return items
    .filter(i => i.stage === "complete" && i.completed_date === dateStr)
    .reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);
}

function getAvgPtsPerDay(items, stageId) {
  // Collect all unique dates that have pts for this stage
  const dateCounts = {};
  items.forEach(item => {
    const itemStageIdx = stageIndex(item.stage);
    const thisIdx = stageIndex(stageId);
    if (itemStageIdx <= thisIdx) return;

    let dateStr = null;
    if (item.stage === "complete") {
      dateStr = item.completed_date;
    } else {
      dateStr = item.updated_date ? format(new Date(item.updated_date), "yyyy-MM-dd") : null;
    }
    if (!dateStr) return;
    const pts = (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
    if (!dateCounts[dateStr]) dateCounts[dateStr] = 0;
    dateCounts[dateStr] += pts;
  });

  const days = Object.keys(dateCounts);
  if (days.length === 0) return 0;
  const total = Object.values(dateCounts).reduce((a, b) => a + b, 0);
  return Math.round(total / days.length);
}

function getCompleteAvgPtsPerDay(items) {
  const dateCounts = {};
  items
    .filter(i => i.stage === "complete" && i.completed_date)
    .forEach(item => {
      const d = item.completed_date;
      const pts = (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
      if (!dateCounts[d]) dateCounts[d] = 0;
      dateCounts[d] += pts;
    });
  const days = Object.keys(dateCounts);
  if (days.length === 0) return 0;
  return Math.round(Object.values(dateCounts).reduce((a, b) => a + b, 0) / days.length);
}

export default function ProductionStatsPanel({ items = [] }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const goBack = () => {
    const d = parseISO(selectedDate);
    setSelectedDate(format(subDays(d, 1), "yyyy-MM-dd"));
  };

  const goForward = () => {
    const d = parseISO(selectedDate);
    const next = subDays(d, -1);
    if (next <= new Date()) setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  // Total completed pts for selected day
  const totalDayPts = getCompletedPtsOnDay(items, selectedDate);

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

      {/* Date navigator */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100">
        <Button variant="ghost" size="sm" onClick={goBack} className="h-8 w-8 p-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            {isToday ? "Today — " : ""}{format(parseISO(selectedDate), "EEEE, MMM do yyyy")}
          </p>
          <p className="text-xs text-slate-400">Total completed: <span className="font-bold text-green-700">{totalDayPts} PTS</span></p>
        </div>
        <Button variant="ghost" size="sm" onClick={goForward} disabled={isToday} className="h-8 w-8 p-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Stage rows */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const dayPts = stage.id === "complete"
            ? getCompletedPtsOnDay(items, selectedDate)
            : getPtsForStageOnDay(items, stage.id, selectedDate);
          const avgPts = stage.id === "complete"
            ? getCompleteAvgPtsPerDay(items)
            : getAvgPtsPerDay(items, stage.id);

          return (
            <div key={stage.id} className={`rounded-xl border ${stage.border} ${stage.bg} p-4 flex flex-col gap-2`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${stage.color}`}>{stage.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-800">{dayPts}</p>
                  <p className="text-xs text-slate-500">pts this day</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-600">{avgPts}</p>
                  <p className="text-xs text-slate-400">avg / day</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}