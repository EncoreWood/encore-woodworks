import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from "recharts";
import {
  DAY_START, DAY_END, DAILY_TARGET, DAILY_MINIMUM,
  NON_PRODUCTION_BLOCKS, buildPacingRows, formatClock, formatShortClock,
} from "@/lib/productionPacing";

const X_TICKS = [420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = key => payload.find(entry => entry.dataKey === key)?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-700">{formatClock(label)}</p>
      <p className="text-emerald-700">Actual {value("actual")}</p>
      <p className="text-blue-600">Target {value("target")}</p>
      <p className="text-slate-500">Minimum {value("minimum")}</p>
    </div>
  );
}

export default function PacingChart({ series, upto, height, dense, grade = "pts" }) {
  const rows = buildPacingRows(series, upto, DAY_START);
  const end = Math.max(DAY_START + 1, Math.min(upto, DAY_END));
  const maxActual = Math.max(0, ...rows.map(row => row.actual));
  const top = Math.max(DAILY_TARGET, maxActual) * 1.15;
  const ticks = X_TICKS.filter(minute => minute >= DAY_START && minute <= end);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          {NON_PRODUCTION_BLOCKS.map(block => {
            const x1 = Math.max(block.start, DAY_START);
            const x2 = Math.min(block.end, end);
            if (x2 <= x1) return null;
            return (
              <ReferenceArea
                key={block.label}
                x1={x1} x2={x2} y1={0} y2={top}
                fill="#f1f5f9" fillOpacity={1} stroke="none"
              />
            );
          })}
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="minute" type="number" domain={[DAY_START, end]}
            ticks={ticks} tickFormatter={formatShortClock}
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={dense ? "preserveStartEnd" : 0}
            axisLine={{ stroke: "#cbd5e1" }} tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(top)]} tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false} tickLine={false} width={38}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line type="linear" dataKey="target" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="minimum" stroke="#94a3b8" strokeDasharray="2 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="actual" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-emerald-600" /> {grade}</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-blue-600" /> Target {DAILY_TARGET}</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dotted border-slate-400" /> Minimum {DAILY_MINIMUM}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-200" /> Non-production</span>
      </div>
    </div>
  );
}