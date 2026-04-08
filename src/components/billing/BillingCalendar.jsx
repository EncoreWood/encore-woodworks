import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, differenceInCalendarDays, differenceInCalendarWeeks, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const STATUS_COLORS = {
  "Current":  "bg-green-100 text-green-800 border-green-300",
  "Behind":   "bg-red-100 text-red-800 border-red-300",
  "On Hold":  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Paid Off": "bg-slate-100 text-slate-500 border-slate-300",
};

// Returns true if a billing item with the given recurrence should appear on `day`
function occursOnDay(item, day) {
  if (!item.due_date || item.status === "Paid Off") return false;
  const anchor = parseISO(item.due_date);
  const recurrence = item.recurrence || "monthly";

  if (recurrence === "once") {
    return isSameDay(anchor, day);
  }
  if (recurrence === "monthly") {
    // Same day-of-month each month, on or after anchor month
    return anchor.getDate() === day.getDate() && day >= startOfMonth(anchor);
  }
  if (recurrence === "weekly") {
    // Same day-of-week, on or after anchor
    return day >= anchor && differenceInCalendarDays(day, anchor) % 7 === 0;
  }
  if (recurrence === "biweekly") {
    return day >= anchor && differenceInCalendarDays(day, anchor) % 14 === 0;
  }
  if (recurrence === "quarterly") {
    if (day < anchor) return false;
    // Same day-of-month, every 3 months
    const monthDiff = (day.getFullYear() - anchor.getFullYear()) * 12 + (day.getMonth() - anchor.getMonth());
    return anchor.getDate() === day.getDate() && monthDiff % 3 === 0;
  }
  if (recurrence === "annually") {
    if (day < anchor) return false;
    return anchor.getDate() === day.getDate() && anchor.getMonth() === day.getMonth();
  }
  return false;
}

const RECURRENCE_LABELS = {
  once: "One-time",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

export default function BillingCalendar({ items }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const today = new Date();

  const updateMutation = useMutation({
    mutationFn: ({ id, payment_log }) => base44.entities.BillingItem.update(id, { payment_log }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-items"] }),
  });

  const getItemsForDay = (day) => {
    if (!day) return [];
    return items.filter(i => occursOnDay(i, day));
  };

  const isPaidForDate = (item, dateStr) => {
    const log = item.payment_log || [];
    const entry = log.find(e => e.date === dateStr);
    return entry ? entry.paid : false;
  };

  const togglePaid = (item, dateStr) => {
    const log = [...(item.payment_log || [])];
    const idx = log.findIndex(e => e.date === dateStr);
    const currentPaid = idx >= 0 ? log[idx].paid : false;
    if (idx >= 0) {
      log[idx] = { ...log[idx], paid: !currentPaid };
    } else {
      log.push({ date: dateStr, paid: true });
    }
    updateMutation.mutate({ id: item.id, payment_log: log });
  };

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
          const dayStr = format(day, "yyyy-MM-dd");

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] rounded-lg border p-1.5 ${isToday ? "border-amber-400 bg-amber-50" : "border-slate-100 bg-white"}`}
            >
              <div className={`text-xs font-bold mb-1 ${isToday ? "text-amber-700" : "text-slate-600"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dueItems.map(item => {
                  const paid = isPaidForDate(item, dayStr);
                  return (
                    <div key={item.id} className="group">
                      <div
                        className={`text-xs px-1 py-0.5 rounded border truncate font-medium transition-all ${
                          paid
                            ? "bg-green-100 text-green-700 border-green-300 line-through opacity-60"
                            : STATUS_COLORS[item.status] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                        title={`${item.name} — ${RECURRENCE_LABELS[item.recurrence] || "Monthly"}${item.monthly_amount ? ` — $${item.monthly_amount}` : ""} — ${paid ? "PAID" : item.status}`}
                      >
                        {item.name}
                      </div>
                      {/* Paid/Not paid toggle */}
                      <button
                        onClick={() => togglePaid(item, dayStr)}
                        className={`w-full mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold rounded px-1 py-0.5 transition-all ${
                          paid
                            ? "bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600"
                            : "bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600"
                        }`}
                        title={paid ? "Mark as unpaid" : "Mark as paid"}
                      >
                        {paid
                          ? <><CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" /> Paid</>
                          : <><XCircle className="w-2.5 h-2.5 flex-shrink-0" /> Unpaid</>
                        }
                      </button>
                    </div>
                  );
                })}
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
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          <span className="text-xs text-slate-600">Paid this occurrence</span>
        </div>
      </div>
    </div>
  );
}