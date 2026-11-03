import { formatStagePoints } from "@/lib/stagePoints";

// One-line, chrome-free read of today's points per stage. Values come from the same
// shared points function that feeds the stage headers and the Pacing page.
const STAGES = [
  { id: "face_frame", short: "FF", label: "Face Frame" },
  { id: "spray", short: "SP", label: "Spray" },
  { id: "build", short: "BD", label: "Build" },
  { id: "complete", short: "CP", label: "Complete" },
];

export default function StageStrip({ points, loading, error, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Today's points by stage — open Pacing"
      aria-label="Today's points by stage — open Pacing"
      className="hidden h-8 flex-shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 md:flex"
    >
      {STAGES.map((stage, index) => (
        <span key={stage.id} className="flex items-center gap-1 whitespace-nowrap">
          {index > 0 && <span className="text-slate-300">·</span>}
          <span className="font-medium" title={stage.label}>{stage.short}</span>
          <span className="font-bold text-slate-800">
            {error ? "—" : loading ? "…" : formatStagePoints(points?.[stage.id] || 0)}
          </span>
        </span>
      ))}
    </button>
  );
}