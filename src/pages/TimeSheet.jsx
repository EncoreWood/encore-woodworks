import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, Plus, Trash2, Play, Square, Settings, Circle,
  Calendar, RefreshCw, Pencil, Briefcase, ArrowLeftRight,
  CheckCircle2, UtensilsCrossed, ChevronDown, ChevronRight, Timer
} from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import VacationRequestForm from "../components/team/VacationRequestForm";
import ClockInModal from "../components/timesheet/ClockInModal";
import TimeDataTab from "../components/timesheet/TimeDataTab";
import PayPeriodsView from "../components/timesheet/PayPeriodsView";
import { cn } from "@/lib/utils";

// ─── Live elapsed time hook ────────────────────────────────────────────────────
function useElapsedTime(clockInTime) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!clockInTime) { setElapsed("00:00:00"); return; }
    const tick = () => {
      const diff = Date.now() - clockInTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockInTime]);
  return elapsed;
}

function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  return ((outH * 60 + outM - inH * 60 - inM) / 60).toFixed(2);
}

// ─── Day Row (weekly log) ──────────────────────────────────────────────────────
const typeColors = {
  work: "bg-blue-100 text-blue-800",
  pto: "bg-yellow-100 text-yellow-800",
  vacation: "bg-purple-100 text-purple-800",
  sick: "bg-red-100 text-red-800"
};

