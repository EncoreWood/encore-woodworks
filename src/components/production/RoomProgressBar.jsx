import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { roomProgress } from "@/lib/roomProgress";
import { progressBand } from "@/lib/stagePalette";

/**
 * Slim at-a-glance production progress bar for one room. Give it the room's
 * production cards; it averages their stages and updates as soon as those cards
 * change (the items come from the live production item subscription).
 */
export default function RoomProgressBar({ items = [], label = "Production", className = "" }) {
  const { pct, cardCount, completeCount } = useMemo(() => roomProgress(items), [items]);
  const empty = cardCount === 0;
  // Filled colour follows the shared stage palette by progress band.
  const band = progressBand(pct);
  const hint = empty
    ? "No cards in this room yet"
    : `${completeCount} of ${cardCount} card${cardCount !== 1 ? "s" : ""} complete · ${pct}% production`;

  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", className)} title={hint}>
      {label && (
        <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap flex-shrink-0">
          {label}
        </span>
      )}
      <div className="flex-1 min-w-[36px] h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-out", band.fill)}
          style={{ width: `${empty ? 0 : pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-bold whitespace-nowrap flex-shrink-0 tabular-nums",
          empty ? "text-slate-400 font-medium" : band.text
        )}
      >
        {empty ? "No cards" : `${pct}%`}
      </span>
    </div>
  );
}