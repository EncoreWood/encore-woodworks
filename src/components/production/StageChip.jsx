import { cn } from "@/lib/utils";
import { STAGE_PALETTE, stageKeyOf, stageLabelOf } from "@/lib/stagePalette";

/**
 * Compact stage pill — small solid dot + stage text in the shared stage palette.
 * Pass either a production `item` or an explicit `stageKey`.
 */
export default function StageChip({ item, stageKey, className }) {
  const key = stageKey || stageKeyOf(item);
  const palette = STAGE_PALETTE[key] || STAGE_PALETTE.staged;
  const label = stageKey ? palette.label : stageLabelOf(item);

  return (
    <span
      title={`Stage: ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap",
        palette.chip,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", palette.dot)} />
      {label}
    </span>
  );
}