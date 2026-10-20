import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, TrendingUp, Gift } from "lucide-react";
import { parseDate } from "@/lib/parseDate";

const fmt$ = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const typeBadge = {
  work: "bg-blue-100 text-blue-700",
  pto: "bg-purple-100 text-purple-700",
  vacation: "bg-green-100 text-green-700",
  sick: "bg-orange-100 text-orange-700",
};

const typeLabel = { work: "Work", pto: "PTO", vacation: "Vacation", sick: "Sick" };

export default function EmployeePayPeriodDialog({ employee, entries, periodStart, periodEnd, open, onOpenChange }) {
  if (!employee) return null;

  const dayGroups = entries
    .filter(e => e.date >= format(periodStart, "yyyy-MM-dd") && e.date <= format(periodEnd, "yyyy-MM-dd"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, e) => {
      (acc[e.date] = acc[e.date] || []).push(e);
      return acc;
    }, {});

  const totalHrs = entries
    .filter(e => e.date >= format(periodStart, "yyyy-MM-dd") && e.date <= format(periodEnd, "yyyy-MM-dd"))
    .reduce((s, e) => s + (e.hours_worked || 0), 0);
  const workHrs = entries
    .filter(e => e.date >= format(periodStart, "yyyy-MM-dd") && e.date <= format(periodEnd, "yyyy-MM-dd") && e.entry_type === "work")
    .reduce((s, e) => s + (e.hours_worked || 0), 0);
  const ptoHrs = totalHrs - workHrs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee.full_name} — Pay Period Summary</DialogTitle>
          <DialogDescription>
            {format(periodStart, "MMM d, yyyy")} – {format(periodEnd, "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        {/* Totals chips */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Work</p>
            <p className="text-sm font-bold text-slate-800">{workHrs.toFixed(2)} hrs</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Overtime</p>
            <p className="text-sm font-bold text-slate-800">per weekly split</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500 flex items-center gap-1"><Gift className="w-3 h-3" /> PTO / Other</p>
            <p className="text-sm font-bold text-slate-800">{ptoHrs > 0 ? `${ptoHrs.toFixed(2)} hrs` : "—"}</p>
          </div>
        </div>

        {/* Day-by-day time cards */}
        {Object.keys(dayGroups).length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No time entries for this pay period.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(dayGroups).map(([date, dayEntries]) => {
              const dayHrs = dayEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
              return (
                <div key={date} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm font-semibold text-slate-800">{format(parseDate(date), "EEE, MMM d")}</span>
                    <span className="text-xs text-slate-500 font-semibold">{dayHrs.toFixed(2)} hrs</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {dayEntries.map((e, i) => (
                      <div key={e.id || i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeBadge[e.entry_type] || "bg-slate-100 text-slate-700"}`}>
                            {typeLabel[e.entry_type] || e.entry_type}
                          </span>
                          <span className="text-slate-700 truncate">
                            {e.clock_in ? `${e.clock_in} – ${e.clock_out || "?"}` : "No clock in"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {e.project_name && <span className="truncate max-w-[160px]">{e.project_name}</span>}
                          <span className="font-semibold text-slate-700">{(e.hours_worked || 0).toFixed(2)} hrs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold">
              <span>Period total</span>
              <span>{totalHrs.toFixed(2)} hrs</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}