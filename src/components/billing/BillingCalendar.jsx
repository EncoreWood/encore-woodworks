import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = {
  "Current":  "bg-green-100 text-green-800 border-green-300",
  "Behind":   "bg-red-100 text-red-800 border-red-300",
  "On Hold":  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Paid Off": "bg-slate-100 text-slate-500 border-slate-300",
};

export default function BillingCalendar({ items }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start so calendar aligns to Sunday
  const startPad = getDay(monthStart); // 0=Sun
  const paddedDays = [...Array(startPad).fill(null), ...days];

  // Group items by due_date day-of-month matching this month
  const getDueItems = (day) => {
    if (!day) return [];
    const dayStr = format(day, "yyyy-MM-dd");
    return items.filter(i => i.due_date === dayStr || (i.due_date && i.due_date.slice(8, 10) === format(day, "dd") && i.due_date.slice(5, 7) === format(day, "MM")));
  };

  // For recurring monthly bills, match by day-of-month only
  const getItemsForDay = (day) => {
    if (!day) return [];
    const dayOfMonth = parseInt(format(day, "d"), 10);
    const monthStr = format(day, "yyyy-MM");

    return items.filter(i => {
      if (!i.due_date) return false;
      if (i.status === "Paid Off") return false;
      const due = new Date(i.due_date + "T12:00:00");
      // Exact match
      if (format(due, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")) return true;
      // Monthly recurrence: same day-of-month for Monthly Bills
      if (i.category === "Monthly Bill") {
        return due.getDate() === dayOfMonth;
      }
      return false;
    });
  };

  const today = new Date();

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;
          const dueItems = getItemsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] rounded-lg border p-1.5 ${isToday ? "border-amber-400 bg-amber-50" : "border-slate-100 bg-white"}`}
            >
              <div className={`text-xs font-bold mb-1 ${isToday ? "text-amber-700" : "text-slate-600"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dueItems.map(item => (
                  <div
                    key={item.id}
                    title={`${item.name} — ${item.category} — ${item.status}${item.monthly_amount ? ` — $${item.monthly_amount}` : ""}`}
                    className={`text-xs px-1 py-0.5 rounded border truncate font-medium ${STATUS_COLORS[item.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded border ${cls}`} />
            <span className="text-xs text-slate-600">{status}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-2">· Monthly Bills recur each month by due day · Hover items for details</span>
      </div>
    </div>
  );
}