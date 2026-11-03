import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown only when a data call actually failed. The board keeps rendering underneath
// and the real reason is on screen, instead of a silent empty board.
export default function BoardErrorBanner({ itemsError, pointsError, onRetry }) {
  if (!itemsError && !pointsError) return null;
  const message = itemsError
    ? `Couldn't load production cards — ${itemsError}`
    : `Stage points are temporarily unavailable — ${pointsError}`;
  return (
    <div
      className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        itemsError ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1 leading-relaxed">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry} className="h-6 flex-shrink-0 gap-1 px-2 text-[11px]">
        <RefreshCw className="h-3 w-3" /> Retry
      </Button>
    </div>
  );
}