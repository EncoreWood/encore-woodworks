import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle, Settings, DollarSign, Users, PauseCircle, TrendingUp, Home, Wrench, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import StatsCard from "../components/dashboard/StatsCard";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectFilters from "../components/projects/ProjectFilters";
import ProjectForm from "../components/projects/ProjectForm";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    priority: "all"
  });

  const { data: projects = [], isLoading } = useQuery({
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

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DashboardSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardSettings"] });
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
    }
  });

  // Calculate comprehensive business stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => !["completed", "on_hold", "inquiry"].includes(p.status)
  ).length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const onHoldProjects = projects.filter((p) => p.status === "on_hold").length;
  
  // Financial calculations
  const totalEstimatedBudget = projects.reduce((sum, p) => sum + (p.estimated_budget || 0), 0);
  const totalDeposits = projects.reduce((sum, p) => sum + (p.deposit_paid || 0), 0);
  const completedProjectsValue = projects
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.actual_cost || p.estimated_budget || 0), 0);
  const receivable = totalEstimatedBudget - totalDeposits;
  
  // Project type breakdown
  const kitchenProjects = projects.filter((p) => p.project_type === "kitchen").length;
  const bathroomProjects = projects.filter((p) => p.project_type === "bathroom").length;
  const customProjects = projects.filter((p) => p.project_type === "custom").length;
  const otherProjects = totalProjects - kitchenProjects - bathroomProjects - customProjects;
  
  // Employee count
  const totalEmployees = employees.length;

  const clearFilters = () => {
    setFilters({ search: "", status: "all", type: "all", priority: "all" });
  };

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const getSectionVisibility = (section) => {
    const setting = dashboardSettings.find(s => s.section === section);
    if (!setting) return true;
    return currentUser?.role === "admin" ? setting.visible_to_admins : setting.visible_to_users;
  };

  const handleToggleSectionVisibility = (section, role, value) => {
    const setting = dashboardSettings.find(s => s.section === section);
    if (!setting) return;
    const field = role === "admin" ? "visible_to_admins" : "visible_to_users";
    updateSettingMutation.mutate({
      id: setting.id,
      data: { [field]: value }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-slate-500 mt-1">Company overview</p>
          </div>
          <div className="flex gap-2">
            {currentUser?.role === "admin" && (
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="icon"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => setShowForm(true)}
              className="bg-amber-600 hover:bg-amber-700 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Business Overview Stats */}
        {getSectionVisibility("stats") && (
          <>
            {/* Financial Overview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Financial Overview</h2>
                <Link to={createPageUrl("Invoicing")}>
                  <Button variant="outline" size="sm" className="gap-2">
                    View Invoicing Board
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Budget"
                  value={`$${totalEstimatedBudget.toLocaleString()}`}
                  icon={DollarSign}
                  subtitle="All projects"
                />
                <StatsCard
                  title="Deposits Received"
                  value={`$${totalDeposits.toLocaleString()}`}
                  icon={TrendingUp}
                  subtitle="Paid deposits"
                />
                <StatsCard
                  title="Receivable"
                  value={`$${receivable.toLocaleString()}`}
                  icon={AlertTriangle}
                  subtitle="Outstanding"
                  className="border-l-4 border-l-amber-500"
                />
                <StatsCard
                  title="Completed Value"
                  value={`$${completedProjectsValue.toLocaleString()}`}
                  icon={CheckCircle}
                  subtitle="Finished projects"
                />
              </div>
            </div>

            {/* Project Overview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Project Overview</h2>
                <Link to={createPageUrl("Kanban")}>
                  <Button variant="outline" size="sm" className="gap-2">
                    View Projects Board
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Projects"
                  value={totalProjects}
                  icon={Briefcase}
                  subtitle="All time"
                />
                <StatsCard
                  title="Active Projects"
                  value={activeProjects}
                  icon={Clock}
                  subtitle="In progress"
                />
                <StatsCard
                  title="Completed"
                  value={completedProjects}
                  icon={CheckCircle}
                  subtitle="Finished"
                />
                <StatsCard
                  title="On Hold"
                  value={onHoldProjects}
                  icon={PauseCircle}
                  subtitle="Paused"
                />
              </div>
            </div>

            {/* Project Types & Team */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatsCard
                  title="Kitchen Projects"
                  value={kitchenProjects}
                  icon={Home}
                />
                <StatsCard
                  title="Bathroom Projects"
                  value={bathroomProjects}
                  icon={Home}
                />
                <StatsCard
                  title="Custom Projects"
                  value={customProjects}
                  icon={Wrench}
                />
                <StatsCard
                  title="Other Projects"
                  value={otherProjects}
                  icon={Briefcase}
                />
                <StatsCard
                  title="Total Employees"
                  value={totalEmployees}
                  icon={Users}
                  subtitle="Current team"
                />
              </div>
            </div>
          </>
        )}





        {/* Create Form */}
        <ProjectForm
          open={showForm}
          onOpenChange={setShowForm}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />

        {/* Dashboard Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dashboard Visibility Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {["stats", "projects", "google_sheet"].map((section) => {
                const setting = dashboardSettings.find(s => s.section === section);
                const sectionLabel = section === "google_sheet" ? "Google Sheet" : section.charAt(0).toUpperCase() + section.slice(1);
                
                return (
                  <div key={section} className="space-y-3">
                    <h3 className="font-semibold text-slate-900">{sectionLabel}</h3>
                    <div className="space-y-2 ml-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`users-${section}`}
                          checked={setting?.visible_to_users ?? true}
                          onCheckedChange={(checked) => handleToggleSectionVisibility(section, "user", checked)}
                        />
                        <Label htmlFor={`users-${section}`} className="cursor-pointer">
                          Visible to Regular Users
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`admins-${section}`}
                          checked={setting?.visible_to_admins ?? true}
                          onCheckedChange={(checked) => handleToggleSectionVisibility(section, "admin", checked)}
                        />
                        <Label htmlFor={`admins-${section}`} className="cursor-pointer">
                          Visible to Admins
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}