import React from "react";
import { ChevronDown, ChevronRight, Hammer, AlertTriangle } from "lucide-react";

/**
 * Phone-only compact production card: shows job name, room name and card name.
 * Tapping it expands to render the full ProductionCard (passed as children).
 */
export default function MobileCompactCard({
  jobName,
  roomName,
  cardName,
  isUrgent,
  isBeingWorked,
  expanded,
  onToggle,
  moveStages = [],
  onMove,
  children
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm active:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {isBeingWorked && <Hammer className="w-3 h-3 text-blue-600 flex-shrink-0" />}
          {isUrgent && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
          <span className="text-[11px] text-slate-500 truncate">
            {jobName}{roomName ? <span> · {roomName}</span> : null}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">{cardName}</span>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {moveStages.length > 0 && onMove && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Move to</div>
              <div className="flex flex-wrap gap-1.5">
                {moveStages.map(stage => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onMove(stage.id)}
                    className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2.5 py-1.5 transition-colors"
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}