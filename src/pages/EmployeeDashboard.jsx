import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import usePullToRefresh from "@/components/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ProjectForm from "../components/projects/ProjectForm";
import ProductionStatsPanel from "../components/dashboard/ProductionStatsPanel";
import WeatherWidget from "../components/dashboard/WeatherWidget";
import TodayPanel from "../components/dashboard/TodayPanel";
import { format, startOfWeek, startOfMonth } from "date-fns";

export default function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const MST_TZ = "America/Denver";
  const nowUtc = new Date();
  const now = new Date(nowUtc.toLocaleString("en-US", { timeZone: MST_TZ }));

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list("-updated_date", 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); }
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["productionItems"] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  const getPtsFromItems = (items) =>
    items.reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);

  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const completedStageItems = productionItems.filter(i => i.stage === "complete");
  const dayPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date === todayStr));
  const weekPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date && new Date(i.completed_date) >= weekStart));
  const monthPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart));

  const inProductionProjects = projects.filter(p => p.status === "in_production");

  return (
    <div className="min-h-screen bg-slate-50">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Employee Dashboard</h1>
            <p className="text-slate-400 text-sm">Daily overview</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <WeatherWidget />
              <div className="text-right">
                <p className="text-4xl font-light text-slate-500">{format(now, "EEEE")}</p>
                <p className="text-3xl font-semibold text-slate-700">{format(now, "MMM do yyyy")}</p>
                <p className="text-xs text-slate-400 text-right">Mountain Time</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-1" /> New Project
            </Button>
          </div>
        </div>

        {/* Top Row: Today Panel + PTS Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-1">
            <TodayPanel inProductionProjects={inProductionProjects} />
          </div>

          {/* PTS Overview */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">PTS Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Day", value: dayPts },
                { label: "Week", value: weekPts },
                { label: "Month", value: monthPts },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center justify-center bg-slate-50 rounded-xl py-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                  <p className="text-5xl font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Production Stage Breakdown */}
        <ProductionStatsPanel items={productionItems} />

      </div>

      <ProjectForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}