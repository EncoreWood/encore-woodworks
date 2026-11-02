import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { roomProgress } from "@/lib/roomProgress";

// Filled colour by progress band — neutral when nothing has started.
const fillFor = (pct) => {
  if (pct <= 0) return "bg-slate-300";
  if (pct <= 33) return "bg-red-500";
  if (pct <= 66) return "bg-amber-500";
  if (pct < 100) return "bg-sky-500";
  return "bg-emerald-500";
};

const textFor = (pct) => {
  if (pct <= 0) return "text-slate-500";
  if (pct <= 33) return "text-red-600";
  if (pct <= 66) return "text-amber-600";
  if (pct < 100) return "text-sky-700";
  return "text-emerald-700";
};

/**
 * Slim at-a-glance production progress bar for one room. Give it the room's
 * production cards; it averages their stages and updates as soon as those cards
 * change (the items come from the live production item subscription).
 */
export default function RoomProgressBar({ items = [], label = "Production", className = "" }) {
  const { pct, cardCount, completeCount } = useMemo(() => roomProgress(items), [items]);
  const empty = cardCount === 0;
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
          className={cn("h-full rounded-full transition-[width] duration-300 ease-out", fillFor(pct))}
          style={{ width: `${empty ? 0 : pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-bold whitespace-nowrap flex-shrink-0 tabular-nums",
          empty ? "text-slate-400 font-medium" : textFor(pct)
        )}
      >
        {empty ? "No cards" : `${pct}%`}
      </span>
    </div>
  );
}