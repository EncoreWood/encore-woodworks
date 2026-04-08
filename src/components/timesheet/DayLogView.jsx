import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks } from "date-fns";
import { ChevronDown, ChevronRight, Clock, Briefcase, UtensilsCrossed, CheckCircle2, Trash2, Pencil, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeColors = {
  work: "bg-blue-100 text-blue-800",
  pto: "bg-yellow-100 text-yellow-800",
  vacation: "bg-purple-100 text-purple-800",
  sick: "bg-red-100 text-red-800"
};

function DayRow({ date, entries, isToday, openEntryId, isAdmin, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(isToday);
  const dateStr = format(date, "yyyy-MM-dd");

  const workEntries = entries.filter(e => e.entry_type === "work");
  const otherEntries = entries.filter(e => e.entry_type !== "work");
  const totalHours = workEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
  const hasActive = workEntries.some(e => !e.clock_out);
  const hasEntries = entries.length > 0;

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all",
      isToday ? "border-amber-300 shadow-sm" : "border-slate-200",
      isWeekend && !hasEntries ? "opacity-40" : ""
    )}>
      {/* Day header row - always visible */}
      <button
        onClick={() => hasEntries && setExpanded(e => !e)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          isToday ? "bg-amber-50 hover:bg-amber-100" : "bg-white hover:bg-slate-50",
          !hasEntries && "cursor-default"
        )}
      >
        {/* Expand icon */}
        <div className="w-5 flex-shrink-0 text-slate-400">
          {hasEntries ? (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : null}
        </div>

        {/* Day name */}
        <div className="w-28 flex-shrink-0">
          <p className={cn("text-sm font-semibold", isToday ? "text-amber-800" : "text-slate-800")}>
            {isToday ? "Today" : format(date, "EEE")}
          </p>
          <p className="text-xs text-slate-500">{format(date, "MMM d")}</p>
        </div>

        {/* Entry summary */}
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {hasActive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" /> Active
            </span>
          )}
          {otherEntries.map(e => (
            <span key={e.id} className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${typeColors[e.entry_type]}`}>
              {e.entry_type}
            </span>
          ))}
          {workEntries.length > 0 && (
            <span className="text-xs text-slate-500">{workEntries.length} {workEntries.length === 1 ? "entry" : "entries"}</span>
          )}
        </div>

        {/* Total hours badge */}
        {totalHours > 0 && (
          <span className={cn(
            "text-sm font-bold px-3 py-1 rounded-full flex-shrink-0",
            totalHours >= 8 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"
          )}>
            {totalHours.toFixed(2)} hrs
          </span>
        )}
        {!hasEntries && (
          <span className="text-xs text-slate-400 flex-shrink-0">—</span>
        )}
      </button>

      {/* Expanded entries */}
      {expanded && hasEntries && (
        <div className="border-t border-slate-100 divide-y divide-slate-50 bg-white">
          {workEntries.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-amber-700">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.project_name && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Briefcase className="w-3 h-3" /> {entry.project_name}
                    </span>
                  )}
                  {entry.notes && entry.notes.includes("[−30 min lunch]") && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <UtensilsCrossed className="w-3 h-3" /> lunch deducted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-600">
                  <span className="font-mono text-xs text-slate-700">
                    {entry.clock_in || "—"} → {entry.clock_out
                      ? entry.clock_out
                      : <span className="text-green-600 animate-pulse font-semibold">Active</span>
                    }
                  </span>
                  {entry.hours_worked != null && (
                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                      {entry.hours_worked.toFixed(2)} hrs
                    </span>
                  )}
                </div>
                {entry.notes && !entry.notes.includes("[−30 min lunch]") && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">{entry.notes}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(entry)} className="text-blue-600 hover:bg-blue-50 h-7 w-7 p-0">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(entry.id)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {otherEntries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeColors[entry.entry_type]}`}>
                  {entry.entry_type}
                </span>
                {entry.notes && <p className="text-xs text-slate-500 mt-0.5 ml-1">{entry.notes}</p>}
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(entry.id)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DayLogView({ employeeEntries, currentUser, onEdit, onDelete, weekOffset = 0, onWeekChange }) {
  const today = new Date();
  const baseDate = addWeeks(today, weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const todayStr = format(today, "yyyy-MM-dd");
  const weekTotal = employeeEntries
    .filter(e => {
      const d = e.date;
      return e.entry_type === "work" && d >= format(weekStart, "yyyy-MM-dd") && d <= format(weekEnd, "yyyy-MM-dd");
    })
    .reduce((s, e) => s + (e.hours_worked || 0), 0);

  return (
    <div className="space-y-3">
      {/* Week navigation + summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset - 1)}>← Prev Week</Button>
          <span className="text-sm font-semibold text-slate-700">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : format(weekStart, "MMM d") + " – " + format(weekEnd, "MMM d")}
          </span>
          <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset + 1)} disabled={weekOffset >= 0}>Next Week →</Button>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-700">{weekTotal.toFixed(2)} hrs</span>
          <span className="text-xs text-slate-500">this week</span>
          {weekTotal > 40 && (
            <span className="text-xs font-semibold text-orange-600">+{(weekTotal - 40).toFixed(2)} OT</span>
          )}
        </div>
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = employeeEntries.filter(e => e.date === dateStr);
          return (
            <DayRow
              key={dateStr}
              date={day}
              entries={dayEntries}
              isToday={dateStr === todayStr}
              isAdmin={currentUser?.role === "admin"}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}