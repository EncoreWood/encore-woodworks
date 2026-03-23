import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, addDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, CheckCircle2 } from "lucide-react";

// Returns Monday of the week containing `date`
function getWeekMonday(date) {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

// Given a week_start (Monday) and a day name, return the actual date string
function getDateForDayName(weekStart, dayName) {
  const days = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };
  const offset = days[dayName] ?? 0;
  const base = new Date(weekStart + "T00:00:00");
  return format(addDays(base, offset), "MMM d");
}

export default function CleaningScheduleWidget({ showCheckboxes = false, compact = false }) {
  const queryClient = useQueryClient();
  const MST_TZ = "America/Denver";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: MST_TZ }));
  const weekMonday = getWeekMonday(now);

  const { data: schedules = [] } = useQuery({
    queryKey: ["cleaningSchedules"],
    queryFn: () => base44.entities.CleaningSchedule.list("-week_start", 10),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CleaningSchedule.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] }),
  });

  // Find this week's schedule
  const thisWeek = schedules.find(s => s.week_start === weekMonday);

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

  const day1People = thisWeek.day1_sub
    ? [...(thisWeek.permanent_pair || []).filter(n => n !== thisWeek.day1_sub_for), thisWeek.day1_sub]
    : (thisWeek.permanent_pair || []);

  const rotatingPair = thisWeek.rotating_person
    ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean)
    : [];
  const day2People = thisWeek.day2_sub
    ? [...rotatingPair.filter(n => n !== thisWeek.day2_sub_for), thisWeek.day2_sub]
    : rotatingPair;

  const allDone = thisWeek.completed_day1 && thisWeek.completed_day2;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {allDone && (
        <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> All cleaning done this week!
        </div>
      )}

      {/* Day 1 */}
      <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day1 ? "bg-green-50 border-green-200" : "bg-teal-50 border-teal-200"}`}>
        {showCheckboxes && (
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

      {/* Day 2 */}
      <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day2 ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"}`}>
        {showCheckboxes && (
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
    </div>
  );
}