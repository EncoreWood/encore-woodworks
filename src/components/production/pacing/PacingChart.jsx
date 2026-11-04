import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DAY_START, DAY_END, FALLBACK_TARGETS,
  buildPacingRows, formatClock, formatShortClock,
} from "@/lib/productionPacing";
import { COMPLETED_INK, COMPLETED_WIDTH, ZONE_GREEN, ZONE_RED } from "@/lib/pacingZones";
import PacingZoneAreas from "@/components/dashboard/pacing/PacingZoneAreas";

const X_TICKS = [420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = key => payload.find(entry => entry.dataKey === key)?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-700">{formatClock(label)}</p>
      <p className="text-slate-800">Actual {value("actual")}</p>
      <p className="text-blue-600">Target {value("target")}</p>
      <p className="text-slate-500">Minimum {value("minimum")}</p>
    </div>
  );
}

export default function PacingChart({ series, upto, height, dense, grade = "pts", targets = FALLBACK_TARGETS }) {
  const rows = buildPacingRows(series, upto, DAY_START, targets);
  const end = Math.max(DAY_START + 1, Math.min(upto, DAY_END));
  const maxActual = Math.max(0, ...rows.map(row => row.actual));
  const top = Math.ceil(Math.max(Number(targets.target) || 0, maxActual) * 1.15);
  const data = rows.map(row => ({ ...row, zoneTop: Math.max(0, top - row.target) }));
  const ticks = X_TICKS.filter(minute => minute >= DAY_START && minute <= end);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <PacingZoneAreas />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="minute" type="number" domain={[DAY_START, end]}
            ticks={ticks} tickFormatter={formatShortClock}
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={dense ? "preserveStartEnd" : 0}
            axisLine={{ stroke: "#cbd5e1" }} tickLine={false}
          />
          <YAxis
            domain={[0, top]} tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false} tickLine={false} width={38}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line type="linear" dataKey="target" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="minimum" stroke="#94a3b8" strokeDasharray="2 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="actual" stroke={COMPLETED_INK} strokeWidth={COMPLETED_WIDTH} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: COMPLETED_INK }} /> {grade}</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-blue-600" /> Target {targets.target}</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dotted border-slate-400" /> Minimum {targets.minimum}</span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_GREEN, opacity: 0.35 }} /> Ahead of target
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_RED, opacity: 0.35 }} /> Behind minimum
        </span>
      </div>
    </div>
  );
}