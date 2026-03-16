import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";

const FINANCIAL_CATEGORIES = ["Expenses", "Overhead", "Other"];
const STATUS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function FinancialDataTab() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfYear(new Date()), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [newEntry, setNewEntry] = useState({ date: format(new Date(), "yyyy-MM-dd"), category: "Expenses", amount: "", notes: "" });
  const [showNewEntry, setShowNewEntry] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: financialEntries = [] } = useQuery({
    queryKey: ["financialEntries"],
    queryFn: () => base44.entities.FinancialEntry?.list?.() || [],
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialEntries"] });
      setNewEntry({ date: format(new Date(), "yyyy-MM-dd"), category: "Expenses", amount: "", notes: "" });
      setShowNewEntry(false);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financialEntries"] }),
  });

  // Calculate metrics
  const totalRevenue = projects.reduce((sum, p) => sum + (p.estimated_budget || 0), 0);
  const totalDeposits = projects.reduce((sum, p) => sum + (p.deposit_paid || 0), 0);
  const completedValue = projects.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.actual_cost || 0), 0);
  const totalReceivable = totalRevenue - totalDeposits;

  // Monthly revenue data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthProjects = projects.filter(p => {
      const startDate = p.start_date ? new Date(p.start_date) : null;
      return startDate && startDate.getMonth() === i && startDate.getFullYear() === new Date().getFullYear();
    });
    return {
      month: format(new Date(2026, i, 1), "MMM"),
      revenue: monthProjects.reduce((sum, p) => sum + (p.estimated_budget || 0), 0),
    };
  }).filter(d => d.revenue > 0);

  // Status breakdown
  const statusBreakdown = [
    { name: "Active", value: projects.filter(p => ["in_design", "in_production", "ready_for_install", "installing"].includes(p.status)).length },
    { name: "Completed", value: projects.filter(p => p.status === "completed").length },
    { name: "On Hold", value: projects.filter(p => p.status === "on_hold").length },
    { name: "Other", value: projects.filter(p => ["inquiry", "quoted", "approved"].includes(p.status)).length },
  ];

  // Top 5 projects
  const topProjects = [...projects].sort((a, b) => (b.estimated_budget || 0) - (a.estimated_budget || 0)).slice(0, 5);

  const handleCreateEntry = () => {
    if (newEntry.amount && parseFloat(newEntry.amount) > 0) {
      createEntryMutation.mutate({
        date: newEntry.date,
        category: newEntry.category,
        amount: parseFloat(newEntry.amount),
        notes: newEntry.notes,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">${(totalRevenue / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">${(totalDeposits / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">${(totalReceivable / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Completed Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">${(completedValue / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusBreakdown.map((_, index) => <Cell key={index} fill={STATUS_COLORS[index]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-8">No projects</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Projects by Value</CardTitle>
        </CardHeader>
        <CardContent>
          {topProjects.length > 0 ? (
            <div className="space-y-3">
              {topProjects.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-slate-900">{idx + 1}. {p.project_name}</p>
                    <p className="text-sm text-slate-500">{p.client_name}</p>
                  </div>
                  <p className="font-bold text-slate-900">${(p.estimated_budget || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No projects</p>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Section */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Manual Financial Entries</CardTitle>
          {!showNewEntry && (
            <Button size="sm" onClick={() => setShowNewEntry(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showNewEntry && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <Input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                <Select value={newEntry.category} onValueChange={(val) => setNewEntry({ ...newEntry, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCIAL_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} />
                <Input placeholder="Notes" value={newEntry.notes} onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateEntry} className="bg-green-600 hover:bg-green-700">Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewEntry(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {financialEntries.length > 0 ? (
            <div className="space-y-2">
              {financialEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{entry.category}</p>
                    <p className="text-sm text-slate-500">{entry.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-900">${entry.amount}</p>
                    <Button size="sm" variant="ghost" onClick={() => deleteEntryMutation.mutate(entry.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No manual entries yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}