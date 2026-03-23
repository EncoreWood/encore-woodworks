import { useState } from "react";
import { Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, addDays, subMonths } from "date-fns";

function ProgressBar({ value, goal, label }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-yellow-400" : "bg-red-400";
  const textColor = pct >= 100 ? "text-emerald-700" : pct >= 70 ? "text-yellow-600" : "text-red-500";

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-4xl font-bold text-slate-800 mb-1">{value}</p>
      {goal > 0 && (
        <>
          <p className={`text-xs font-semibold mb-2 ${textColor}`}>{value} / {goal} pts</p>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

function WeeklyBarChart({ weekDayPts, goals }) {
  const dayGoal = goals.day || 0;
  const maxVal = Math.max(...weekDayPts.map(d => d.pts), dayGoal, 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">This Week (Daily PTS)</p>
      <div className="flex items-end gap-2 h-20">
        {weekDayPts.map(({ day, pts, isToday }, idx) => {
          const heightPct = maxVal > 0 ? (pts / maxVal) * 100 : 0;
          const atGoal = dayGoal > 0 && pts >= dayGoal;
          const close = dayGoal > 0 && pts >= dayGoal * 0.7 && pts < dayGoal;
          const barColor = atGoal ? "bg-emerald-500" : close ? "bg-yellow-400" : pts > 0 ? "bg-red-400" : "bg-slate-200";
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              {pts > 0 && <span className="text-xs font-bold text-slate-600">{pts}</span>}
              <div className="w-full flex items-end" style={{ height: "52px" }}>
                <div
                  className={`w-full rounded-t transition-all duration-500 ${barColor} ${isToday ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                  style={{ height: `${Math.max(heightPct, pts > 0 ? 8 : 0)}%` }}
                />
              </div>
              {/* Goal line indicator */}
              <p className={`text-xs ${isToday ? "font-bold text-slate-700" : "text-slate-400"}`}>{days[idx]}</p>
            </div>
          );
        })}
      </div>
      {dayGoal > 0 && (
        <p className="text-xs text-slate-400 mt-1 text-right">Daily goal: {dayGoal} pts</p>
      )}
    </div>
  );
}

export default function PtsOverviewCard({ dayPts, weekPts, monthPts, quarterlyPts, productionItems, dashboardSettings, currentUser, onSettingsUpdated }) {
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const goalSetting = dashboardSettings?.find(s => s.section === "pts_goals");
  let goals = { day: 0, week: 0, month: 0, quarterly: 0 };
  if (goalSetting?.value) {
    try { goals = { ...goals, ...JSON.parse(goalSetting.value) }; } catch (_) {}
  }

  const [draftGoals, setDraftGoals] = useState({ day: goals.day, week: goals.week, month: goals.month, quarterly: goals.quarterly });

  const handleSaveGoals = async () => {
    setSaving(true);
    if (goalSetting) {
      await base44.entities.DashboardSettings.update(goalSetting.id, { value: JSON.stringify(draftGoals) });
    } else {
      await base44.entities.DashboardSettings.create({ section: "pts_goals", value: JSON.stringify(draftGoals), visible_to_admins: true, visible_to_users: true });
    }
    setSaving(false);
    setShowGoalSettings(false);
    onSettingsUpdated?.();
  };

  // Weekly trend: Mon–Sun of current week
  const MST_TZ = "America/Denver";
  const nowUtc = new Date();
  const now = new Date(nowUtc.toLocaleString("en-US", { timeZone: MST_TZ }));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const todayStr = format(now, "yyyy-MM-dd");

  const completedItems = (productionItems || []).filter(i => i.stage === "complete");

  const weekDayPts = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const pts = completedItems
      .filter(item => item.completed_date === dateStr)
      .reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);
    return { day: format(d, "EEE"), pts, isToday: dateStr === todayStr };
  });

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">PTS Overview</h3>
        {currentUser?.role === "admin" && (
          <button
            onClick={() => { setDraftGoals({ day: goals.day, week: goals.week, month: goals.month }); setShowGoalSettings(v => !v); }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded"
            title="Set Goals"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Goal settings panel */}
      {showGoalSettings && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <p className="text-xs font-bold text-slate-600">Set PTS Goals</p>
          <div className="grid grid-cols-4 gap-2">
            {["day", "week", "month", "quarterly"].map(period => (
              <div key={period}>
                <label className="text-xs text-slate-500 capitalize mb-1 block">{period}</label>
                <Input
                  type="number"
                  min="0"
                  value={draftGoals[period] || ""}
                  onChange={e => setDraftGoals(prev => ({ ...prev, [period]: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowGoalSettings(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleSaveGoals} disabled={saving}>
              {saving ? "Saving..." : <><Check className="w-3 h-3 mr-1" />Save Goals</>}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Day", value: dayPts, goal: goals.day },
          { label: "Week", value: weekPts, goal: goals.week },
          { label: "Month", value: monthPts, goal: goals.month },
        ].map(({ label, value, goal }) => (
          <div key={label} className="bg-slate-50 rounded-xl py-5 px-3">
            <ProgressBar label={label} value={value} goal={goal} />
          </div>
        ))}
      </div>

      <WeeklyBarChart weekDayPts={weekDayPts} goals={goals} />
    </div>
  );
}