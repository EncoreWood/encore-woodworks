import { cn } from "@/lib/utils";

// MissingItem statuses grouped into the three progress buckets
const OPEN_STATUSES = ["Open", "Ordered", "Received"];
const IN_PRODUCTION_STATUSES = ["In Production", "Ready"];
const COMPLETE_STATUSES = ["Completed", "Resolved"];

/**
 * Stacked progress bar showing what percentage of a room's missing items
 * are open (red), in production (amber), and complete (green).
 * Pass the room's missing-item records via `items`.
 */
export default function RoomMissingProgress({ items }) {
  const roomItems = items || [];
  if (roomItems.length === 0) return null;

  const counts = { open: 0, inProduction: 0, complete: 0 };
  roomItems.forEach((r) => {
    if (COMPLETE_STATUSES.includes(r.status)) counts.complete++;
    else if (IN_PRODUCTION_STATUSES.includes(r.status)) counts.inProduction++;
    else counts.open++;
  });

  const total = roomItems.length;
  const pct = (n) => Math.round((n / total) * 100);

  const title = `${pct(counts.open)}% open (${counts.open}) · ${pct(counts.inProduction)}% in production (${counts.inProduction}) · ${pct(counts.complete)}% complete (${counts.complete})`;

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <span className="flex h-2 w-20 rounded-full overflow-hidden bg-slate-200">
        {counts.open > 0 && (
          <span className="bg-red-400" style={{ width: `${pct(counts.open)}%` }} />
        )}
        {counts.inProduction > 0 && (
          <span className="bg-amber-400" style={{ width: `${pct(counts.inProduction)}%` }} />
        )}
        {counts.complete > 0 && (
          <span className="bg-green-500" style={{ width: `${pct(counts.complete)}%` }} />
        )}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold whitespace-nowrap">
        <span className="text-red-500">{pct(counts.open)}% open</span>
        <span className="text-amber-500">{pct(counts.inProduction)}% in prod</span>
        <span className={cn(counts.complete === total ? "text-green-600" : "text-green-500")}>{pct(counts.complete)}% complete</span>
      </span>
    </span>
  );
}