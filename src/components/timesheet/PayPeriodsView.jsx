import React, { useState } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Returns the pay period that contains the given date.
 * Pay period: 16th of month → 15th of next month.
 */
function getPayPeriodForDate(date) {
  const day = date.getDate();
  let start, end;
  if (day >= 16) {
    start = new Date(date.getFullYear(), date.getMonth(), 16);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 15);
  } else {
    start = new Date(date.getFullYear(), date.getMonth() - 1, 16);
    end = new Date(date.getFullYear(), date.getMonth(), 15);
  }
  return { start, end };
}

function getPeriodLabel(start, end) {
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export default function PayPeriodsView({ employeeEntries }) {
  const today = new Date();
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current period, -1 = prev, etc.

  // Calculate the period anchor by shifting months
  const anchorDate = new Date(today.getFullYear(), today.getMonth() + periodOffset, today.getDate());
  const { start: periodStart, end: periodEnd } = getPayPeriodForDate(anchorDate);

  const startStr = format(periodStart, "yyyy-MM-dd");
  const endStr = format(periodEnd, "yyyy-MM-dd");

  // Filter entries for this pay period (work entries only)
  const periodEntries = employeeEntries.filter(e =>
    e.entry_type === "work" && e.date >= startStr && e.date <= endStr
  );

  const totalHours = periodEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
  const overtimeHours = Math.max(0, totalHours - 80); // >80 hrs in a pay period = OT

  // Group by week within the period
  const weekGroups = {};
  periodEntries.forEach(entry => {
    const d = new Date(entry.date);
    // Find week start (Monday) for this entry
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    const weekMonday = new Date(d);
    weekMonday.setDate(d.getDate() - dow);
    const weekKey = format(weekMonday, "yyyy-MM-dd");
    if (!weekGroups[weekKey]) weekGroups[weekKey] = { weekStart: weekMonday, entries: [] };
    weekGroups[weekKey].entries.push(entry);
  });

  const weeks = Object.values(weekGroups).sort((a, b) => a.weekStart - b.weekStart);

  const isCurrentPeriod = periodOffset === 0;

  return (
    <div className="space-y-4">
      {/* Period navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPeriodOffset(o => o - 1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-sm font-semibold text-slate-700">
            {isCurrentPeriod ? "Current Period" : getPeriodLabel(periodStart, periodEnd)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPeriodOffset(o => o + 1)} disabled={periodOffset >= 0}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
          {!isCurrentPeriod && (
            <Button variant="ghost" size="sm" onClick={() => setPeriodOffset(0)} className="text-amber-600">
              Back to Current
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">{getPeriodLabel(periodStart, periodEnd)}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Hours</p>
          </div>
          <p className="text-2xl font-bold text-blue-800">{totalHours.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${overtimeHours > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${overtimeHours > 0 ? "text-orange-600" : "text-slate-400"}`} />
            <p className={`text-xs font-semibold uppercase tracking-wide ${overtimeHours > 0 ? "text-orange-700" : "text-slate-500"}`}>Overtime</p>
          </div>
          <p className={`text-2xl font-bold ${overtimeHours > 0 ? "text-orange-800" : "text-slate-400"}`}>{overtimeHours.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Work Days</p>
          </div>
          <p className="text-2xl font-bold text-green-800">{new Set(periodEntries.map(e => e.date)).size}</p>
        </div>
      </div>

      {/* Week breakdown */}
      {weeks.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No work entries for this pay period.</div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Breakdown by Week</p>
          {weeks.map(({ weekStart, entries }) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekTotal = entries.reduce((s, e) => s + (e.hours_worked || 0), 0);
            const weekOT = Math.max(0, weekTotal - 40);

            // Group entries by day
            const byDay = {};
            entries.forEach(e => {
              if (!byDay[e.date]) byDay[e.date] = [];
              byDay[e.date].push(e);
            });

            return (
              <div key={format(weekStart, "yyyy-MM-dd")} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Week header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${weekTotal >= 40 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>
                      {weekTotal.toFixed(2)} hrs
                    </span>
                    {weekOT > 0 && (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        +{weekOT.toFixed(2)} OT
                      </span>
                    )}
                  </div>
                </div>

                {/* Day rows */}
                <div className="divide-y divide-slate-100 bg-white">
                  {Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, dayEntries]) => {
                    const dayTotal = dayEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
                    const d = new Date(dateStr + "T00:00:00");
                    return (
                      <div key={dateStr} className="flex items-center gap-3 px-4 py-2">
                        <div className="w-24 flex-shrink-0">
                          <p className="text-xs font-semibold text-slate-700">{format(d, "EEE, MMM d")}</p>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-1">
                          {dayEntries.map(e => (
                            <span key={e.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-mono">
                              {e.clock_in || "?"} → {e.clock_out || "active"}{e.project_name ? ` · ${e.project_name}` : ""}
                            </span>
                          ))}
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full ${dayTotal >= 8 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                          {dayTotal.toFixed(2)} hrs
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}