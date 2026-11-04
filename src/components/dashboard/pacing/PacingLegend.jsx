import { ZONE_GREEN, ZONE_RED } from "@/lib/pacingZones";
import { visibleAreas } from "./pacingAreas";

/**
 * One legend for every pacing chart, so the dashboard, the Pacing tab and the
 * morning meeting read the same: the lines actually drawn, the pace references,
 * and either the tinted zones (single stage) or the shaded band (all areas).
 */
export default function PacingLegend({ area, tint = "Non-production", targets, zones }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
      {visibleAreas(area).map(item => (
        <span key={item.id} className="flex items-center gap-1">
          <span className="h-0.5 w-3" style={{ backgroundColor: zones ? "#0f172a" : item.color }} /> {item.label}
        </span>
      ))}
      <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-blue-600" /> Target {targets.target}</span>
      {zones && (
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dotted border-slate-400" /> Minimum {targets.minimum}</span>
      )}
      {zones ? (
        <>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_GREEN, opacity: 0.35 }} /> Ahead of target
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_RED, opacity: 0.35 }} /> Behind minimum
          </span>
        </>
      ) : (
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100" /> {tint}
        </span>
      )}
    </div>
  );
}