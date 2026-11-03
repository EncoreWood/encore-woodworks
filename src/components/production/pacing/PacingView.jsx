import { useState } from "react";
import { Clock, Target, Gauge, TrendingUp } from "lucide-react";
import PacingChart from "./PacingChart";
import StagePills from "./StagePills";
import CheckpointList from "./CheckpointList";
import {
  DAILY_TARGET, DAILY_MINIMUM, PRODUCTION_MINUTES,
  denverMinuteNow, projectedFinish, formatClock,
} from "@/lib/productionPacing";
import { formatStagePoints } from "@/lib/stagePoints";
import useViewportTier from "@/hooks/useViewportTier";

const STAGE_PILLS = [
  { id: "cut", label: "Cut", activeBg: "bg-orange-100", activeText: "text-orange-800", border: "border-orange-200" },
  { id: "face_frame", label: "Face Frame", activeBg: "bg-blue-100", activeText: "text-blue-800", border: "border-blue-200" },
  { id: "spray", label: "Spray", activeBg: "bg-purple-100", activeText: "text-purple-800", border: "border-purple-200" },
  { id: "build", label: "Build", activeBg: "bg-amber-100", activeText: "text-amber-800", border: "border-amber-200" },
  { id: "complete", label: "Complete", activeBg: "bg-green-100", activeText: "text-green-800", border: "border-green-200" },
];

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-800 whitespace-nowrap">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 whitespace-nowrap">{hint}</p>}
    </div>
  );
}

export default function PacingView({ points, series, loading, error }) {
  const tier = useViewportTier();
  const [stage, setStage] = useState("complete");
  const minuteNow = denverMinuteNow();
  const completed = Number(points?.complete) || 0;
  const projected = projectedFinish(completed, minuteNow);
  const chartHeight = tier === "desktop" ? 340 : tier === "tablet" ? 270 : 230;

  const pills = STAGE_PILLS.map(pill => ({ ...pill, points: formatStagePoints(points?.[pill.id] || 0) }));
  const selected = pills.find(pill => pill.id === stage) || pills[pills.length - 1];

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Pacing is unavailable right now.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile icon={Clock} label="Production time" value="8h 40m" hint={`${PRODUCTION_MINUTES} production min`} />
        <StatTile icon={Target} label="Target" value={`${DAILY_TARGET} pts`} hint="≈2.3 pts / hr" />
        <StatTile icon={Gauge} label="Minimum" value={`${DAILY_MINIMUM} pts`} hint="≈1.7 pts / hr" />
        <StatTile
          icon={TrendingUp}
          label="Projected finish"
          value={projected == null ? "—" : `${formatStagePoints(projected)} pts`}
          hint={`at current rate · ${formatClock(minuteNow)}`}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Completed today</h3>
            <p className="text-[11px] text-slate-500">Cumulative points arrived in Complete</p>
          </div>
          <p className="text-lg font-bold text-green-700">
            {loading ? "…" : formatStagePoints(completed)}
            <span className="ml-0.5 text-xs font-medium text-slate-400">/ {DAILY_TARGET} pts</span>
          </p>
        </div>
        <PacingChart
          series={series?.complete}
          upto={minuteNow}
          height={chartHeight}
          dense={tier === "narrow"}
          grade="Completed"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">By area</h3>
            <p className="text-[11px] text-slate-500">
              Points that left each stage today — Complete counts points that arrived
            </p>
          </div>
          <p className="text-lg font-bold text-green-700">
            {selected.points}
            <span className="ml-0.5 text-xs font-medium text-slate-400">pts</span>
          </p>
        </div>
        <div className="mb-2">
          <StagePills stages={pills} value={stage} onChange={setStage} />
        </div>
        <PacingChart
          series={series?.[stage]}
          upto={minuteNow}
          height={chartHeight - 30}
          dense={tier === "narrow"}
          grade={selected.label}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">Checkpoints</h3>
          <p className="text-[11px] text-slate-500">Target and minimum reflect production minutes only</p>
        </div>
        <CheckpointList minuteNow={minuteNow} />
      </div>
    </div>
  );
}