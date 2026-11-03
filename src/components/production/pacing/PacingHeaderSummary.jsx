import {
  DAY_END, DAILY_TARGET, DAILY_MINIMUM,
  paceAt, denverMinuteNow, projectedFinish, formatClock, productionMinutesAt,
} from "@/lib/productionPacing";
import { formatStagePoints } from "@/lib/stagePoints";
import PacingSparkline from "./PacingSparkline";

// Inline pacing chip for the Shop Production header. It grows into a sparkline +
// projection on desktop, keeps the bar on iPad, and shrinks to a bare pair on phones:
// the action buttons never shrink, this does.
export default function PacingHeaderSummary({ points, series, onOpen, loading }) {
  const minuteNow = denverMinuteNow();
  const completed = Number(points?.complete) || 0;
  const pace = paceAt(minuteNow, DAILY_TARGET);
  const diff = completed - pace;
  const inProduction = productionMinutesAt(minuteNow) > 0;
  const status = !inProduction ? "neutral" : diff >= 0.5 ? "ahead" : diff <= -0.5 ? "behind" : "neutral";
  const projected = projectedFinish(completed, minuteNow);
  const pct = Math.max(0, Math.min(100, (completed / DAILY_TARGET) * 100));

  const tone = {
    ahead: { text: "text-green-700", bar: "bg-green-500", border: "border-green-200" },
    behind: { text: "text-amber-700", bar: "bg-amber-500", border: "border-amber-200" },
    neutral: { text: "text-slate-700", bar: "bg-slate-400", border: "border-slate-200" },
  }[status];

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Pacing — target ${DAILY_TARGET} pts, minimum ${DAILY_MINIMUM} pts by ${formatClock(DAY_END)}`}
      className={`flex h-9 min-w-0 flex-shrink items-center gap-2 rounded-lg border bg-white px-2 shadow-sm transition-colors hover:bg-slate-50 ${tone.border}`}
    >
      {/* Sparkline: desktop only */}
      <span className="hidden xl:inline-flex">
        <PacingSparkline series={series?.complete} upto={minuteNow} />
      </span>

      <span className="flex flex-col items-start leading-none min-w-0">
        <span className={`text-[11px] xl:text-xs font-bold whitespace-nowrap ${tone.text}`}>
          {loading ? "…" : `${formatStagePoints(completed)} / ${DAILY_TARGET}`}
          <span className="hidden md:inline font-medium opacity-70"> pts</span>
        </span>
        <span className="mt-1 h-1 w-8 md:w-14 overflow-hidden rounded-full bg-slate-200">
          <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
        </span>
      </span>

      <span className="hidden md:inline text-[10px] font-semibold whitespace-nowrap text-slate-400">
        {projected == null ? "" : `proj ${formatStagePoints(projected)}`}
      </span>
    </button>
  );
}