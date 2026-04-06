import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, startOfYear } from "date-fns";

const STAGE_LABELS = { cut: "Cut", face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete", on_hold: "On Hold" };
const STAGE_COLORS = { cut: "bg-orange-100 text-orange-700", face_frame: "bg-blue-100 text-blue-700", spray: "bg-purple-100 text-purple-700", build: "bg-amber-100 text-amber-700", complete: "bg-green-100 text-green-700", on_hold: "bg-red-100 text-red-700" };

export default function ProductionDataTab() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const [logFilter, setLogFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list() });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["timeEntries"], queryFn: () => base44.entities.TimeEntry.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: productionItems = [] } = useQuery({ queryKey: ["productionItems"], queryFn: () => base44.entities.ProductionItem.list() });

  // Filter by date range
  const completedProjects = projects.filter(p => {
    if (!p.actual_completion) return false;
    const date = new Date(p.actual_completion);
    return date >= new Date(dateFrom) && date <= new Date(dateTo) && p.status === "completed";
  });

  // Total jobs completed
  const totalCompleted = completedProjects.length;
  const avgPerWeek = (totalCompleted / Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (7 * 24 * 60 * 60 * 1000))).toFixed(1);
  const avgPerMonth = (totalCompleted / Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (30 * 24 * 60 * 60 * 1000))).toFixed(1);

  // Points data per employee
  const pointsPerEmployee = {};
  timeEntries.forEach(entry => {
    if (!pointsPerEmployee[entry.employee_name]) pointsPerEmployee[entry.employee_name] = 0;
    pointsPerEmployee[entry.employee_name] += entry.hours_worked || 0;
  });

  const employeeOutputData = Object.entries(pointsPerEmployee).map(([name, hours]) => ({
    name,
    hours: parseFloat(hours.toFixed(1)),
  }));

  // Install turnaround
  const installTimes = completedProjects
    .filter(p => p.install_start_date && p.install_end_date)
    .map(p => differenceInDays(new Date(p.install_end_date), new Date(p.install_start_date)))
    .filter(d => d >= 0);
  const avgInstallDays = installTimes.length > 0 ? (installTimes.reduce((a, b) => a + b, 0) / installTimes.length).toFixed(1) : 0;

  // Speed trend (month over month completion rate)
  const monthlyCompletions = {};
  completedProjects.forEach(p => {
    const monthKey = format(new Date(p.actual_completion), "yyyy-MM");
    monthlyCompletions[monthKey] = (monthlyCompletions[monthKey] || 0) + 1;
  });
  const speedTrendData = Object.entries(monthlyCompletions).sort().map(([month, count]) => ({ month, jobs: count }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Jobs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Per Week Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{avgPerWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Per Month Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{avgPerMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Install Days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{avgInstallDays}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Movement Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Stage Movement Log
            <span className="text-sm font-normal text-slate-500 ml-1">— who moved what and when</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by item or project..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            // Flatten all log entries with item context
            const allEntries = [];
            productionItems.forEach(item => {
              (item.stage_move_log || []).forEach(entry => {
                allEntries.push({ ...entry, item_name: item.name, project_name: item.project_name, room_name: item.room_name });
              });
            });
            // Sort newest first
            allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const filtered = allEntries.filter(e => {
              const matchStage = logFilter === "all" || e.to_stage === logFilter || e.from_stage === logFilter;
              const search = logSearch.toLowerCase();
              const matchSearch = !search || (e.item_name || "").toLowerCase().includes(search) || (e.project_name || "").toLowerCase().includes(search) || (e.moved_by || "").toLowerCase().includes(search);
              return matchStage && matchSearch;
            }).slice(0, 100);

            if (filtered.length === 0) return <p className="text-slate-400 text-center py-6 text-sm">No movement logs yet. They'll appear here as items are moved between stages.</p>;

            return (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filtered.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 text-sm border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{entry.item_name}</p>
                      {entry.project_name && <p className="text-xs text-slate-500 truncate">{entry.project_name}{entry.room_name ? ` · ${entry.room_name}` : ""}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {entry.from_stage && (
                        <>
                          <Badge className={`text-xs ${STAGE_COLORS[entry.from_stage] || "bg-slate-100 text-slate-600"}`}>
                            {STAGE_LABELS[entry.from_stage] || entry.from_stage}
                          </Badge>
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <Badge className={`text-xs ${STAGE_COLORS[entry.to_stage] || "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABELS[entry.to_stage] || entry.to_stage}
                      </Badge>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-slate-700">{entry.moved_by}</p>
                      <p className="text-xs text-slate-400">{entry.timestamp ? format(new Date(entry.timestamp), "MMM d, h:mm a") : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Output (Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeOutputData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeOutputData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Job Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {speedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={speedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="jobs" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}