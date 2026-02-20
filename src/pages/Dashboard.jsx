import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus, Briefcase, Clock, CheckCircle, AlertTriangle, Settings,
  DollarSign, Users, PauseCircle, TrendingUp, Home, Wrench, ArrowRight,
  Calendar
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ProjectForm from "../components/projects/ProjectForm";
import ProductionStatsPanel from "../components/dashboard/ProductionStatsPanel";
import WeatherWidget from "../components/dashboard/WeatherWidget";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek, startOfMonth } from "date-fns";

function StatBox({ label, value, subtitle, icon: Icon, onClick }) {
  return (
    <div
      className={`flex flex-col gap-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SectionCard({ title, link, linkLabel, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {link && (
          <Link to={link}>
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-800 text-xs">
              {linkLabel} <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectListDialog, setProjectListDialog] = useState(null);

  // Mountain Standard Time
  const MST_TZ = "America/Denver";
  const nowUtc = new Date();
  const now = new Date(nowUtc.toLocaleString("en-US", { timeZone: MST_TZ }));

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: dashboardSettings = [] } = useQuery({
    queryKey: ["dashboardSettings"],
    queryFn: () => base44.entities.DashboardSettings.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list("-updated_date", 200)
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DashboardSettings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboardSettings"] })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); }
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // PTS calculations — only from items in the "complete" stage, keyed by completed_date
  const getPtsFromItems = (items) => {
    return items.reduce((sum, item) => {
      return sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
    }, 0);
  };

  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const completedStageItems = productionItems.filter(i => i.stage === "complete");

  const dayPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date === todayStr));
  const weekPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date && new Date(i.completed_date) >= weekStart));
  const monthPts = getPtsFromItems(completedStageItems.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart));

  // Financial
  const totalEstimatedBudget = projects.reduce((sum, p) => sum + (p.estimated_budget || 0), 0);
  const totalDeposits = projects.reduce((sum, p) => sum + (p.deposit_paid || 0), 0);
  const completedProjectsValue = projects.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.actual_cost || p.estimated_budget || 0), 0);
  const receivable = totalEstimatedBudget - totalDeposits;

  // Projects
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => !["completed", "on_hold", "inquiry", "side_projects"].includes(p.status));
  const completedProjects = projects.filter(p => p.status === "completed");
  const onHoldProjects = projects.filter(p => p.status === "on_hold");
  const sideProjects = projects.filter(p => p.status === "inquiry" || p.status === "side_projects");

  // Breakdown
  const kitchenProjects = projects.filter(p => p.project_type === "kitchen").length;
  const bathroomProjects = projects.filter(p => p.project_type === "bathroom").length;
  const customProjects = projects.filter(p => p.project_type === "custom").length;
  const otherProjects = totalProjects - kitchenProjects - bathroomProjects - customProjects;

  const getSectionVisibility = (section) => {
    const setting = dashboardSettings.find(s => s.section === section);
    if (!setting) return true;
    return currentUser?.role === "admin" ? setting.visible_to_admins : setting.visible_to_users;
  };

  const handleToggleSectionVisibility = (section, role, value) => {
    const setting = dashboardSettings.find(s => s.section === section);
    if (!setting) return;
    const field = role === "admin" ? "visible_to_admins" : "visible_to_users";
    updateSettingMutation.mutate({ id: setting.id, data: { [field]: value } });
  };

  const inProductionProjects = projects.filter(p => p.status === "in_production");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
            <p className="text-slate-400 text-sm">Company overview</p>
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
            <div className="flex gap-2 mt-1">
              {currentUser?.role === "admin" && (
                <Button onClick={() => setShowSettings(true)} variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-1" /> New Project
              </Button>
            </div>
          </div>
        </div>

        {/* Top Row: Current Projects + PTS Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* In Production */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Projects</h3>
            <div className="space-y-2">
              {inProductionProjects.length === 0 ? (
                <p className="text-slate-400 text-sm">No active production projects</p>
              ) : (
                inProductionProjects.slice(0, 5).map(p => (
                  <Link key={p.id} to={createPageUrl("ProjectDetails") + "?id=" + p.id}>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.project_name}</p>
                        <p className="text-xs text-slate-400">{p.client_name}</p>
                      </div>
                      {p.estimated_completion && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{format(new Date(p.estimated_completion), "MMM d")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
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

        {getSectionVisibility("stats") && (
          <>
            {/* Financial Overview */}
            <SectionCard title="Financial Overview" link={createPageUrl("Invoicing")} linkLabel="View Invoicing Board">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBox label="Total Budget" value={`$${totalEstimatedBudget.toLocaleString()}`} icon={DollarSign} subtitle="All projects" />
                <StatBox label="Deposits Received" value={`$${totalDeposits.toLocaleString()}`} icon={TrendingUp} subtitle="Paid deposits" />
                <StatBox label="Receivable" value={`$${receivable.toLocaleString()}`} icon={AlertTriangle} subtitle="Outstanding" />
                <StatBox label="Completed Value" value={`$${completedProjectsValue.toLocaleString()}`} icon={CheckCircle} subtitle="Finished projects" />
              </div>
            </SectionCard>

            {/* Project Overview */}
            <SectionCard title="Project Overview" link={createPageUrl("Kanban")} linkLabel="View Projects Board">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatBox label="Total Projects" value={totalProjects} icon={Briefcase} subtitle="All time"
                  onClick={() => setProjectListDialog({ title: "All Projects", projects })} />
                <StatBox label="Active Projects" value={activeProjects.length} icon={Clock} subtitle="In progress"
                  onClick={() => setProjectListDialog({ title: "Active Projects", projects: activeProjects })} />
                <StatBox label="Completed" value={completedProjects.length} icon={CheckCircle} subtitle="Finished"
                  onClick={() => setProjectListDialog({ title: "Completed Projects", projects: completedProjects })} />
                <StatBox label="On Hold" value={onHoldProjects.length} icon={PauseCircle} subtitle="Paused"
                  onClick={() => setProjectListDialog({ title: "On Hold Projects", projects: onHoldProjects })} />
                <StatBox label="Side Projects" value={sideProjects.length} icon={Briefcase} subtitle="Inquiry"
                  onClick={() => setProjectListDialog({ title: "Side Projects", projects: sideProjects })} />
              </div>
            </SectionCard>

            {/* Production Stage Breakdown */}
            <ProductionStatsPanel items={productionItems} />
          </>
        )}
      </div>

      {/* Create Form */}
      <ProjectForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Project List Dialog */}
      <Dialog open={!!projectListDialog} onOpenChange={() => setProjectListDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{projectListDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {projectListDialog?.projects?.length > 0 ? (
              projectListDialog.projects.map(project => (
                <Link key={project.id} to={createPageUrl(`ProjectDetails?id=${project.id}`)} className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{project.project_name}</h4>
                      <p className="text-sm text-slate-500">{project.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700 capitalize">{project.status?.replace(/_/g, ' ')}</p>
                      {project.estimated_budget && <p className="text-sm text-slate-500">${project.estimated_budget.toLocaleString()}</p>}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">No projects found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dashboard Visibility Settings</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {["stats", "projects"].map(section => {
              const setting = dashboardSettings.find(s => s.section === section);
              return (
                <div key={section} className="space-y-3">
                  <h3 className="font-semibold text-slate-900 capitalize">{section}</h3>
                  <div className="space-y-2 ml-2">
                    <div className="flex items-center gap-3">
                      <Checkbox id={`users-${section}`} checked={setting?.visible_to_users ?? true}
                        onCheckedChange={v => handleToggleSectionVisibility(section, "user", v)} />
                      <Label htmlFor={`users-${section}`} className="cursor-pointer">Visible to Regular Users</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id={`admins-${section}`} checked={setting?.visible_to_admins ?? true}
                        onCheckedChange={v => handleToggleSectionVisibility(section, "admin", v)} />
                      <Label htmlFor={`admins-${section}`} className="cursor-pointer">Visible to Admins</Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}