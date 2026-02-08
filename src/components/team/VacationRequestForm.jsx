import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Trash2, Clock } from "lucide-react";
import { format, differenceInDays, eachDayOfInterval } from "date-fns";

export default function VacationRequestForm({ employee, currentUser }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    use_pto: false,
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: vacations = [] } = useQuery({
    queryKey: ["vacations", employee?.id],
    queryFn: () => base44.entities.Vacation.filter({ employee_id: employee.id }),
    enabled: !!employee
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.Settings.filter({ setting_type: "pto_calculation" })
  });

  const createVacationMutation = useMutation({
    mutationFn: (data) => base44.entities.Vacation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacations"] });
      setShowDialog(false);
      setFormData({ start_date: "", end_date: "", use_pto: false, notes: "" });
    }
  });

  const deleteVacationMutation = useMutation({
    mutationFn: (id) => base44.entities.Vacation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacations"] });
    }
  });

  const calculatePTO = () => {
    if (!employee) return { earned: 0, used: 0, available: 0 };

    const accrualRate = settings[0]?.accrual_rate || 0.0192;
    
    const workEntries = timeEntries.filter(
      (e) => e.employee_id === employee.id && e.entry_type === "work"
    );
    const totalHoursWorked = workEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const earned = totalHoursWorked * accrualRate;

    const ptoEntries = timeEntries.filter(
      (e) => e.employee_id === employee.id && e.entry_type === "pto"
    );
    const ptoUsedFromEntries = ptoEntries.length * 8;

    const approvedVacations = vacations.filter(
      (v) => v.status === "approved" && v.use_pto
    );
    const ptoUsedFromVacations = approvedVacations.reduce(
      (sum, v) => sum + (v.pto_hours_used || 0),
      0
    );

    const used = ptoUsedFromEntries + ptoUsedFromVacations;
    const available = earned - used;

    return { earned, used, available };
  };

  const calculateVacationDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    const workDays = settings[0]?.work_days || [1, 2, 3, 4];
    const allDays = eachDayOfInterval({ start, end });
    
    const businessDays = allDays.filter((day) => {
      const dayOfWeek = day.getDay() === 0 ? 7 : day.getDay();
      return workDays.includes(dayOfWeek);
    });

    return businessDays.length;
  };

  const calculateHoursNeeded = () => {
    const days = calculateVacationDays();
    const workStartTime = settings[0]?.work_start_time || "07:00";
    const workEndTime = settings[0]?.work_end_time || "17:30";
    const lunchBreak = settings[0]?.lunch_break_minutes || 30;

    const [startH, startM] = workStartTime.split(":").map(Number);
    const [endH, endM] = workEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hoursPerDay = (endMinutes - startMinutes - lunchBreak) / 60;

    return days * hoursPerDay;
  };

  const handleSubmit = () => {
    if (!employee || !formData.start_date || !formData.end_date) return;

    const hoursNeeded = calculateHoursNeeded();
    const pto = calculatePTO();

    if (formData.use_pto && hoursNeeded > pto.available) {
      alert(`Not enough PTO. You need ${hoursNeeded.toFixed(2)} hours but only have ${pto.available.toFixed(2)} available.`);
      return;
    }

    createVacationMutation.mutate({
      employee_id: employee.id,
      employee_name: employee.full_name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      use_pto: formData.use_pto,
      pto_hours_used: formData.use_pto ? hoursNeeded : 0,
      status: currentUser?.role === "admin" ? "approved" : "pending",
      notes: formData.notes || undefined
    });
  };

  const pto = calculatePTO();
  const hoursNeeded = calculateHoursNeeded();
  const vacationDays = calculateVacationDays();

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800"
  };

  if (!employee) return null;

  return (
    <div className="space-y-6">
      {/* PTO Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            PTO Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Earned</p>
              <p className="text-2xl font-bold text-blue-600">{pto.earned.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Used</p>
              <p className="text-2xl font-bold text-slate-900">{pto.used.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{pto.available.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Vacation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Vacation Requests
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="bg-amber-600 hover:bg-amber-700">
              Request Vacation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vacations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No vacation requests</p>
            ) : (
              vacations.map((vacation) => (
                <div key={vacation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColors[vacation.status]}>
                        {vacation.status}
                      </Badge>
                      {vacation.use_pto && (
                        <Badge variant="outline" className="text-xs">
                          Using PTO ({vacation.pto_hours_used?.toFixed(1)} hrs)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(vacation.start_date), "MMM d")} - {format(new Date(vacation.end_date), "MMM d, yyyy")}
                    </p>
                    {vacation.notes && (
                      <p className="text-xs text-slate-600 mt-1">{vacation.notes}</p>
                    )}
                  </div>
                  {(vacation.status === "pending" || currentUser?.role === "admin") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVacationMutation.mutate(vacation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Vacation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1"
              />
            </div>

            {vacationDays > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {vacationDays} work day{vacationDays !== 1 ? "s" : ""} ({hoursNeeded.toFixed(2)} hours)
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="use_pto"
                checked={formData.use_pto}
                onCheckedChange={(checked) => setFormData({ ...formData, use_pto: checked })}
              />
              <Label htmlFor="use_pto" className="cursor-pointer font-normal">
                Use PTO hours for this vacation
              </Label>
            </div>

            {formData.use_pto && hoursNeeded > 0 && (
              <div className={`p-3 rounded-lg ${hoursNeeded > pto.available ? "bg-red-50" : "bg-green-50"}`}>
                <p className={`text-sm font-medium ${hoursNeeded > pto.available ? "text-red-900" : "text-green-900"}`}>
                  {hoursNeeded > pto.available ? (
                    <>⚠️ Not enough PTO. Need {hoursNeeded.toFixed(2)} hrs, have {pto.available.toFixed(2)} hrs</>
                  ) : (
                    <>✓ Will use {hoursNeeded.toFixed(2)} PTO hours. {(pto.available - hoursNeeded).toFixed(2)} hrs remaining</>
                  )}
                </p>
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Reason for vacation, emergency contact, etc."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.start_date || !formData.end_date || createVacationMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}