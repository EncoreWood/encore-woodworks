import { CHECKPOINTS, paceAt, formatClock } from "@/lib/productionPacing";
import { formatStagePoints } from "@/lib/stagePoints";
import usePacingTargets from "@/hooks/usePacingTargets";

// Stacked on phones, two columns on iPad, three on desktop — never a squeezed table.
export default function CheckpointList({ minuteNow }) {
  const { target: dailyTarget, minimum: dailyMinimum } = usePacingTargets();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {CHECKPOINTS.map(checkpoint => {
        const target = paceAt(checkpoint, dailyTarget);
        const minimum = paceAt(checkpoint, dailyMinimum);
        const passed = minuteNow >= checkpoint;
        return (
          <div
            key={checkpoint}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
              passed ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-white"
            }`}
          >
            <span className={`font-semibold ${passed ? "text-slate-800" : "text-slate-500"}`}>{formatClock(checkpoint)}</span>
            <span className="flex items-center gap-3">
              <span className="text-blue-700">target <strong>{formatStagePoints(target)}</strong></span>
              <span className="text-slate-500">min <strong>{formatStagePoints(minimum)}</strong></span>
            </span>
          </div>
        );
      })}
    </div>
  );
}