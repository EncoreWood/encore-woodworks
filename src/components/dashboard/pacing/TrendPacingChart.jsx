import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { DAILY_MINIMUM, DAILY_TARGET } from "@/lib/productionPacing";
import { isWeekend, paceTargets, shopDay } from "@/lib/pacingTargets";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const value = key => payload.find(entry => entry.dataKey === key)?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-700">{format(shopDay(row.date), "EEE, MMM d")}</p>
      <p className="text-emerald-700">Completed {row.actual ?? 0}</p>
      <p className="text-blue-600">Target {value("target")}</p>
      <p className="text-slate-500">Minimum {value("minimum")}</p>
    </div>
  );
}

export default function TrendPacingChart({ days = [], todayStr, mode, height }) {
  const windowStart = days.length ? shopDay(days[0].date) : null;
  const rows = [];
  let cumulative = 0;

  days.forEach((day, index) => {
    const date = shopDay(day.date);
    const finished = day.date <= todayStr;
    if (finished) cumulative += Number(day.points?.complete) || 0;
    const { target, minimum } = paceTargets(date, windowStart);
    rows.push({
      index,
      date: day.date,
      label: mode === "week" ? format(date, "EEE") : String(date.getDate()),
      actual: finished ? Math.round(cumulative * 100) / 100 : null,
      target,
      minimum,
      weekend: isWeekend(date),
    });
  });

  const lastTarget = rows.length ? rows[rows.length - 1].target : DAILY_TARGET;
  const top = Math.max(DAILY_TARGET, lastTarget, ...rows.map(row => row.actual || 0)) * 1.05;
  const ticks = mode === "week"
    ? rows.map(row => row.index)
    : rows.filter(row => row.index === 0 || (row.index + 1) % 5 === 0 || row.index === rows.length - 1).map(row => row.index);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          {rows.filter(row => row.weekend).map(row => (
            <ReferenceArea
              key={row.index}
              x1={row.index - 0.5} x2={row.index + 0.5} y1={0} y2={top}
              fill="#f1f5f9" fillOpacity={1} stroke="none"
            />
          ))}
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="index" type="number" domain={[-0.5, Math.max(rows.length - 0.5, 0.5)]}
            ticks={ticks} tickFormatter={index => rows[index]?.label ?? ""}
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }} tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(top)]} tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false} tickLine={false} width={34}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line type="linear" dataKey="target" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="minimum" stroke="#94a3b8" strokeDasharray="2 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="actual" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}