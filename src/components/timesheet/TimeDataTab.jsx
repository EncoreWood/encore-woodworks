import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#6366f1"];

export default function TimeDataTab({ timeEntries, employees, projects }) {
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  const workEntries = timeEntries.filter(e => e.entry_type === "work" && e.hours_worked > 0);

  const filtered = workEntries.filter(e => {
    if (filterEmployee !== "all" && e.employee_id !== filterEmployee) return false;
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    return true;
  });

  // Hours per project
  const projectHours = {};
  filtered.forEach(e => {
    const key = e.project_name || "General / No Project";
    projectHours[key] = (projectHours[key] || 0) + (e.hours_worked || 0);
  });
  const projectChartData = Object.entries(projectHours)
    .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours);

  // Hours per employee
  const employeeHours = {};
  filtered.forEach(e => {
    const key = e.employee_name || "Unknown";
    employeeHours[key] = (employeeHours[key] || 0) + (e.hours_worked || 0);
  });
  const employeeChartData = Object.entries(employeeHours)
    .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours);

  const totalHours = filtered.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  // Pie data for project %
  const pieData = projectChartData.map((d, i) => ({
    ...d,
    pct: totalHours > 0 ? ((d.hours / totalHours) * 100).toFixed(1) : 0,
    fill: COLORS[i % COLORS.length]
  }));

  // Raw logs sorted by date desc
  const rawLogs = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-40">
          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Employee</label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Project</label>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-5">
          <span className="text-sm text-slate-600 font-semibold">Total: <span className="text-slate-900">{totalHours.toFixed(2)} hrs</span> across {filtered.length} entries</span>
        </div>
      </div>

      {/* Total Hours per Project Bar Chart */}
      <Card>
        <CardHeader><CardTitle>Hours per Project</CardTitle></CardHeader>
        <CardContent>
          {projectChartData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectChartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                <YAxis unit="h" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} hrs`, "Hours"]} />
                <Bar dataKey="hours" radius={[4,4,0,0]}>
                  {projectChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader><CardTitle>Project Time Breakdown (%)</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, pct }) => `${pct}%`} labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                  <Tooltip formatter={(v, n) => [`${v} hrs`, n]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hours per Employee */}
        <Card>
          <CardHeader><CardTitle>Hours per Employee</CardTitle></CardHeader>
          <CardContent>
            {employeeChartData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={employeeChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} hrs`, "Hours"]} />
                  <Bar dataKey="hours" fill="#f59e0b" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader><CardTitle>Project Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-semibold">Project</th>
                  <th className="text-center py-3 px-2 font-semibold">Total Hours</th>
                  <th className="text-center py-3 px-2 font-semibold">% of Total</th>
                  <th className="text-center py-3 px-2 font-semibold">Entries</th>
                </tr>
              </thead>
              <tbody>
                {pieData.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: d.fill }} />
                      {d.name}
                    </td>
                    <td className="text-center py-2 px-2 font-semibold">{d.hours} hrs</td>
                    <td className="text-center py-2 px-2 text-slate-600">{d.pct}%</td>
                    <td className="text-center py-2 px-2 text-slate-500">
                      {filtered.filter(e => (e.project_name || "General / No Project") === d.name).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Raw Logs */}
      <Card>
        <CardHeader><CardTitle>Raw Logs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-semibold">Date</th>
                  <th className="text-left py-3 px-2 font-semibold">Employee</th>
                  <th className="text-left py-3 px-2 font-semibold">Project</th>
                  <th className="text-center py-3 px-2 font-semibold">In</th>
                  <th className="text-center py-3 px-2 font-semibold">Out</th>
                  <th className="text-center py-3 px-2 font-semibold">Hours</th>
                  <th className="text-left py-3 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rawLogs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">No entries</td></tr>
                ) : rawLogs.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-700">{format(new Date(e.date), "MMM d, yyyy")}</td>
                    <td className="py-2 px-2 font-medium">{e.employee_name}</td>
                    <td className="py-2 px-2 text-slate-600">{e.project_name || <span className="text-slate-400 italic">General</span>}</td>
                    <td className="text-center py-2 px-2">{e.clock_in || "—"}</td>
                    <td className="text-center py-2 px-2">{e.clock_out || <span className="text-green-600 font-semibold">Active</span>}</td>
                    <td className="text-center py-2 px-2 font-semibold">{e.hours_worked ?? "—"}</td>
                    <td className="py-2 px-2 text-slate-500 text-xs">{e.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}