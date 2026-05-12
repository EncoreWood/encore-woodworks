import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check, X, DollarSign, Clock, TrendingUp, Gift, ChevronLeft, ChevronRight } from "lucide-react";

function getPayPeriodForOffset(offset) {
  const today = new Date();
  const anchor = new Date(today.getFullYear(), today.getMonth() + offset, today.getDate());
  const day = anchor.getDate();
  let start, end;
  if (day >= 16) {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 16);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 15);
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 16);
    end = new Date(anchor.getFullYear(), anchor.getMonth(), 15);
  }
  return { start, end };
}

function calcWeeklyOT(entries, startStr, endStr) {
  const periodEntries = entries.filter(e =>
    e.entry_type === "work" && e.date >= startStr && e.date <= endStr
  );
  // Group by week
  const weeklyTotals = {};
  periodEntries.forEach(entry => {
    const d = new Date(entry.date);
    const dow = (d.getDay() + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    const key = format(mon, "yyyy-MM-dd");
    weeklyTotals[key] = (weeklyTotals[key] || 0) + (entry.hours_worked || 0);
  });
  let regular = 0, overtime = 0;
  Object.values(weeklyTotals).forEach(wk => {
    if (wk > 40) { regular += 40; overtime += wk - 40; }
    else regular += wk;
  });
  const total = regular + overtime;
  return { total, regular, overtime };
}

function EmployeePayRow({ employee, timeEntries, periodStart, periodEnd, onSaved }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    pay_type: employee.pay_type || "hourly",
    hourly_rate: employee.hourly_rate || "",
    monthly_salary: employee.monthly_salary || "",
    overtime_rate_multiplier: employee.overtime_rate_multiplier || 1.5,
    bonus: employee.bonus || 0,
  });
  const [saving, setSaving] = useState(false);

  const startStr = format(periodStart, "yyyy-MM-dd");
  const endStr = format(periodEnd, "yyyy-MM-dd");

  const empEntries = timeEntries.filter(e => e.employee_id === employee.id);
  const { total, regular, overtime } = calcWeeklyOT(empEntries, startStr, endStr);

  // PTO entries in period
  const ptoEntries = empEntries.filter(e =>
    (e.entry_type === "pto" || e.entry_type === "vacation") &&
    e.date >= startStr && e.date <= endStr
  );
  const ptoHoursThisPeriod = ptoEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);

  // Available PTO balance
  const availablePTO = Math.max(0, (employee.pto_hours_accrued || 0) - (employee.pto_hours_used || 0));

  // Pay calculations
  const payType = editing ? form.pay_type : (employee.pay_type || "hourly");
  const hourlyRate = editing ? parseFloat(form.hourly_rate) || 0 : (employee.hourly_rate || 0);
  const monthlySalary = editing ? parseFloat(form.monthly_salary) || 0 : (employee.monthly_salary || 0);
  const otMultiplier = editing ? parseFloat(form.overtime_rate_multiplier) || 1.5 : (employee.overtime_rate_multiplier || 1.5);
  const bonus = editing ? parseFloat(form.bonus) || 0 : (employee.bonus || 0);

  let regularPay = 0, overtimePay = 0, ptoPay = 0;
  if (payType === "hourly") {
    regularPay = regular * hourlyRate;
    overtimePay = overtime * hourlyRate * otMultiplier;
    ptoPay = ptoHoursThisPeriod * hourlyRate;
  } else {
    // Salaried: full monthly salary as regular pay
    regularPay = monthlySalary;
    const hourlyEquiv = (monthlySalary * 12) / 52 / 40;
    overtimePay = overtime * hourlyEquiv * otMultiplier;
    ptoPay = 0; // salaried PTO doesn't add extra pay
  }
  const totalPay = regularPay + overtimePay + ptoPay + bonus;

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, {
      pay_type: form.pay_type,
      hourly_rate: parseFloat(form.hourly_rate) || null,
      monthly_salary: parseFloat(form.monthly_salary) || null,
      overtime_rate_multiplier: parseFloat(form.overtime_rate_multiplier) || 1.5,
      bonus: parseFloat(form.bonus) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    setSaving(false);
    setEditing(false);
    onSaved?.();
  };

  const fmt$ = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-900">{employee.full_name}</span>

          {/* Pay rate display / edit */}
          {editing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={form.pay_type} onValueChange={v => setForm(f => ({ ...f, pay_type: v }))}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
              {form.pay_type === "hourly" ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">$/hr</span>
                  <Input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} className="h-7 w-24 text-xs" />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">$/mo</span>
                  <Input type="number" step="100" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} className="h-7 w-28 text-xs" />
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">OT×</span>
                <Input type="number" step="0.1" value={form.overtime_rate_multiplier} onChange={e => setForm(f => ({ ...f, overtime_rate_multiplier: e.target.value }))} className="h-7 w-16 text-xs" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Bonus $</span>
                <Input type="number" step="1" value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} className="h-7 w-24 text-xs" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${payType === "salary" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                {payType === "salary" ? `Salary: ${fmt$(monthlySalary)}/mo` : `$${hourlyRate.toFixed(2)}/hr`}
              </span>
              {bonus > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  +{fmt$(bonus)} bonus
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* PTO badge */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold" title="Available PTO hours">
            {availablePTO.toFixed(1)} PTO hrs avail
          </span>
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving} className="h-7 w-7 p-0 text-green-600">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm({ pay_type: employee.pay_type || "hourly", hourly_rate: employee.hourly_rate || "", monthly_salary: employee.monthly_salary || "", overtime_rate_multiplier: employee.overtime_rate_multiplier || 1.5, bonus: employee.bonus || 0 }); }} className="h-7 w-7 p-0 text-red-500">
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Pay breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-white">
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Regular</p>
          <p className="text-sm font-bold text-slate-800">{payType === "hourly" ? `${regular.toFixed(2)} hrs` : "—"}</p>
          <p className="text-sm font-semibold text-green-700">{fmt$(regularPay)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Overtime</p>
          <p className="text-sm font-bold text-slate-800">{overtime > 0 ? `${overtime.toFixed(2)} hrs` : "—"}</p>
          <p className={`text-sm font-semibold ${overtimePay > 0 ? "text-orange-600" : "text-slate-400"}`}>{fmt$(overtimePay)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><Gift className="w-3 h-3" /> Bonus / PTO Pay</p>
          <p className="text-sm font-bold text-slate-800">{ptoHoursThisPeriod > 0 ? `${ptoHoursThisPeriod.toFixed(1)} PTO hrs` : bonus > 0 ? "Bonus" : "—"}</p>
          <p className="text-sm font-semibold text-purple-600">{fmt$(ptoPay + bonus)}</p>
        </div>
        <div className="px-4 py-3 bg-slate-50">
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total</p>
          <p className="text-sm font-bold text-slate-800">{total.toFixed(2)} hrs</p>
          <p className="text-base font-bold text-slate-900">{fmt$(totalPay)}</p>
        </div>
      </div>
    </div>
  );
}

