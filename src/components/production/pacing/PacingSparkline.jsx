import { DAY_START, DAY_END, FALLBACK_TARGETS, buildPacingRows } from "@/lib/productionPacing";
import { COMPLETED_INK } from "@/lib/pacingZones";

// Tiny step line for the header — no axis, no labels, just today's completed shape.
export default function PacingSparkline({ series, upto, targets = FALLBACK_TARGETS }) {
  const width = 120;
  const height = 32;
  const rows = buildPacingRows(series, Math.min(upto, DAY_END), DAY_START, targets);
  const max = Math.max(Number(targets.target) || 0, ...rows.map(row => row.actual));
  const span = Math.max(1, DAY_END - DAY_START);
  const x = minute => ((minute - DAY_START) / span) * (width - 2) + 1;
  const y = value => height - 2 - (value / max) * (height - 4);

  let path = "";
  rows.forEach((row, index) => {
    if (index === 0) {
      path += `M ${x(row.minute).toFixed(1)} ${y(row.actual).toFixed(1)}`;
      return;
    }
    const previous = rows[index - 1];
    path += ` L ${x(row.minute).toFixed(1)} ${y(previous.actual).toFixed(1)}`;
    path += ` L ${x(row.minute).toFixed(1)} ${y(row.actual).toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="flex-shrink-0">
      <line
        x1={1} x2={width - 1}
        y1={y(targets.target)} y2={y(targets.target)}
        stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3"
      />
      {path && <path d={path} fill="none" stroke={COMPLETED_INK} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}