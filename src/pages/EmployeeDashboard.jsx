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
import ProjectOrdersPanel from "@/components/dashboard/ProjectOrdersPanel";
import PtsOverviewCard from "@/components/dashboard/PtsOverviewCard";
import CleaningScheduleWidget from "@/components/dashboard/CleaningScheduleWidget";
import { format, startOfWeek, startOfMonth, subMonths } from "date-fns";

export default function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  const { data: dashboardSettings = [] } = useQuery({
    queryKey: ["dashboardSettings"],
    queryFn: () => base44.entities.DashboardSettings.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); }
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["productionItems"] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  // Use pts_logged (permanently recorded on first completion) for accurate tallies
  const getPtsFromItems = (items) =>
    items.reduce((sum, item) => {
      if (item.pts_logged != null) return sum + item.pts_logged;
      // Fallback for older items without pts_logged
      if (item.pts != null) return sum + item.pts;
      return sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
    }, 0);

  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  // Quarterly = rolling 4-month window (resets every 4 months from Jan: Jan-Apr, May-Aug, Sep-Dec)
  const currentMonth = now.getMonth(); // 0-indexed
  const quarterlyStartMonth = Math.floor(currentMonth / 4) * 4;
  const quarterlyStart = new Date(now.getFullYear(), quarterlyStartMonth, 1);

  const loggedItems = productionItems.filter(i => i.pts_logged_date != null);
  const dayPts = getPtsFromItems(loggedItems.filter(i => i.pts_logged_date === todayStr));
  const weekPts = getPtsFromItems(loggedItems.filter(i => i.pts_logged_date && new Date(i.pts_logged_date) >= weekStart));
  const monthPts = getPtsFromItems(loggedItems.filter(i => i.pts_logged_date && new Date(i.pts_logged_date) >= monthStart));
  const quarterlyPts = getPtsFromItems(loggedItems.filter(i => i.pts_logged_date && new Date(i.pts_logged_date) >= quarterlyStart));

  const inProductionProjects = projects.filter(p => p.status === "in_production");

  return (
    <div className="min-h-screen bg-slate-50">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Production Dashboard</h1>
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
          <TodayPanel inProductionProjects={inProductionProjects} />

          <PtsOverviewCard
            dayPts={dayPts}
            weekPts={weekPts}
            monthPts={monthPts}
            quarterlyPts={quarterlyPts}
            productionItems={productionItems}
            dashboardSettings={dashboardSettings}
            currentUser={currentUser}
            onSettingsUpdated={() => queryClient.invalidateQueries({ queryKey: ["dashboardSettings"] })}
          />
        </div>

        {/* Production Stage Breakdown */}
        <ProductionStatsPanel items={productionItems} />

        {/* Project Orders Status */}
        <ProjectOrdersPanel inProductionProjects={inProductionProjects} />

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