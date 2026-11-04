import { useState } from "react";
import DayPacingChart from "@/components/dashboard/pacing/DayPacingChart";
import PacingLegend from "@/components/dashboard/pacing/PacingLegend";
import { DAY_END } from "@/lib/productionPacing";

// The four stages the meeting card reports on, in flow order.
const STAGE_TILES = [
  { id: "face_frame", label: "Face Frame", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "spray", label: "Spray", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "build", label: "Build", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "complete", label: "Complete", color: "bg-green-100 text-green-800 border-green-200" },
];

const lastStep = steps => (Array.isArray(steps) && steps.length ? Number(steps[steps.length - 1][1]) || 0 : 0);

/**
 * The reviewed day's figures, read off the same series the chart draws. A stage's
 * drawn curve always ends on that stage's total, so the tiles, the total and the
 * curve can never disagree about the day they describe.
 */
export function stageFigures(payload) {
  const series = payload?.series;
  const points = payload?.points || {};
  return Object.fromEntries(
    STAGE_TILES.map(({ id }) => [id, series ? lastStep(series[id]) : Number(points[id]) || 0])
  );
}

export const stageTotal = figures =>
  Math.round(STAGE_TILES.reduce((sum, { id }) => sum + (figures?.[id] || 0), 0) * 100) / 100;

/**
 * Previous Day Review — points produced by stage plus that day's pacing chart.
 * `payload` is the day's getProductionTodayPoints answer; nothing here is read from
 * another day, and a payload for a different day is never labelled with this one.
 */
export default function PreviousDayPoints({ date, dateLabel, payload, targets }) {
  const [showAll, setShowAll] = useState(false);

  if (!payload || (payload.date && payload.date !== date)) return null;

  const series = payload.series;
  const figures = stageFigures(payload);
  const totalPts = stageTotal(figures);
  const complete = figures.complete;
  const verdict = complete >= targets.target
    ? { label: "Ahead of target", tone: "border-green-200 bg-green-50 text-green-800" }
    : complete >= targets.minimum
      ? { label: "Between minimum and target", tone: "border-slate-200 bg-slate-50 text-slate-700" }
      : { label: "Behind minimum", tone: "border-red-200 bg-red-50 text-red-700" };

  return (
    <>
      {totalPts > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📦 Points Produced by Stage</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STAGE_TILES.map(({ id, label, color }) => {
              const pts = figures[id] || 0;
              return (
                <div key={id} className={`rounded-lg border px-3 py-2.5 text-center ${color} ${pts === 0 ? "opacity-40" : ""}`}>
                  <p className="text-xs font-semibold mb-0.5">{label}</p>
                  <p className="text-xl font-bold">{pts}<span className="text-xs font-normal ml-0.5">pts</span></p>
                </div>
              );
            })}
          </div>
          <p className="text-right text-xs text-slate-400 mt-1">Total: <strong className="text-slate-700">{totalPts} pts</strong></p>
          <p className="text-[10px] text-slate-400 text-right">Stage departures; Complete counts net arrivals on {dateLabel}</p>
        </div>
      )}

      {series && (
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">📈 Pacing — {complete} pts in Complete</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAll(open => !open)}
                aria-pressed={showAll}
                title={showAll ? "Show the Completed curve with its zones" : "Show every stage's line for this day"}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  showAll
                    ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                }`}
              >
                All areas
              </button>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${verdict.tone}`}>{verdict.label}</span>
            </div>
          </div>
          <DayPacingChart
            series={series}
            upto={DAY_END}
            height={190}
            area={showAll ? "all" : "complete"}
            targets={targets}
          />
          <PacingLegend
            area={showAll ? "all" : "complete"}
            zones={!showAll}
            targets={targets}
            tint="Non-production"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Measured against that day&rsquo;s target ({targets.target} pts) and minimum ({targets.minimum} pts).
          </p>
        </div>
      )}
    </>
  );
}