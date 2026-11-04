import { useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { Factory, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import useProductionBoardPoints from "@/hooks/useProductionBoardPoints";
import useViewportTier from "@/hooks/useViewportTier";
import usePacingTargets from "@/hooks/usePacingTargets";
import { denverDateStr, formatStagePoints } from "@/lib/stagePoints";
import { denverMinuteNow, projectedFinish } from "@/lib/productionPacing";
import { monthTargetPoints, quarterStart, quarterTargetPoints, shopDay, weekTargetPoints } from "@/lib/pacingTargets";
import { ZONE_GREEN, ZONE_RED } from "@/lib/pacingZones";
import DayPacingChart from "./pacing/DayPacingChart";
import TrendPacingChart from "./pacing/TrendPacingChart";
import PacingAreaPicker from "./pacing/PacingAreaPicker";
import PacingTargetsDialog from "./pacing/PacingTargetsDialog";
import { visibleAreas } from "./pacing/pacingAreas";

const MODES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

function Chip({ label, value, goal }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
        {value}
        {goal ? <span className="ml-0.5 text-[11px] font-medium text-slate-400">/ {goal}</span> : null}
      </p>
    </div>
  );
}

function Legend({ area, tint, targets, zones }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
      {visibleAreas(area).map(item => (
        <span key={item.id} className="flex items-center gap-1">
          <span className="h-0.5 w-3" style={{ backgroundColor: zones ? "#0f172a" : item.color }} /> {item.label}
        </span>
      ))}
      <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-blue-600" /> Target {targets.target}</span>
      {zones && (
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dotted border-slate-400" /> Minimum {targets.minimum}</span>
      )}
      {zones ? (
        <>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_GREEN, opacity: 0.35 }} /> Ahead of target
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_RED, opacity: 0.35 }} /> Behind minimum
          </span>
        </>
      ) : (
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100" /> {tint}
        </span>
      )}
    </div>
  );
}

export default function PacingPanel() {
  const tier = useViewportTier();
  const [mode, setMode] = useState("day");
  // "all" plots every stage at once; a stage id plots just that area.
  const [area, setArea] = useState("all");
  const [showTargets, setShowTargets] = useState(false);
  const { target, minimum, targetsFor } = usePacingTargets();
  const todayStr = denverDateStr(new Date());
  const today = shopDay(todayStr);
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const quarterFrom = format(quarterStart(today), "yyyy-MM-dd");

  // Day, week, month and quarter all come from one server call — the same shared
  // calculation the production board uses.
  const { data, isError } = useProductionBoardPoints({ enabled: true, weekFrom, monthFrom, quarterFrom });

  const minuteNow = denverMinuteNow();
  const dayPoints = Number(data?.points?.complete) || 0;
  const weekPoints = Number(data?.windows?.week?.points?.complete) || 0;
  const monthPoints = Number(data?.windows?.month?.points?.complete) || 0;
  const quarterPoints = Number(data?.windows?.quarter?.points?.complete) || 0;
  const projected = projectedFinish(dayPoints, minuteNow);
  const zones = area !== "all";
  const targets = { target, minimum };

  const chartHeight = tier === "desktop" ? 250 : tier === "tablet" ? 200 : 160;
  const ready = !!data;

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">PTS Pacing</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowTargets(true)}
            title="Pacing targets"
            className="rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700"
          >
            <Settings className="w-4 h-4" />
          </button>
          <Link to={createPageUrl("ShopProduction")}>
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-800 text-xs">
              <Factory className="w-3 h-3" /> View Board
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Chip label="Day" value={formatStagePoints(dayPoints)} goal={target} />
        <Chip label="Week" value={formatStagePoints(weekPoints)} goal={weekTargetPoints(today, target)} />
        <Chip label="Month" value={formatStagePoints(monthPoints)} goal={monthTargetPoints(today, target)} />
        <Chip label="Qtr" value={formatStagePoints(quarterPoints)} goal={quarterTargetPoints(today, target)} />
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {MODES.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                mode === option.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {mode === "day" && projected != null && (
          <p className="text-[11px] text-slate-500 whitespace-nowrap">
            Projected <span className="font-semibold text-slate-700">{formatStagePoints(projected)}</span> pts
          </p>
        )}
      </div>

      <PacingAreaPicker value={area} onChange={setArea} />

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Pacing is unavailable right now.
        </p>
      )}

      {!isError && !ready && (
        <div className="flex items-center justify-center text-xs text-slate-400" style={{ height: chartHeight }}>
          Loading points…
        </div>
      )}

      {!isError && ready && mode === "day" && (
        <DayPacingChart
          series={data?.series}
          upto={minuteNow}
          height={chartHeight}
          dense={tier === "narrow"}
          area={area}
          targets={targets}
        />
      )}

      {!isError && ready && mode === "week" && (
        <TrendPacingChart
          days={data?.windows?.week?.days || []}
          todayStr={todayStr}
          mode="week"
          height={chartHeight}
          area={area}
          resolveTargets={targetsFor}
        />
      )}

      {!isError && ready && mode === "month" && (
        <TrendPacingChart
          days={data?.windows?.month?.days || []}
          todayStr={todayStr}
          mode="month"
          height={chartHeight}
          area={area}
          resolveTargets={targetsFor}
        />
      )}

      {!isError && ready && (
        <Legend
          area={area}
          zones={zones}
          targets={targets}
          tint={mode === "day" ? "Non-production" : "Weekend"}
        />
      )}

      <PacingTargetsDialog open={showTargets} onOpenChange={setShowTargets} />
    </div>
  );
}