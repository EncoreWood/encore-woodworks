import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  DAILY_MINIMUM, DAILY_TARGET, DAY_END, DAY_START, NON_PRODUCTION_BLOCKS,
  buildAreaPacingRows, formatClock, formatShortClock,
} from "@/lib/productionPacing";
import { axisTicks, formatAxisValue } from "@/lib/pacingAxis";
import { AREA_IDS, visibleAreas } from "./pacingAreas";

const DAY_TICKS = [420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020];

function ChartTooltip({ active, payload, label, areas, showMinimum }) {
  if (!active || !payload?.length) return null;
  const value = key => payload.find(entry => entry.dataKey === key)?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-700">{formatClock(label)}</p>
      {areas.map(area => (
        <p key={area.id} style={{ color: area.color }}>
          {area.label} <span className="font-semibold">{value(area.id) ?? 0}</span>
        </p>
      ))}
      <p className="text-blue-600">Target {value("target")}</p>
      {showMinimum && <p className="text-slate-500">Minimum {value("minimum")}</p>}
    </div>
  );
}

export default function DayPacingChart({ series, upto, height, dense, area = "all" }) {
  const areas = visibleAreas(area);
  const showMinimum = area !== "all";
  const rows = buildAreaPacingRows(series || {}, AREA_IDS, upto, DAY_START);
  const end = Math.max(DAY_START + 1, Math.min(upto, DAY_END));
  const highest = Math.max(
    DAILY_TARGET,
    ...rows.flatMap(row => areas.map(item => Number(row[item.id]) || 0))
  );
  const ticks = axisTicks(highest);
  const top = ticks[ticks.length - 1];
  const xTicks = DAY_TICKS.filter(minute => minute >= DAY_START && minute <= end);
  const last = rows.length ? rows[rows.length - 1] : null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
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
            ticks={xTicks} tickFormatter={formatShortClock}
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={dense ? "preserveStartEnd" : 0}
            axisLine={{ stroke: "#cbd5e1" }} tickLine={false}
          />
          <YAxis
            domain={[0, top]} ticks={ticks} tickFormatter={formatAxisValue} allowDecimals={false}
            tick={{ fontSize: 10, fill: "#64748b" }} tickMargin={4}
            axisLine={false} tickLine={false} width={32}
          />
          <Tooltip content={<ChartTooltip areas={areas} showMinimum={showMinimum} />} />
          <Line type="linear" dataKey="target" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          {showMinimum && (
            <Line type="linear" dataKey="minimum" stroke="#94a3b8" strokeDasharray="2 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          )}
          {areas.map(item => (
            <Line
              key={item.id}
              type="stepAfter"
              dataKey={item.id}
              stroke={item.color}
              strokeWidth={showMinimum ? 2.5 : 1.8}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {areas.map(item => {
            const value = Number(last?.[item.id]) || 0;
            if (!value) return null;
            return (
              <ReferenceDot
                key={item.id}
                x={end} y={value} r={showMinimum ? 4 : 3}
                fill={item.color} stroke="#ffffff" strokeWidth={1.5}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}