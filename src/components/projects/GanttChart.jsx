import { useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_COLORS = {
  phase: "#3b82f6",
  milestone: "#f59e0b",
  event: "#64748b",
};

const COMPLETED_COLOR = "#22c55e";

export default function GanttChart({ events, onBarClick, readOnly }) {
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (events.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: addDays(today, 30), totalDays: 30 };
    }
    const dates = events.flatMap(e => [new Date(e.start_date), new Date(e.end_date)]).filter(d => !isNaN(d));
    let min = new Date(Math.min(...dates));
    let max = new Date(Math.max(...dates));
    min = addDays(min, -3);
    max = addDays(max, 3);
    if (min >= max) max = addDays(min, 7);
    return { minDate: min, maxDate: max, totalDays: Math.max(1, differenceInDays(max, min)) };
  }, [events]);

  const today = new Date();
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, minDate) / totalDays) * 100));

  const sortedEvents = [...events].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const getBarStyle = (event) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const isMilestone = event.start_date === event.end_date;
    const daysFromStart = differenceInDays(start, minDate);
    const duration = Math.max(1, differenceInDays(end, start) + 1);
    const leftPct = (daysFromStart / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;
    const color = event.is_completed ? COMPLETED_COLOR : (event.color || TYPE_COLORS[event.event_type] || TYPE_COLORS.event);
    return { leftPct, widthPct: Math.max(widthPct, 1.5), color, isMilestone };
  };

  const monthLabels = useMemo(() => {
    const labels = [];
    const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
      const pct = (differenceInDays(cur, minDate) / totalDays) * 100;
      labels.push({ label: format(cur, "MMM"), pct });
      cur.setMonth(cur.getMonth() + 1);
    }
    return labels;
  }, [minDate, maxDate, totalDays]);

  if (events.length === 0) {
    return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">No timeline events yet. Add one to get started.</div>;
  }

  const labelColWidth = 160;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Event rows + Today line overlay */}
        <div className="relative">
          <div className="space-y-0 relative z-10">
            {sortedEvents.map((event) => {
              const style = getBarStyle(event);
              return (
                <div key={event.id} className="flex items-stretch border-b border-slate-100 h-12">
                  <div className="flex items-center pr-3 text-sm font-medium text-slate-700 flex-shrink-0 truncate" style={{ width: labelColWidth }}>
                    <span className="truncate" title={event.event_name}>{event.event_name}</span>
                  </div>
                  <div className="flex-1 relative bg-slate-50/50">
                    {style.isMilestone ? (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onBarClick?.(event)}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                        style={{ left: `${style.leftPct}%` }}
                      >
                        <div className="w-4 h-4 rotate-45 rounded-sm shadow-md transition-transform group-hover:scale-125" style={{ backgroundColor: style.color }} />
                        {event.is_completed && <CheckCircle2 className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white -rotate-45" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onBarClick?.(event)}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm transition-all flex items-center px-2 z-10",
                          !readOnly && "group hover:shadow-md hover:brightness-110 cursor-pointer"
                        )}
                        style={{ left: `${style.leftPct}%`, width: `${style.widthPct}%`, backgroundColor: style.color, height: "28px" }}
                      >
                        <span className="text-[10px] font-bold text-white truncate flex items-center gap-1">
                          {event.is_completed && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
                          {format(new Date(event.start_date), "M/d")}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today line spanning all rows */}
          {todayPct > 0 && todayPct < 100 && (
            <div className="absolute top-0 left-0 right-0 flex pointer-events-none z-0" style={{ height: `${sortedEvents.length * 48}px` }}>
              <div style={{ width: labelColWidth }} className="flex-shrink-0" />
              <div className="flex-1 relative h-full">
                <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500" style={{ left: `${todayPct}%` }}>
                  <span className="absolute -top-5 left-0 -translate-x-1/2 text-[10px] font-bold text-red-500 bg-white px-1 rounded whitespace-nowrap">Today</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Month axis */}
        <div className="flex items-stretch border-t border-slate-200 mt-1">
          <div style={{ width: labelColWidth }} className="flex-shrink-0" />
          <div className="flex-1 relative h-7">
            {monthLabels.map((m, i) => (
              <span key={i} className="absolute text-xs font-medium text-slate-500 -translate-x-1/2" style={{ left: `${m.pct}%` }}>{m.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}