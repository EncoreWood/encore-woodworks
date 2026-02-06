import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Plus, Trash2, CheckCircle2, Play, Square } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";

export default function TimeSheet() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [formData, setFormData] = useState({
    clock_in: "",
    clock_out: "",
    entry_type: "work",
    notes: ""
  });
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", selectedDate],
    queryFn: () => base44.entities.TimeEntry.filter({
      date: format(selectedDate, "yyyy-MM-dd")
    })
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

  const employeeEntries = selectedEmployee
    ? timeEntries.filter(e => e.employee_id === selectedEmployee.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Time Sheet</h1>
          <p className="text-slate-600">Track working hours, PTO, and vacation days</p>
        </div>

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
                                  <p>{entry.clock_in} - {entry.clock_out} ({entry.hours_worked} hrs)</p>
                                </div>
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

        {/* Add Entry Dialog */}
        <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
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