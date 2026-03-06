import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual indicator shown at the top of a page during pull-to-refresh.
 */
export default function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 80 }) {
  const progress = Math.min(pullDistance / threshold, 1);
  const visible = pullDistance > 8 || isRefreshing;

  if (!visible) return null;

  return (
    <div
      className="sm:hidden fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ paddingTop: `max(${pullDistance * 0.4}px, env(safe-area-inset-top))` }}
    >
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-md transition-all",
        isRefreshing
          ? "bg-amber-500 text-white"
          : progress >= 1
          ? "bg-amber-400 text-white"
          : "bg-white text-slate-500 border border-slate-200"
      )}>
        <RefreshCw
          className={cn("w-4 h-4 transition-transform", isRefreshing && "animate-spin")}
          style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
        />
        <span>{isRefreshing ? "Refreshing…" : progress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
    </div>
  );
}