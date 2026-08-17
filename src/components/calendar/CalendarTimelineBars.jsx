import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

const TYPE_COLORS = { phase: "#3b82f6", milestone: "#f59e0b", event: "#64748b" };
const COMPLETED_COLOR = "#22c55e";

// Given a timeline event + projects list, resolve the linked project (if any)
function linkedProject(ev, projects) {
  return projects.find(p => p.id === ev.project_id) || null;
}

function barColor(ev) {
  if (ev.is_completed) return COMPLETED_COLOR;
  return ev.color || TYPE_COLORS[ev.event_type] || TYPE_COLORS.event;
}

/**
 * Compact horizontal bars for a calendar cell — one per timeline phase spanning that date.
 */
export function CalendarTimelineBars({ events, projects, filterActive, onSelect }) {
  if (!events || events.length === 0) return null;
  return (
    <>
      {events.map(ev => {
        const project = linkedProject(ev, projects);
        if (filterActive && project && project.archived) return null;
        const color = barColor(ev);
        const isMilestone = ev.event_type === "milestone" || (ev.start_date === ev.end_date);
        const title = `${ev.event_name}${project ? " — " + project.project_name : ""}`;
        return (
          <div
            key={ev.id}
            className="h-3 rounded-sm flex items-center gap-0.5 px-1 overflow-hidden cursor-pointer hover:brightness-110 transition"
            style={{ backgroundColor: color + "26", borderLeft: `3px solid ${color}` }}
            title={title}
            onClick={(e) => { e.stopPropagation(); onSelect && onSelect(ev); }}
          >
            {ev.is_completed && <CheckCircle2 className="w-2 h-2 flex-shrink-0" style={{ color }} />}
            {isMilestone && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
            <span className="text-[8px] font-bold truncate leading-none" style={{ color }}>{ev.event_name}</span>
          </div>
        );
      })}
    </>
  );
}

/**
 * Detail list for the selected-day panel.
 */
export function CalendarTimelineDetails({ events, projects }) {
  if (!events || events.length === 0) return null;
  return (
    <>
      {(events.length > 0) && <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <CalendarIconSmall /> Timeline Phases
      </h4>}
      <div className="space-y-1.5">
        {events.map(ev => {
          const project = linkedProject(ev, projects);
          const color = barColor(ev);
          const range = ev.start_date
            ? (ev.end_date && ev.end_date !== ev.start_date
                ? `${format(new Date(ev.start_date + "T00:00:00"), "M/d")} – ${format(new Date(ev.end_date + "T00:00:00"), "M/d")}`
                : format(new Date(ev.start_date + "T00:00:00"), "M/d"))
            : "";
          const link = project ? createPageUrl("ProjectDetails") + "?id=" + project.id : null;
          const content = (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs font-semibold text-slate-900 truncate">{ev.event_name}</span>
                {ev.is_completed && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
              </div>
              <p className="text-[10px] text-slate-500 truncate ml-3.5">
                {project?.project_name || "—"}{range ? ` · ${range}` : ""}
              </p>
            </>
          );
          return link ? (
            <Link key={ev.id} to={link} className="block p-2 rounded-lg border-l-2 bg-slate-50 hover:bg-slate-100 transition" style={{ borderLeftColor: color }}>
              {content}
            </Link>
          ) : (
            <div key={ev.id} className="p-2 rounded-lg border-l-2 bg-slate-50" style={{ borderLeftColor: color }}>
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}

// tiny inline calendar icon to avoid an extra import label clash
function CalendarIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default CalendarTimelineBars;