function DayRow({ date, entries, isToday, isAdmin, onEdit, onDelete }) {
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
      <button
        onClick={() => hasEntries && setExpanded(e => !e)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          isToday ? "bg-amber-50 hover:bg-amber-100" : "bg-white hover:bg-slate-50",
          !hasEntries && "cursor-default"
        )}
      >
        <div className="w-5 flex-shrink-0 text-slate-400">
          {hasEntries ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : null}
        </div>
        <div className="w-28 flex-shrink-0">
          <p className={cn("text-sm font-semibold", isToday ? "text-amber-800" : "text-slate-800")}>
            {isToday ? "Today" : format(date, "EEE")}
          </p>
          <p className="text-xs text-slate-500">{format(date, "MMM d")}</p>
        </div>
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
        {totalHours > 0 && (
          <span className={cn("text-sm font-bold px-3 py-1 rounded-full flex-shrink-0",
            totalHours >= 8 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700")}>
            {totalHours.toFixed(2)} hrs
          </span>
        )}
        {!hasEntries && <span className="text-xs text-slate-400 flex-shrink-0">—</span>}
      </button>

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
                  {entry.notes?.includes("[−30 min lunch]") && (
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

// ─── Main ClockWidget (hero card for non-admin) ───────────────────────────────
function ClockWidget({ isClockedIn, elapsedTime, currentProjectName, todayHours, onClockIn, onClockOut, onSwitch, loading }) {
  return (
    <div className={cn(
      "rounded-3xl p-8 text-center transition-all shadow-xl",
      isClockedIn
        ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white"
        : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
    )}>
      {/* Status dot */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className={cn("w-3 h-3 rounded-full", isClockedIn ? "bg-green-200 animate-pulse" : "bg-slate-500")} />
        <span className="text-sm font-semibold uppercase tracking-widest opacity-80">
          {isClockedIn ? "Clocked In" : "Clocked Out"}
        </span>
      </div>

      {/* Big elapsed timer */}
      <div className="font-mono text-6xl font-bold tracking-tight mb-2 tabular-nums">
        {isClockedIn ? elapsedTime : "--:--:--"}
      </div>

      {/* Project name */}
      {isClockedIn && currentProjectName && (
        <div className="flex items-center justify-center gap-2 mb-5 opacity-90">
          <Briefcase className="w-4 h-4" />
          <span className="text-lg font-semibold">{currentProjectName}</span>
        </div>
      )}
      {isClockedIn && !currentProjectName && <div className="mb-5" />}
      {!isClockedIn && <div className="mb-5" />}

      {/* Today's hours pill */}
      {todayHours > 0 && (
        <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
          <Clock className="w-4 h-4" />
          {todayHours.toFixed(2)} hrs today
        </div>
      )}
      {todayHours === 0 && <div className="mb-6" />}

      {/* Buttons */}
      {isClockedIn ? (
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClockOut}
            disabled={loading}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <Square className="w-5 h-5" />
            Clock Out
          </button>
          <button
            onClick={onSwitch}
            disabled={loading}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-base px-6 py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
          >
            <ArrowLeftRight className="w-5 h-5" />
            Switch
          </button>
        </div>
      ) : (
        <button
          onClick={onClockIn}
          disabled={loading}
          className="flex items-center gap-3 mx-auto bg-white text-slate-900 font-bold text-xl px-12 py-5 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-green-50 disabled:opacity-60"
        >
          <Play className="w-6 h-6 text-green-600" />
          Clock In
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TimeSheet() {
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [clockInTime, setClockInTime] = useState(null); // ms timestamp
  const [openTimeEntryId, setOpenTimeEntryId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState(null);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  const [currentTab, setCurrentTab] = useState("timecard");
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ clock_in: "", clock_out: "", notes: "" });

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [formData, setFormData] = useState({ clock_in: "", clock_out: "", entry_type: "work", notes: "" });
  const [showAdminVacation, setShowAdminVacation] = useState(false);
  const [adminVacForm, setAdminVacForm] = useState({ employee_id: "", entry_type: "vacation", date: "", hours_worked: "8", notes: "" });

  const [settingsData, setSettingsData] = useState({
    hours_per_year: 160, accrual_rate: 0.0192,
    pay_period_start_day: 16, pay_period_end_day: 15,
    pay_period_days: 30, work_days: [1, 2, 3, 4],
    work_start_time: "07:00", work_end_time: "17:30", lunch_break_minutes: 30
  });

  const elapsedTime = useElapsedTime(clockInTime);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: () => base44.entities.TimeEntry.list(),
    refetchInterval: 30000
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.Settings.filter({ setting_type: "pto_calculation" })
  });

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.TimeEntry.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsub;
  }, [queryClient]);

  // ── Bootstrap current user + open entry ───────────────────────────────────
  useEffect(() => {
    if (!employees.length) return;
    const init = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const emp = employees.find(e => e.user_email === user?.email || e.email === user?.email);
      if (emp) {
        setSelectedEmployee(emp);
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const entries = await base44.entities.TimeEntry.filter({ employee_id: emp.id });
        const open = entries.find(e => e.date === todayStr && e.clock_in && !e.clock_out);
        if (open) {
          setOpenTimeEntryId(open.id);
          setCurrentProjectName(open.project_name || null);
          const [h, m] = open.clock_in.split(":").map(Number);
          const t = new Date(); t.setHours(h, m, 0, 0);
          setClockInTime(t.getTime());
        }
      }
    };
    init();
  }, [employees]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      setShowAddEntry(false);
      setFormData({ clock_in: "", clock_out: "", entry_type: "work", notes: "" });
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeEntries"] })
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timeEntries"] }); setEditingEntry(null); }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => settings[0]
      ? base44.entities.Settings.update(settings[0].id, data)
      : base44.entities.Settings.create({ setting_type: "pto_calculation", ...data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] })
  });

  // ── Clock actions ──────────────────────────────────────────────────────────
  const doClockIn = async ({ project_id, project_name }) => {
    if (!selectedEmployee) return;
    setClockLoading(true);
    const now = new Date();
    const entry = await base44.entities.TimeEntry.create({
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      date: format(now, "yyyy-MM-dd"),
      clock_in: format(now, "HH:mm"),
      entry_type: "work",
      project_id: project_id || null,
      project_name: project_name || null,
      notes: ""
    });
    setOpenTimeEntryId(entry.id);
    setClockInTime(now.getTime());
    setCurrentProjectName(project_name || null);
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    setClockLoading(false);
  };

  const handleClockOut = async () => {
    if (!clockInTime || !openTimeEntryId) return;
    setClockLoading(true);
    const now = new Date();
    const clockOutStr = format(now, "HH:mm");
    const clockInStr = format(new Date(clockInTime), "HH:mm");
    const hours = calculateHours(clockInStr, clockOutStr);
    await base44.entities.TimeEntry.update(openTimeEntryId, {
      clock_out: clockOutStr,
      hours_worked: parseFloat(hours)
    });
    setClockInTime(null);
    setOpenTimeEntryId(null);
    setCurrentProjectName(null);
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    setClockLoading(false);
  };

  const handleSwitchProject = async ({ project_id, project_name }) => {
    if (clockInTime && openTimeEntryId) {
      const now = new Date();
      const clockOutStr = format(now, "HH:mm");
      const clockInStr = format(new Date(clockInTime), "HH:mm");
      const hours = calculateHours(clockInStr, clockOutStr);
      await base44.entities.TimeEntry.update(openTimeEntryId, {
        clock_out: clockOutStr,
        hours_worked: parseFloat(hours)
      });
    }
    await doClockIn({ project_id, project_name });
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const employeeEntries = selectedEmployee ? timeEntries.filter(e => e.employee_id === selectedEmployee.id) : [];
  const todayCompletedHours = employeeEntries.filter(e => e.date === todayStr && e.entry_type === "work" && e.clock_out)
    .reduce((s, e) => s + (e.hours_worked || 0), 0);

  const today = new Date();
  const baseDate = addWeeks(today, weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekTotal = employeeEntries.filter(e =>
    e.entry_type === "work" &&
    e.date >= format(weekStart, "yyyy-MM-dd") &&
    e.date <= format(weekEnd, "yyyy-MM-dd")
  ).reduce((s, e) => s + (e.hours_worked || 0), 0);

  // Pay period helpers
  const getPayPeriodDates = () => {
    const startDay = settings[0]?.pay_period_start_day || 16;
    const endDay = settings[0]?.pay_period_end_day || 15;
    const date = today;
    const currentDay = date.getDate();
    let periodStart, periodEnd;
    if (currentDay >= startDay) {
      periodStart = new Date(date.getFullYear(), date.getMonth(), startDay);
      periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, endDay);
    } else {
      periodStart = new Date(date.getFullYear(), date.getMonth() - 1, startDay);
      periodEnd = new Date(date.getFullYear(), date.getMonth(), endDay);
    }
    return { periodStart, periodEnd };
  };

  const { periodStart, periodEnd } = getPayPeriodDates();

  const getEmployeeHoursForPeriod = (employeeId) => {
    const { periodStart, periodEnd } = getPayPeriodDates();
    const entries = timeEntries.filter(e =>
      e.employee_id === employeeId &&
      isWithinInterval(new Date(e.date), { start: periodStart, end: periodEnd }) &&
      e.entry_type === "work"
    );
    let totalHours = 0, regularHours = 0, overtimeHours = 0;
    const weeklyHours = {};
    entries.forEach(entry => {
      const weekNum = Math.floor((new Date(entry.date) - periodStart) / (1000 * 60 * 60 * 24 * 7));
      if (!weeklyHours[weekNum]) weeklyHours[weekNum] = 0;
      weeklyHours[weekNum] += entry.hours_worked || 0;
      totalHours += entry.hours_worked || 0;
    });
    Object.values(weeklyHours).forEach(weekly => {
      if (weekly > 40) { regularHours += 40; overtimeHours += weekly - 40; }
      else regularHours += weekly;
    });
    return { totalHours, regularHours, overtimeHours };
  };

  const getClockedInEmployees = () => {
    const todayEntries = timeEntries.filter(e => e.date === todayStr && e.entry_type === "work");
    return employees.map(emp => {
      const entry = todayEntries.find(e => e.employee_id === emp.id);
      return { employee: emp, isClockedIn: entry && !entry.clock_out, clockInTime: entry?.clock_in || null };
    });
  };

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({ clock_in: entry.clock_in || "", clock_out: entry.clock_out || "", notes: entry.notes || "" });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const hoursWorked = editForm.clock_in && editForm.clock_out
      ? parseFloat(calculateHours(editForm.clock_in, editForm.clock_out))
      : editingEntry.hours_worked;
    updateEntryMutation.mutate({ id: editingEntry.id, data: { clock_in: editForm.clock_in || null, clock_out: editForm.clock_out || null, notes: editForm.notes, hours_worked: hoursWorked } });
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Time Sheet</h1>
            {selectedEmployee && (
              <p className="text-sm text-slate-500">{selectedEmployee.full_name} · {format(today, "EEEE, MMMM d")}</p>
            )}
          </div>
          {isAdmin && (
            <Select
              value={selectedEmployee?.id || ""}
              onValueChange={v => setSelectedEmployee(employees.find(e => e.id === v) || null)}
            >
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Employee..." /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className={`grid w-full ${isAdmin ? "grid-cols-5" : "grid-cols-2"}`}>
            {isAdmin && <TabsTrigger value="overview">Team</TabsTrigger>}
            <TabsTrigger value="timecard">Time Card</TabsTrigger>
            <TabsTrigger value="vacation">Vacation</TabsTrigger>
            {isAdmin && <TabsTrigger value="data">Data</TabsTrigger>}
            {isAdmin && <TabsTrigger value="settings"><Settings className="w-3.5 h-3.5" /></TabsTrigger>}
          </TabsList>

          {/* ── TIME CARD TAB ── */}
          <TabsContent value="timecard" className="space-y-5 mt-5">
            {selectedEmployee ? (
              <>
                {/* Hero clock widget */}
                <ClockWidget
                  isClockedIn={!!clockInTime}
                  elapsedTime={elapsedTime}
                  currentProjectName={currentProjectName}
                  todayHours={todayCompletedHours}
                  onClockIn={() => setShowClockInModal(true)}
                  onClockOut={handleClockOut}
                  onSwitch={() => setShowSwitchModal(true)}
                  loading={clockLoading}
                />

                {/* Week nav + log */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
                        <span className="text-sm font-semibold text-slate-700 min-w-[90px] text-center">
                          {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : format(weekStart, "MMM d") + "–" + format(weekEnd, "MMM d")}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>Next →</Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold px-3 py-1 rounded-full",
                          weekTotal > 40 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700")}>
                          {weekTotal.toFixed(2)} hrs {weekTotal > 40 ? `(+${(weekTotal-40).toFixed(2)} OT)` : ""}
                        </span>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => setShowAddEntry(true)} className="gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {weekDays.map(day => {
                        const ds = format(day, "yyyy-MM-dd");
                        return (
                          <DayRow
                            key={ds}
                            date={day}
                            entries={employeeEntries.filter(e => e.date === ds)}
                            isToday={ds === todayStr}
                            isAdmin={isAdmin}
                            onEdit={handleOpenEdit}
                            onDelete={(id) => deleteEntryMutation.mutate(id)}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Pay periods view */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Pay Periods</CardTitle></CardHeader>
                  <CardContent>
                    <PayPeriodsView employeeEntries={employeeEntries} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Loading your time card...</p>
              </div>
            )}
          </TabsContent>

          {/* ── TEAM OVERVIEW TAB (admin) ── */}
          {isAdmin && (
            <TabsContent value="overview" className="space-y-5 mt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Pay Period: {format(periodStart, "MMM d")} – {format(periodEnd, "MMM d, yyyy")}
                </h2>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Circle className="w-3.5 h-3.5 fill-green-500 text-green-500" /> Currently Clocked In
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getClockedInEmployees().filter(e => e.isClockedIn).length > 0 ? (
                    getClockedInEmployees().filter(e => e.isClockedIn).map(e => (
                      <div key={e.employee.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-900">{e.employee.full_name}</p>
                          <p className="text-sm text-slate-600">Since {e.clockInTime}</p>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">No one clocked in right now</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">Hours This Period</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="text-left py-2 px-2 font-semibold">Employee</th>
                          <th className="text-center py-2 px-2 font-semibold">Regular</th>
                          <th className="text-center py-2 px-2 font-semibold text-orange-600">OT</th>
                          <th className="text-center py-2 px-2 font-semibold">Total</th>
                          <th className="text-center py-2 px-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => {
                          const hrs = getEmployeeHoursForPeriod(emp.id);
                          const ci = getClockedInEmployees().find(e => e.employee.id === emp.id);
                          return (
                            <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2.5 px-2 font-medium text-slate-900">{emp.full_name}</td>
                              <td className="text-center py-2.5 px-2 text-slate-700">{hrs.regularHours.toFixed(1)}</td>
                              <td className="text-center py-2.5 px-2 text-orange-600 font-semibold">{hrs.overtimeHours.toFixed(1)}</td>
                              <td className="text-center py-2.5 px-2 font-bold text-slate-900">{hrs.totalHours.toFixed(1)}</td>
                              <td className="text-center py-2.5 px-2">
                                {ci?.isClockedIn ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                    <Circle className="w-2 h-2 fill-green-600" /> In
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">Out</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── VACATION TAB ── */}
          <TabsContent value="vacation" className="space-y-5 mt-5">
            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={() => setShowAdminVacation(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
                  <Plus className="w-4 h-4" /> Add PTO/Vacation for Employee
                </Button>
              </div>
            )}
            {selectedEmployee ? (
              <VacationRequestForm employee={selectedEmployee} currentUser={currentUser} />
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Loading your profile...</p>
              </div>
            )}
            {isAdmin && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm">View by Employee</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {employees.map(emp => (
                    <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selectedEmployee?.id === emp.id ? "bg-amber-50 border-amber-300 font-semibold text-amber-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                      {emp.full_name}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── DATA TAB (admin) ── */}
          {isAdmin && (
            <TabsContent value="data" className="mt-5">
              <TimeDataTab timeEntries={timeEntries} employees={employees} projects={projects} />
            </TabsContent>
          )}

          {/* ── SETTINGS TAB (admin) ── */}
          {isAdmin && (
            <TabsContent value="settings" className="mt-5 space-y-5">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>Pay Period</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Start Day</label>
                    <Input type="number" min="1" max="31" value={settingsData.pay_period_start_day}
                      onChange={e => setSettingsData(s => ({ ...s, pay_period_start_day: parseInt(e.target.value) }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">End Day</label>
                    <Input type="number" min="1" max="31" value={settingsData.pay_period_end_day}
                      onChange={e => setSettingsData(s => ({ ...s, pay_period_end_day: parseInt(e.target.value) }))} className="mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>Lunch Deduction</CardTitle></CardHeader>
                <CardContent>
                  <label className="text-sm font-medium text-slate-700">Auto-deduct after (minutes)</label>
                  <Input type="number" min="0" value={settingsData.lunch_break_minutes}
                    onChange={e => setSettingsData(s => ({ ...s, lunch_break_minutes: parseInt(e.target.value) }))} className="mt-1 w-32" />
                  <p className="text-xs text-slate-500 mt-1">Deducted automatically when total day ≥ 5 hours.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>PTO Accrual</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Total PTO Hours / Year</label>
                    <Input type="number" value={settingsData.hours_per_year}
                      onChange={e => setSettingsData(s => ({ ...s, hours_per_year: parseFloat(e.target.value) }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Accrual Rate (hrs per hr worked)</label>
                    <Input type="number" step="0.001" value={settingsData.accrual_rate}
                      onChange={e => setSettingsData(s => ({ ...s, accrual_rate: parseFloat(e.target.value) }))} className="mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={() => updateSettingsMutation.mutate(settingsData)} className="w-full bg-amber-600 hover:bg-amber-700" size="lg">
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ── Modals ── */}
      <ClockInModal open={showClockInModal} onOpenChange={setShowClockInModal} projects={projects}
        onConfirm={doClockIn} title="Clock In" confirmLabel="Clock In" confirmClass="bg-green-600 hover:bg-green-700" />

      <ClockInModal open={showSwitchModal} onOpenChange={setShowSwitchModal} projects={projects}
        onConfirm={handleSwitchProject} title="Switch Job" confirmLabel="Switch" confirmClass="bg-amber-600 hover:bg-amber-700" />

      <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editingEntry && <p className="text-sm text-slate-500">{editingEntry.employee_name} · {editingEntry.date}</p>}
            <div>
              <label className="text-sm font-medium text-slate-700">Clock In</label>
              <Input type="time" value={editForm.clock_in} onChange={e => setEditForm(p => ({ ...p, clock_in: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Clock Out</label>
              <Input type="time" value={editForm.clock_out} onChange={e => setEditForm(p => ({ ...p, clock_out: e.target.value }))} className="mt-1" />
            </div>
            {editForm.clock_in && editForm.clock_out && (
              <p className="text-sm text-slate-500">Hours: {calculateHours(editForm.clock_in, editForm.clock_out)}</p>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} className="bg-amber-600 hover:bg-amber-700" disabled={updateEntryMutation.isPending}>
                {updateEntryMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminVacation} onOpenChange={setShowAdminVacation}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vacation / PTO for Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Employee</label>
              <Select value={adminVacForm.employee_id} onValueChange={v => setAdminVacForm(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <Select value={adminVacForm.entry_type} onValueChange={v => setAdminVacForm(p => ({ ...p, entry_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="pto">PTO</SelectItem>
                  <SelectItem value="sick">Sick Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Date</label>
              <Input type="date" className="mt-1" value={adminVacForm.date} onChange={e => setAdminVacForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Hours</label>
              <Input type="number" min="1" max="24" step="0.5" className="mt-1" value={adminVacForm.hours_worked} onChange={e => setAdminVacForm(p => ({ ...p, hours_worked: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input className="mt-1" value={adminVacForm.notes} onChange={e => setAdminVacForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdminVacation(false)}>Cancel</Button>
              <Button
                disabled={!adminVacForm.employee_id || !adminVacForm.date}
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  const emp = employees.find(e => e.id === adminVacForm.employee_id);
                  if (!emp) return;
                  createEntryMutation.mutate({
                    employee_id: emp.id, employee_name: emp.full_name,
                    date: adminVacForm.date, entry_type: adminVacForm.entry_type,
                    hours_worked: parseFloat(adminVacForm.hours_worked) || 8,
                    notes: adminVacForm.notes || "Added by admin", approved: true
                  });
                  setShowAdminVacation(false);
                  setAdminVacForm({ employee_id: "", entry_type: "vacation", date: "", hours_worked: "8", notes: "" });
                }}
              >Add Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Time Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <Select value={formData.entry_type} onValueChange={v => setFormData(d => ({ ...d, entry_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="pto">PTO</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.entry_type === "work" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Clock In</label>
                  <Input type="time" value={formData.clock_in} onChange={e => setFormData(d => ({ ...d, clock_in: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Clock Out</label>
                  <Input type="time" value={formData.clock_out} onChange={e => setFormData(d => ({ ...d, clock_out: e.target.value }))} className="mt-1" />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input placeholder="Notes..." value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => {
                if (!selectedEmployee) return;
                const hours = formData.entry_type === "work" ? calculateHours(formData.clock_in, formData.clock_out) : null;
                createEntryMutation.mutate({
                  employee_id: selectedEmployee.id, employee_name: selectedEmployee.full_name,
                  date: format(today, "yyyy-MM-dd"), clock_in: formData.clock_in || null,
                  clock_out: formData.clock_out || null, hours_worked: hours ? parseFloat(hours) : null,
                  entry_type: formData.entry_type, notes: formData.notes
                });
              }}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}