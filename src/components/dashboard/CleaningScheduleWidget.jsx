import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { getWeekMonday, getDateForDayName, getRotationPool, computeRotatingPair } from "./cleaningRotation";

export default function CleaningScheduleWidget({ showCheckboxes = false, compact = false, todayOnly = false }) {
  const queryClient = useQueryClient();
  const MST_TZ = "America/Denver";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: MST_TZ }));
  const weekMonday = getWeekMonday(now);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const archivedNames = new Set(employees.filter(e => e.archived).map(e => e.full_name));

  const { data: schedules = [] } = useQuery({
    queryKey: ["cleaningSchedules"],
    queryFn: () => base44.entities.CleaningSchedule.list("-week_start", 20),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CleaningSchedule.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] }),
  });

  const pool = getRotationPool(schedules, archivedNames);

  // Find this week's schedule (exact match first)
  let thisWeek = schedules.find(s => s.week_start === weekMonday);

  // If no exact match, project from the last stored schedule
  if (!thisWeek && schedules.length > 0) {
    const sorted = [...schedules].filter(s => s.week_start).sort((a, b) => a.week_start.localeCompare(b.week_start));
    const lastCs = sorted[sorted.length - 1];
    if (lastCs) {
      thisWeek = {
        id: null,
        week_start: weekMonday,
        permanent_pair: lastCs.permanent_pair || [],
        day1_of_week: lastCs.day1_of_week || "Monday",
        day2_of_week: lastCs.day2_of_week || "Wednesday",
        notes: lastCs.notes,
        completed_day1: false,
        completed_day2: false,
      };
    }
  }

  if (!thisWeek) {
    return (
      <div className={`${compact ? "text-xs text-slate-400 italic" : "text-sm text-slate-400 text-center py-3 italic"}`}>
        No cleaning schedule for this week.
      </div>
    );
  }

  const day1Label = thisWeek.day1_of_week || "Day 1";
  const day2Label = thisWeek.day2_of_week || "Day 2";
  const day1Date = getDateForDayName(thisWeek.week_start, thisWeek.day1_of_week);
  const day2Date = getDateForDayName(thisWeek.week_start, thisWeek.day2_of_week);

  const day1People = (thisWeek.day1_sub
    ? [...(thisWeek.permanent_pair || []).filter(n => n !== thisWeek.day1_sub_for), thisWeek.day1_sub]
    : (thisWeek.permanent_pair || [])
  ).filter(n => !archivedNames.has(n));

  const computedPair = computeRotatingPair(schedules, weekMonday, pool, archivedNames);
  const day2People = (thisWeek.day2_sub
    ? [...computedPair.filter(n => n !== thisWeek.day2_sub_for), thisWeek.day2_sub]
    : computedPair
  ).filter(n => !archivedNames.has(n));

  const allDone = thisWeek.completed_day1 && thisWeek.completed_day2;

  const todayName = format(now, "EEEE");
  const day1IsToday = todayOnly && (thisWeek.day1_of_week === todayName);
  const day2IsToday = todayOnly && (thisWeek.day2_of_week === todayName);
  if (todayOnly && !day1IsToday && !day2IsToday) {
    return (
      <div className={`${compact ? "text-xs text-slate-400 italic" : "text-sm text-slate-400 text-center py-3 italic"}`}>
        No cleaning scheduled for today.
      </div>
    );
  }

  const showDay1 = !todayOnly || day1IsToday;
  const showDay2 = !todayOnly || day2IsToday;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {allDone && (!todayOnly || showDay1 || showDay2) && (
        <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> All cleaning done this week!
        </div>
      )}

      {showDay1 && (
        <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day1 ? "bg-green-50 border-green-200" : "bg-teal-50 border-teal-200"}`}>
          {showCheckboxes && thisWeek.id && (
            <Checkbox
              checked={!!thisWeek.completed_day1}
              onCheckedChange={(v) => updateMutation.mutate({ id: thisWeek.id, data: { completed_day1: !!v } })}
              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${thisWeek.completed_day1 ? "text-green-700" : "text-teal-700"}`}>
              {day1Label} ({day1Date})
            </p>
            <p className={`text-sm font-medium ${thisWeek.completed_day1 ? "text-green-800 line-through opacity-60" : "text-slate-800"}`}>
              {day1People.join(" · ") || "—"}
            </p>
          </div>
          {thisWeek.completed_day1 && !showCheckboxes && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
        </div>
      )}

      {showDay2 && (
        <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day2 ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"}`}>
          {showCheckboxes && thisWeek.id && (
            <Checkbox
              checked={!!thisWeek.completed_day2}
              onCheckedChange={(v) => updateMutation.mutate({ id: thisWeek.id, data: { completed_day2: !!v } })}
              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${thisWeek.completed_day2 ? "text-green-700" : "text-purple-700"}`}>
              {day2Label} ({day2Date})
            </p>
            <p className={`text-sm font-medium ${thisWeek.completed_day2 ? "text-green-800 line-through opacity-60" : "text-slate-800"}`}>
              {day2People.join(" · ") || "—"}
            </p>
          </div>
          {thisWeek.completed_day2 && !showCheckboxes && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
        </div>
      )}
    </div>
  );
}