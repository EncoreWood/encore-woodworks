import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { DEFAULT_MINIMUM, DEFAULT_TARGET } from "@/lib/pacingSettings";
import { isWeekend, shopDay } from "@/lib/pacingTargets";
import { axisTicks, formatAxisValue } from "@/lib/pacingAxis";
import { COMPLETED_INK, COMPLETED_WIDTH } from "@/lib/pacingZones";
import { AREA_IDS, visibleAreas } from "./pacingAreas";
import PacingZoneAreas from "./PacingZoneAreas";

const DEFAULT_FOR = { target: DEFAULT_TARGET, minimum: DEFAULT_MINIMUM };

function ChartTooltip({ active, payload, areas, showMinimum }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const value = key => payload.find(entry => entry.dataKey === key)?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-700">{format(shopDay(row.date), "EEE, MMM d")}</p>
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

export default function TrendPacingChart({ days = [], todayStr, mode, height, area = "all", resolveTargets }) {
  const areas = visibleAreas(area);
  const zones = area !== "all";
  const targetsFor = resolveTargets || (() => DEFAULT_FOR);
  const rows = [];
  const running = Object.fromEntries(AREA_IDS.map(id => [id, 0]));

  // Each business day adds the target that was in effect on that day, so a target
  // changed mid-window only lifts the days from then on.
  let cumulativeTarget = 0;
  let cumulativeMinimum = 0;

  days.forEach((day, index) => {
    const date = shopDay(day.date);
    const finished = day.date <= todayStr;
    if (finished) AREA_IDS.forEach(id => { running[id] += Number(day.points?.[id]) || 0; });
    const dayTargets = targetsFor(day.date) || DEFAULT_FOR;
    if (!isWeekend(date)) {
      cumulativeTarget += Number(dayTargets.target) || 0;
      cumulativeMinimum += Number(dayTargets.minimum) || 0;
    }
    const row = {
      index,
      date: day.date,
      label: mode === "week" ? format(date, "EEE") : String(date.getDate()),
      target: Math.round(cumulativeTarget * 100) / 100,
      minimum: Math.round(cumulativeMinimum * 100) / 100,
      weekend: isWeekend(date),
    };
    AREA_IDS.forEach(id => { row[id] = finished ? Math.round(running[id] * 100) / 100 : null; });
    rows.push(row);
  });

  const lastTarget = rows.length ? rows[rows.length - 1].target : DEFAULT_TARGET;
  const highest = Math.max(
    Number(targetsFor(todayStr || "").target) || DEFAULT_TARGET,
    lastTarget,
    ...rows.flatMap(row => areas.map(item => Number(row[item.id]) || 0))
  );
  const ticks = axisTicks(highest);
  const top = ticks[ticks.length - 1];
  const data = zones
    ? rows.map(row => ({ ...row, zoneTop: Math.max(0, top - row.target) }))
    : rows;
  const xTicks = mode === "week"
    ? rows.map(row => row.index)
    : rows.filter(row => row.index === 0 || (row.index + 1) % 5 === 0 || row.index === rows.length - 1).map(row => row.index);
  const lastFinished = rows.filter(row => row.date <= todayStr).pop();

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          {/* Weekend columns only in the all-areas view; they compete with the zones otherwise. */}
          {!zones && rows.filter(row => row.weekend).map(row => (
            <ReferenceArea
              key={row.index}
              x1={row.index - 0.5} x2={row.index + 0.5} y1={0} y2={top}
              fill="#f1f5f9" fillOpacity={1} stroke="none"
            />
          ))}
          {zones && <PacingZoneAreas curve="stepAfter" />}
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="index" type="number" domain={[-0.5, Math.max(rows.length - 0.5, 0.5)]}
            ticks={xTicks} tickFormatter={index => rows[index]?.label ?? ""}
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }} tickLine={false}
          />
          <YAxis
            domain={[0, top]} ticks={ticks} tickFormatter={formatAxisValue} allowDecimals={false}
            tick={{ fontSize: 10, fill: "#64748b" }} tickMargin={4}
            axisLine={false} tickLine={false} width={32}
          />
          <Tooltip content={<ChartTooltip areas={areas} showMinimum={zones} />} />
          <Line type="stepAfter" dataKey="target" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          {zones && (
            <Line type="stepAfter" dataKey="minimum" stroke="#94a3b8" strokeDasharray="2 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          )}
          {areas.map(item => (
            <Line
              key={item.id}
              type="linear"
              dataKey={item.id}
              stroke={zones ? COMPLETED_INK : item.color}
              strokeWidth={zones ? COMPLETED_WIDTH : 1.8}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {areas.map(item => {
            const value = Number(lastFinished?.[item.id]) || 0;
            if (!value) return null;
            return (
              <ReferenceDot
                key={item.id}
                x={lastFinished.index} y={value} r={zones ? 4 : 3}
                fill={zones ? COMPLETED_INK : item.color} stroke="#ffffff" strokeWidth={1.5}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}