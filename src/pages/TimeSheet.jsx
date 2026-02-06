import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Trash2, CheckCircle2, Play, Square, Settings, Circle } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

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

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", selectedDate],
    queryFn: () => base44.entities.TimeEntry.list()
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

  const handleClockIn = () => {
    setClockInTime(new Date());
  };

  const handleClockOut = () => {
    if (!clockInTime || !selectedEmployee) return;
    const now = new Date();
    const clockInStr = format(clockInTime, "HH:mm");
    const clockOutStr = format(now, "HH:mm");
    const hours = calculateHours(clockInStr, clockOutStr);

    createEntryMutation.mutate({
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      date: format(selectedDate, "yyyy-MM-dd"),
      clock_in: clockInStr,
      clock_out: clockOutStr,
      hours_worked: parseFloat(hours),
      entry_type: "work",
      notes: ""
    });

    setClockInTime(null);
    setElapsedTime("00:00:00");
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Time Sheet</h1>
          <p className="text-slate-600">Track working hours, PTO, and vacation days</p>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employee">Employee Details</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
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

          {/* EMPLOYEE DETAILS TAB */}
          <TabsContent value="employee">
            {/* Date Navigation */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              >
                ← Previous
              </Button>
              <Input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="max-w-xs"
              />
              <Button
                variant="outline"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                Next →
              </Button>
              <span className="text-sm text-slate-600 ml-auto">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Employee List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employees</CardTitle>
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

          {/* Time Entries */}
          <div className="lg:col-span-2 space-y-4">
            {selectedEmployee ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedEmployee.full_name}'s Time Card
                  </h2>
                  <div className="flex gap-2">
                    {clockInTime ? (
                      <Button
                        onClick={handleClockOut}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Clock Out ({elapsedTime})
                      </Button>
                    ) : (
                      <Button
                        onClick={handleClockIn}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Clock In
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowAddEntry(true)}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Entry
                    </Button>
                  </div>
                </div>

                {/* Daily Summary */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-600">Work Hours</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {employeeEntries
                            .filter(e => e.entry_type === "work")
                            .reduce((sum, e) => sum + (e.hours_worked || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">PTO Days</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {employeeEntries.filter(e => e.entry_type === "pto").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Vacation Days</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {employeeEntries.filter(e => e.entry_type === "vacation").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Sick Days</p>
                        <p className="text-2xl font-bold text-red-600">
                          {employeeEntries.filter(e => e.entry_type === "sick").length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Entries List */}
                <div className="space-y-3">
                  {employeeEntries.length === 0 ? (
                    <Card className="text-center py-8">
                      <p className="text-slate-500">No time entries for this date</p>
                    </Card>
                  ) : (
                    employeeEntries.map((entry) => (
                      <Card key={entry.id} className="border-l-4 border-l-amber-500">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColors[entry.entry_type]}`}>
                                  {entry.entry_type.toUpperCase()}
                                </span>
                                {entry.approved && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              {entry.entry_type === "work" && (
                                <div className="text-sm text-slate-600">
                                  <p className="font-medium text-slate-700">{format(new Date(entry.date), "MMM d, yyyy")}</p>
                                  <p>{entry.clock_in} - {entry.clock_out} ({entry.hours_worked} hrs)</p>
                                </div>
                              )}
                              {entry.entry_type !== "work" && (
                                <p className="text-sm text-slate-600 font-medium">{format(new Date(entry.date), "MMM d, yyyy")}</p>
                              )}
                              {entry.notes && (
                                <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!entry.approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    approveEntryMutation.mutate({
                                      id: entry.id,
                                      data: { approved: true }
                                    })
                                  }
                                  className="text-green-600"
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              <Card className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Select an employee to view their time card</p>
              </Card>
            )}
            </div>
            </div>
            </TabsContent>

          {/* SETTINGS TAB */}
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
        </Tabs>

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