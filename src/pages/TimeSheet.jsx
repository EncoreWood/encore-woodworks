import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Trash2, CheckCircle2, Play, Square, Settings, Circle, Calendar, RefreshCw, Pencil, UtensilsCrossed, Timer, Briefcase } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import VacationRequestForm from "../components/team/VacationRequestForm";
import ClockInModal from "../components/timesheet/ClockInModal";
import TimeDataTab from "../components/timesheet/TimeDataTab";

export default function TimeSheet() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    clock_in: "",
    clock_out: "",
    entry_type: "work",
    notes: ""
  });
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [openTimeEntryId, setOpenTimeEntryId] = useState(null);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ clock_in: "", clock_out: "", notes: "" });
  const [settingsData, setSettingsData] = useState({
    hours_per_year: 160,
    accrual_rate: 0.0192,
    pay_period_start_day: 16,
    pay_period_end_day: 15,
    pay_period_days: 30,
    work_days: [1, 2, 3, 4],
    work_start_time: "07:00",
    work_end_time: "17:30",
    lunch_break_minutes: 30
  });

  const queryClient = useQueryClient();

  // Live updates for time entries
  useEffect(() => {
    const unsub = base44.entities.TimeEntry.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsub;
  }, [queryClient]);

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

  const approveEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeEntries"] })
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timeEntries"] }); setEditingEntry(null); }
  });

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({ clock_in: entry.clock_in || "", clock_out: entry.clock_out || "", notes: entry.notes || "" });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const hoursWorked = editForm.clock_in && editForm.clock_out ? parseFloat(calculateHours(editForm.clock_in, editForm.clock_out)) : editingEntry.hours_worked;
    updateEntryMutation.mutate({ id: editingEntry.id, data: { clock_in: editForm.clock_in || null, clock_out: editForm.clock_out || null, notes: editForm.notes, hours_worked: hoursWorked } });
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settings[0]) {
        return base44.entities.Settings.update(settings[0].id, data);
      } else {
        return base44.entities.Settings.create({
          setting_type: "pto_calculation",
          ...data
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] })
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const emp = employees.find(e => e.user_email === user?.email || e.email === user?.email);
      if (emp) {
        setSelectedEmployee(emp);
        // Check for open time entry today
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todayEntries = await base44.entities.TimeEntry.filter({ employee_id: emp.id });
        const openEntry = todayEntries.find(e => e.date === todayStr && e.clock_in && !e.clock_out);
        if (openEntry) {
            setOpenTimeEntryId(openEntry.id);
            setCurrentProjectName(openEntry.project_name || null);
            const [h, m] = openEntry.clock_in.split(":").map(Number);
            const reconstructed = new Date();
            reconstructed.setHours(h, m, 0, 0);
            setClockInTime(reconstructed);
          }
      }
    };
    if (employees.length > 0) fetchCurrentUser();
  }, [employees]);

  useEffect(() => {
    if (!clockInTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = now - clockInTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  const calculateHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return 0;
    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    return ((outMinutes - inMinutes) / 60).toFixed(2);
  };

  const doClockIn = async ({ project_id, project_name }) => {
    if (!selectedEmployee) return;
    const now = new Date();
    const clockInStr = format(now, "HH:mm");
    const entry = await base44.entities.TimeEntry.create({
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      date: format(now, "yyyy-MM-dd"),
      clock_in: clockInStr,
      entry_type: "work",
      project_id: project_id || null,
      project_name: project_name || null,
      notes: ""
    });
    setOpenTimeEntryId(entry.id);
    setClockInTime(now);
    setCurrentProjectName(project_name || null);
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
  };

  const handleClockIn = () => setShowClockInModal(true);

  const handleSwitchProject = async ({ project_id, project_name }) => {
    // Clock out current entry
    if (clockInTime && openTimeEntryId) {
      const now = new Date();
      const clockOutStr = format(now, "HH:mm");
      const clockInStr = format(clockInTime, "HH:mm");
      const hours = calculateHours(clockInStr, clockOutStr);
      await base44.entities.TimeEntry.update(openTimeEntryId, {
        clock_out: clockOutStr,
        hours_worked: parseFloat(hours)
      });
    }
    // Clock into new project
    await doClockIn({ project_id, project_name });
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
  };

  const handleClockOut = async () => {
    if (!clockInTime || !openTimeEntryId) return;
    const now = new Date();
    const clockOutStr = format(now, "HH:mm");
    const clockInStr = format(clockInTime, "HH:mm");
    const hours = calculateHours(clockInStr, clockOutStr);

    await base44.entities.TimeEntry.update(openTimeEntryId, {
      clock_out: clockOutStr,
      hours_worked: parseFloat(hours)
    });

    setClockInTime(null);
    setElapsedTime("00:00:00");
    setOpenTimeEntryId(null);
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
  };

  const handleForgotLunch = async () => {
    if (!selectedEmployee) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    // Find the most recent completed entry for today and subtract 30 min
    const todayEntries = timeEntries.filter(e => e.employee_id === selectedEmployee.id && e.date === todayStr && e.entry_type === "work" && e.clock_out);
    if (todayEntries.length === 0) return;
    const latest = todayEntries.sort((a, b) => (b.clock_out || "").localeCompare(a.clock_out || ""))[0];
    const newHours = Math.max(0, (latest.hours_worked || 0) - 0.5);
    await base44.entities.TimeEntry.update(latest.id, {
      hours_worked: parseFloat(newHours.toFixed(2)),
      notes: (latest.notes ? latest.notes + " " : "") + "[−30 min lunch]"
    });
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
  };

  const handleAddEntry = () => {
    if (!selectedEmployee || !formData.entry_type) return;
    
    const hoursWorked = formData.entry_type === "work" ? calculateHours(formData.clock_in, formData.clock_out) : null;
    
    createEntryMutation.mutate({
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      date: format(selectedDate, "yyyy-MM-dd"),
      clock_in: formData.clock_in || null,
      clock_out: formData.clock_out || null,
      hours_worked: hoursWorked,
      entry_type: formData.entry_type,
      notes: formData.notes
    });
  };

  const typeColors = {
    work: "bg-blue-100 text-blue-800",
    pto: "bg-yellow-100 text-yellow-800",
    vacation: "bg-purple-100 text-purple-800",
    sick: "bg-red-100 text-red-800"
  };

  const getPayPeriodDates = () => {
    const startDay = settings[0]?.pay_period_start_day || 16;
    const endDay = settings[0]?.pay_period_end_day || 15;
    const date = selectedDate;
    const currentDay = date.getDate();
    
    let periodStart, periodEnd;
    
    if (currentDay >= startDay) {
      // Pay period started this month
      periodStart = new Date(date.getFullYear(), date.getMonth(), startDay);
      periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, endDay);
    } else {
      // Pay period started last month
      periodStart = new Date(date.getFullYear(), date.getMonth() - 1, startDay);
      periodEnd = new Date(date.getFullYear(), date.getMonth(), endDay);
    }
    
    return { periodStart, periodEnd };
  };

  const getEmployeeHoursForPeriod = (employeeId) => {
    const { periodStart, periodEnd } = getPayPeriodDates();
    const entries = timeEntries.filter(
      (e) =>
        e.employee_id === employeeId &&
        isWithinInterval(new Date(e.date), { start: periodStart, end: periodEnd }) &&
        e.entry_type === "work"
    );

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    const weeklyHours = {};

    entries.forEach((entry) => {
      const weekNum = Math.floor(
        (new Date(entry.date) - periodStart) / (1000 * 60 * 60 * 24 * 7)
      );
      if (!weeklyHours[weekNum]) weeklyHours[weekNum] = 0;
      weeklyHours[weekNum] += entry.hours_worked || 0;
      totalHours += entry.hours_worked || 0;
    });

    Object.values(weeklyHours).forEach((weekly) => {
      if (weekly > 40) {
        regularHours += 40;
        overtimeHours += weekly - 40;
      } else {
        regularHours += weekly;
      }
    });

    return { totalHours, regularHours, overtimeHours };
  };

  const getClockedInEmployees = () => {
    const currentTime = new Date();
    const todayStr = format(currentTime, "yyyy-MM-dd");
    const todayEntries = timeEntries.filter((e) => e.date === todayStr && e.entry_type === "work");
    return employees.map((emp) => {
      const todayEntry = todayEntries.find((e) => e.employee_id === emp.id);
      const isClockedIn = todayEntry && !todayEntry.clock_out;
      return {
        employee: emp,
        isClockedIn,
        clockInTime: todayEntry?.clock_in || null
      };
    });
  };

  const employeeEntries = selectedEmployee
    ? timeEntries.filter(e => e.employee_id === selectedEmployee.id)
    : [];

  const { periodStart, periodEnd } = getPayPeriodDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Time Sheet</h1>
          <p className="text-slate-600">Track working hours, PTO, and vacation days</p>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-8">
          <TabsList className={`grid w-full ${currentUser?.role === "admin" ? "grid-cols-5" : "grid-cols-3"}`}>
            {currentUser?.role === "admin" && (
              <TabsTrigger value="overview">Overview</TabsTrigger>
            )}
            <TabsTrigger value="employee">Time Card</TabsTrigger>
            <TabsTrigger value="vacation">Vacation</TabsTrigger>
            {currentUser?.role === "admin" && (
              <TabsTrigger value="data">Data</TabsTrigger>
            )}
            {currentUser?.role === "admin" && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* OVERVIEW TAB - ADMIN ONLY */}
          {currentUser?.role === "admin" && (
            <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Pay Period: {format(periodStart, "MMM d")} - {format(periodEnd, "MMM d, yyyy")}
              </h2>
            </div>

            {/* Currently Clocked In */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Circle className="w-4 h-4 fill-green-500 text-green-500" />
                  Currently Clocked In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getClockedInEmployees()
                    .filter((e) => e.isClockedIn)
                    .length > 0 ? (
                    getClockedInEmployees()
                      .filter((e) => e.isClockedIn)
                      .map((e) => (
                        <div
                          key={e.employee.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{e.employee.full_name}</p>
                            <p className="text-sm text-slate-600">Clocked in at {e.clockInTime}</p>
                          </div>
                          <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                        </div>
                      ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">No employees currently clocked in</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee Hours Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Hours Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 font-semibold text-slate-900">Employee</th>
                        <th className="text-center py-3 px-2 font-semibold text-slate-900">Regular Hours</th>
                        <th className="text-center py-3 px-2 font-semibold text-slate-900">Overtime Hours</th>
                        <th className="text-center py-3 px-2 font-semibold text-slate-900">Total Hours</th>
                        <th className="text-center py-3 px-2 font-semibold text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => {
                        const hours = getEmployeeHoursForPeriod(emp.id);
                        const clockedIn = getClockedInEmployees().find(
                          (e) => e.employee.id === emp.id
                        );
                        return (
                          <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-2 text-slate-900 font-medium">{emp.full_name}</td>
                            <td className="text-center py-3 px-2 text-slate-700">{hours.regularHours.toFixed(2)}</td>
                            <td className="text-center py-3 px-2 text-orange-600 font-semibold">
                              {hours.overtimeHours.toFixed(2)}
                            </td>
                            <td className="text-center py-3 px-2 text-slate-900 font-semibold">{hours.totalHours.toFixed(2)}</td>
                            <td className="text-center py-3 px-2">
                              {clockedIn?.isClockedIn ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  <Circle className="w-2 h-2 fill-green-600" />
                                  Clocked In
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">Clocked Out</span>
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

            {/* EMPLOYEE DETAILS TAB */}
            <TabsContent value="employee">
              {/* Date Navigation */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>← Prev</Button>
                <Input type="date" value={format(selectedDate, "yyyy-MM-dd")} onChange={(e) => setSelectedDate(new Date(e.target.value))} className="max-w-[160px] text-sm" />
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next →</Button>
                <span className="text-sm text-slate-500 ml-auto font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Admin: Employee List */}
                {currentUser?.role === "admin" && (
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Employees</CardTitle></CardHeader>
                      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                        {employees.map((emp) => (
                          <button key={emp.id} onClick={() => setSelectedEmployee(emp)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedEmployee?.id === emp.id ? "bg-amber-50 border-amber-300 font-semibold text-amber-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                            {emp.full_name}
                            <span className="text-xs text-slate-500 block">{emp.position}</span>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Time Card Content */}
                <div className={currentUser?.role === "admin" ? "lg:col-span-2 space-y-5" : "lg:col-span-3 space-y-5"}>
                  {selectedEmployee ? (() => {
                    const dateStr = format(selectedDate, "yyyy-MM-dd");
                    const dayEntries = employeeEntries.filter(e => e.date === dateStr);
                    const workEntries = dayEntries.filter(e => e.entry_type === "work");
                    const totalDayHours = workEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
                    const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

                    // Week total (Mon–Sun containing selectedDate)
                    const weekMon = startOfWeek(selectedDate, { weekStartsOn: 1 });
                    const weekSun = endOfWeek(selectedDate, { weekStartsOn: 1 });
                    const weekEntries = employeeEntries.filter(e => {
                      const d = new Date(e.date);
                      return e.entry_type === "work" && d >= weekMon && d <= weekSun;
                    });
                    const weekTotal = weekEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);

                    return (
                      <>
                        {/* Header + Clock Controls */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.full_name}</h2>
                            <p className="text-sm text-slate-500">{selectedEmployee.position || "Employee"}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {isToday && (clockInTime ? (
                              <>
                                <Button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700 gap-2">
                                  <Square className="w-4 h-4" /> Clock Out ({elapsedTime})
                                </Button>
                                <Button onClick={() => setShowSwitchModal(true)} variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 gap-2">
                                  <RefreshCw className="w-4 h-4" /> Switch{currentProjectName ? ` · ${currentProjectName}` : ""}
                                </Button>
                                <Button onClick={handleForgotLunch} variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50 gap-2" title="Deduct 30 min for missed lunch">
                                  <UtensilsCrossed className="w-4 h-4" /> Forgot Lunch
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700 gap-2">
                                  <Play className="w-4 h-4" /> Clock In
                                </Button>
                                {workEntries.length > 0 && (
                                  <Button onClick={handleForgotLunch} variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50 gap-2" title="Deduct 30 min for missed lunch">
                                    <UtensilsCrossed className="w-4 h-4" /> Forgot Lunch
                                  </Button>
                                )}
                              </>
                            ))}
                            {currentUser?.role === "admin" && (
                              <Button onClick={() => setShowAddEntry(true)} variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Add Entry
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Day + Week Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="col-span-2 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl px-5 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Timer className="w-4 h-4 text-amber-600" />
                              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{isToday ? "Today's Total" : format(selectedDate, "MMM d") + " Total"}</p>
                            </div>
                            <p className="text-3xl font-bold text-amber-900">{totalDayHours.toFixed(2)}<span className="text-sm font-normal ml-1 text-amber-700">hrs</span></p>
                            {isToday && clockInTime && <p className="text-xs text-amber-600 mt-1">⏱ Currently clocked in: {elapsedTime}</p>}
                          </div>
                          <div className="col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl px-5 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">This Week</p>
                            </div>
                            <p className="text-3xl font-bold text-slate-800">{weekTotal.toFixed(2)}<span className="text-sm font-normal ml-1 text-slate-500">hrs</span></p>
                            <p className="text-xs text-slate-400 mt-1">{weekTotal > 40 ? `+${(weekTotal - 40).toFixed(2)} overtime` : `${(40 - weekTotal).toFixed(2)} hrs to 40`}</p>
                          </div>
                        </div>

                        {/* Work Entries for the Selected Day */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                            Work Entries — {format(selectedDate, "MMMM d, yyyy")}
                          </p>
                          {workEntries.length === 0 && dayEntries.filter(e => e.entry_type !== "work").length === 0 ? (
                            <div className="text-center py-10 bg-white border border-slate-200 rounded-xl text-slate-400">
                              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No entries for this day</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {workEntries.map((entry, idx) => (
                                <div key={entry.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm">
                                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-amber-700">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {entry.project_name && (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                          <Briefcase className="w-3 h-3" /> {entry.project_name}
                                        </span>
                                      )}
                                      {entry.approved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                      <span className="font-mono font-semibold text-slate-800">{entry.clock_in || "—"} → {entry.clock_out || <span className="text-green-600 animate-pulse">Active</span>}</span>
                                      {entry.hours_worked != null && (
                                        <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">{entry.hours_worked.toFixed(2)} hrs</span>
                                      )}
                                    </div>
                                    {entry.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{entry.notes}</p>}
                                  </div>
                                  {currentUser?.role === "admin" && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      {!entry.approved && (
                                        <Button size="sm" variant="ghost" onClick={() => approveEntryMutation.mutate({ id: entry.id, data: { approved: true } })} className="text-green-600 hover:bg-green-50 h-8 px-2 text-xs">✓ Approve</Button>
                                      )}
                                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(entry)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                                      <Button size="sm" variant="ghost" onClick={() => deleteEntryMutation.mutate(entry.id)} className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Non-work entries (PTO, vacation, sick) */}
                              {dayEntries.filter(e => e.entry_type !== "work").map(entry => (
                                <div key={entry.id} className={`border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm ${typeColors[entry.entry_type]} bg-opacity-30`}>
                                  <div>
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeColors[entry.entry_type]}`}>{entry.entry_type}</span>
                                    {entry.notes && <p className="text-xs text-slate-500 mt-1">{entry.notes}</p>}
                                  </div>
                                  {currentUser?.role === "admin" && (
                                    <Button size="sm" variant="ghost" onClick={() => deleteEntryMutation.mutate(entry.id)} className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })() : (
                    <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">Select an employee to view their time card</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* VACATION TAB */}
            <TabsContent value="vacation">
              {currentUser?.role === "user" && !selectedEmployee && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-slate-600 font-medium">Loading your profile...</p>
                  </CardContent>
                </Card>
              )}
              
              {currentUser?.role === "admin" && !selectedEmployee && (
                <Card className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Select an employee to manage their vacation</p>
                </Card>
              )}

              {selectedEmployee && (
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {selectedEmployee.full_name}'s Vacation
                    </h2>
                    <p className="text-slate-600">Request time off and track PTO balance</p>
                  </div>
                  <VacationRequestForm employee={selectedEmployee} currentUser={currentUser} />
                </div>
              )}

              {currentUser?.role === "admin" && (
                <div className="mt-6">
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Select Employee</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                        {employees.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedEmployee?.id === emp.id
                                ? "bg-amber-50 border-amber-200 font-semibold text-amber-900"
                                : "border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            {emp.full_name}
                            <span className="text-xs text-slate-500 block">{emp.position}</span>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

          {/* DATA TAB - ADMIN ONLY */}
          {currentUser?.role === "admin" && (
            <TabsContent value="data">
              <TimeDataTab timeEntries={timeEntries} employees={employees} projects={projects} />
            </TabsContent>
          )}

          {/* SETTINGS TAB - ADMIN ONLY */}
          {currentUser?.role === "admin" && (
            <TabsContent value="settings" className="space-y-6">
            {/* Pay Period Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Pay Period Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Pay Period Start Day</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={settingsData.pay_period_start_day}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          pay_period_start_day: parseInt(e.target.value)
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Pay Period End Day</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={settingsData.pay_period_end_day}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          pay_period_end_day: parseInt(e.target.value)
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Current: {settingsData.pay_period_start_day}th - {settingsData.pay_period_end_day}th of each month
                </p>
              </CardContent>
            </Card>

            {/* Work Schedule Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Work Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-3">Work Days</label>
                  <div className="space-y-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, idx) => (
                      <label key={day} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settingsData.work_days.includes(idx + 1)}
                          onChange={(e) => {
                            const dayNum = idx + 1;
                            const newWorkDays = e.target.checked
                              ? [...settingsData.work_days, dayNum].sort()
                              : settingsData.work_days.filter(d => d !== dayNum);
                            setSettingsData({ ...settingsData, work_days: newWorkDays });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Start Time</label>
                    <Input
                      type="time"
                      value={settingsData.work_start_time}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, work_start_time: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">End Time</label>
                    <Input
                      type="time"
                      value={settingsData.work_end_time}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, work_end_time: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Lunch Break (mins)</label>
                    <Input
                      type="number"
                      min="0"
                      value={settingsData.lunch_break_minutes}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, lunch_break_minutes: parseInt(e.target.value) })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PTO Settings */}
            <Card>
              <CardHeader>
                <CardTitle>PTO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Total PTO Hours Per Year</label>
                  <Input
                    type="number"
                    value={settingsData.hours_per_year}
                    onChange={(e) =>
                      setSettingsData({
                        ...settingsData,
                        hours_per_year: parseFloat(e.target.value)
                      })
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Accrual Rate (Hours per Hour Worked)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={settingsData.accrual_rate}
                    onChange={(e) =>
                      setSettingsData({
                        ...settingsData,
                        accrual_rate: parseFloat(e.target.value)
                      })
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {(settingsData.hours_per_year / 2080).toFixed(4)} hrs/hour
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => updateSettingsMutation.mutate(settingsData)}
              className="bg-amber-600 hover:bg-amber-700 w-full"
              size="lg"
            >
              Save All Settings
            </Button>
            </TabsContent>
            )}
        </Tabs>

        {/* Clock In Modal */}
        <ClockInModal
          open={showClockInModal}
          onOpenChange={setShowClockInModal}
          projects={projects}
          onConfirm={doClockIn}
          title="Clock In"
          confirmLabel="Clock In"
          confirmClass="bg-green-600 hover:bg-green-700"
        />

        {/* Switch Project Modal */}
        <ClockInModal
          open={showSwitchModal}
          onOpenChange={setShowSwitchModal}
          projects={projects}
          onConfirm={handleSwitchProject}
          title="Switch Project"
          confirmLabel="Switch"
          confirmClass="bg-amber-600 hover:bg-amber-700"
        />

        {/* Edit Entry Dialog */}
        <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingEntry && (
                <p className="text-sm text-slate-500">{editingEntry.employee_name} · {editingEntry.date}</p>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">Clock In</label>
                <Input
                  type="time"
                  value={editForm.clock_in}
                  onChange={(e) => setEditForm(prev => ({ ...prev, clock_in: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Clock Out</label>
                <Input
                  type="time"
                  value={editForm.clock_out}
                  onChange={(e) => setEditForm(prev => ({ ...prev, clock_out: e.target.value }))}
                  className="mt-1"
                />
              </div>
              {editForm.clock_in && editForm.clock_out && (
                <p className="text-sm text-slate-500">Hours: {calculateHours(editForm.clock_in, editForm.clock_out)}</p>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} className="bg-amber-600 hover:bg-amber-700" disabled={updateEntryMutation.isPending}>
                  {updateEntryMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Entry Dialog */}
        <Dialog open={showAddEntry} onOpenChange={setShowAddEntry} className="z-50">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Entry Type</label>
                <Select
                  value={formData.entry_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, entry_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                    <Input
                      type="time"
                      value={formData.clock_in}
                      onChange={(e) =>
                        setFormData({ ...formData, clock_in: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Clock Out</label>
                    <Input
                      type="time"
                      value={formData.clock_out}
                      onChange={(e) =>
                        setFormData({ ...formData, clock_out: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Input
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEntry(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEntry}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Add Entry
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
          </div>
          </div>
          );
          }