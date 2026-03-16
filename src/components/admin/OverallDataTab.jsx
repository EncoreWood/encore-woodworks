import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths } from "date-fns";

export default function OverallDataTab() {
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: () => base44.entities.TimeEntry.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["employeeReviews"],
    queryFn: () => base44.entities.EmployeeReview.list(),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list().then(qs => qs.filter(q => q.is_active)),
  });

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmployee);
  if (!selectedEmployeeObj && selectedEmployee) return null;

  if (!selectedEmployeeObj) {
    return (
      <div className="space-y-6">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Calculate metrics for selected employee
  const empTimeEntries = timeEntries.filter(e => e.employee_id === selectedEmployee && e.entry_type === "work");
  const totalHours = empTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const workDays = empTimeEntries.length;
  const avgHoursPerDay = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;
  const avgHoursPerWeek = (totalHours / Math.ceil(workDays / 5)).toFixed(1);

  // Attendance
  const scheduledDays = workDays; // Proxy: days with entries
  const attendanceRate = ((workDays / Math.max(workDays, 22)) * 100).toFixed(0); // Assume 22 working days/month

  // Punctuality - average clock-in time
  const clockInTimes = empTimeEntries
    .filter(e => e.clock_in)
    .map(e => {
      const [h, m] = e.clock_in.split(":").map(Number);
      return h * 60 + m;
    });
  const avgClockIn = clockInTimes.length > 0
    ? clockInTimes.reduce((a, b) => a + b, 0) / clockInTimes.length
    : 0;
  const avgClockInTime = `${Math.floor(avgClockIn / 60)}:${String(Math.round(avgClockIn % 60)).padStart(2, "0")}`;

  // Projects contribution
  const contributedProjects = projects.filter(p => {
    const managers = [p.project_manager, p.shop_manager];
    return managers.includes(selectedEmployee);
  });

  // Reviews
  const empReviews = reviews.filter(r => r.employee_id === selectedEmployee);
  const selfReviews = empReviews.filter(r => r.review_type === "self");
  const managerReviews = empReviews.filter(r => r.review_type === "manager");

  // Monthly performance trend (last 12 months)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const monthEntries = empTimeEntries.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === date.getMonth() && eDate.getFullYear() === date.getFullYear();
    });
    return {
      month: format(date, "MMM"),
      hours: monthEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{selectedEmployeeObj.full_name}</h2>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{avgHoursPerDay}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Hours/Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{avgHoursPerWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Clock-In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{avgClockInTime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{contributedProjects.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.some(d => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} hrs`} />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Review Comparison */}
      {selfReviews.length > 0 || managerReviews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selfReviews.map(selfReview => {
              const correspondingManager = managerReviews.find(
                m => m.review_period === selfReview.review_period && m.year === selfReview.year
              );

              return (
                <div key={selfReview.id} className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
                  <p className="font-medium text-slate-900 mb-4">{selfReview.review_period} {selfReview.year}</p>
                  
                  {questions.length > 0 ? (
                    <div className="space-y-3">
                      {questions.map(q => {
                        const selfAnswer = selfReview.answers?.[q.id];
                        const managerAnswer = correspondingManager?.answers?.[q.id];
                        const isNumeric = ["Rating 1-5", "Rating 1-10"].includes(q.question_type);
                        const hasGap = isNumeric && selfAnswer && managerAnswer && Math.abs(Number(selfAnswer) - Number(managerAnswer)) > 2;

                        if (!selfAnswer && !managerAnswer) return null;

                        return (
                          <div key={q.id} className={`p-3 border rounded-lg ${hasGap ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                            <p className="text-sm font-medium text-slate-900 mb-2">{q.question_text}</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-600 mb-1">Employee</p>
                                <p className="font-semibold text-slate-900">{selfAnswer || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">Manager</p>
                                <p className="font-semibold text-slate-900">{managerAnswer || "—"}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No questions available</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Review Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">No reviews yet</p>
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      <Card>
        <CardHeader>
          <CardTitle>Projects Contributed To</CardTitle>
        </CardHeader>
        <CardContent>
          {contributedProjects.length > 0 ? (
            <div className="space-y-2">
              {contributedProjects.map(p => (
                <div key={p.id} className="p-3 border border-slate-200 rounded-lg">
                  <p className="font-medium text-slate-900">{p.project_name}</p>
                  <p className="text-sm text-slate-500">{p.client_name} · {p.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No projects</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}