export default function PayrollTab({ employees, timeEntries }) {
  const [periodOffset, setPeriodOffset] = useState(0);
  const { start: periodStart, end: periodEnd } = getPayPeriodForOffset(periodOffset);

  const startStr = format(periodStart, "yyyy-MM-dd");
  const endStr = format(periodEnd, "yyyy-MM-dd");

  // Grand total
  let grandTotal = 0;
  const activeEmployees = employees.filter(e => e.full_name && e.full_name !== "Encore Shop");

  activeEmployees.forEach(emp => {
    const empEntries = timeEntries.filter(e => e.employee_id === emp.id);
    const { regular, overtime } = calcWeeklyOT(empEntries, startStr, endStr);
    const payType = emp.pay_type || "hourly";
    const hourlyRate = emp.hourly_rate || 0;
    const monthlySalary = emp.monthly_salary || 0;
    const otMult = emp.overtime_rate_multiplier || 1.5;
    const bonus = emp.bonus || 0;
    const ptoEntries = empEntries.filter(e =>
      (e.entry_type === "pto" || e.entry_type === "vacation") &&
      e.date >= startStr && e.date <= endStr
    );
    const ptoHrs = ptoEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);

    if (payType === "hourly") {
      grandTotal += regular * hourlyRate + overtime * hourlyRate * otMult + ptoHrs * hourlyRate + bonus;
    } else {
      grandTotal += monthlySalary + overtime * ((monthlySalary * 12) / 52 / 40) * otMult + bonus;
    }
  });

  const fmt$ = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Period nav */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPeriodOffset(o => o - 1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-sm font-semibold text-slate-700">
            {periodOffset === 0 ? "Current Period" : `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPeriodOffset(o => o + 1)} disabled={periodOffset >= 0}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
          {periodOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPeriodOffset(0)} className="text-amber-600">Current</Button>
          )}
        </div>
        <p className="text-xs text-slate-500">{format(periodStart, "MMM d")} – {format(periodEnd, "MMM d, yyyy")}</p>
      </div>

      {/* Grand total banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Estimated Payroll Cost</p>
          <p className="text-white text-3xl font-bold mt-0.5">{fmt$(grandTotal)}</p>
        </div>
        <DollarSign className="w-10 h-10 text-slate-600" />
      </div>

      {/* Per-employee rows */}
      <div>
        {activeEmployees.map(emp => (
          <EmployeePayRow
            key={emp.id}
            employee={emp}
            timeEntries={timeEntries}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />
        ))}
        {activeEmployees.length === 0 && (
          <p className="text-center text-slate-400 py-10 text-sm">No employees found.</p>
        )}
      </div>
    </div>
  );
}