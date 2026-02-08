import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import StatsCard from "../components/dashboard/StatsCard";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectFilters from "../components/projects/ProjectFilters";
import ProjectForm from "../components/projects/ProjectForm";

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

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !filters.search ||
      p.project_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "all" || p.status === filters.status;
    const matchesType = filters.type === "all" || p.project_type === filters.type;
    const matchesPriority = filters.priority === "all" || p.priority === filters.priority;
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => !["completed", "on_hold", "inquiry"].includes(p.status)
  ).length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const urgentProjects = projects.filter(
    (p) => p.priority === "urgent" && p.status !== "completed"
  ).length;

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
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1">Manage your cabinet projects</p>
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

        {/* Stats */}
        {getSectionVisibility("stats") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Projects"
              value={totalProjects}
              icon={Briefcase}
            />
            <StatsCard
              title="Active"
              value={activeProjects}
              icon={Clock}
              subtitle="In progress"
            />
            <StatsCard
              title="Completed"
              value={completedProjects}
              icon={CheckCircle}
            />
            <StatsCard
              title="Urgent"
              value={urgentProjects}
              icon={AlertTriangle}
              className={urgentProjects > 0 ? "border-l-4 border-l-amber-500" : ""}
            />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <ProjectFilters filters={filters} setFilters={setFilters} onClear={clearFilters} />
        </div>



        {/* Projects Grid */}
        {getSectionVisibility("projects") && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No projects found</h3>
                <p className="text-slate-500 mb-4">
                  {projects.length === 0
                    ? "Get started by creating your first project"
                    : "Try adjusting your filters"}
                </p>
                {projects.length === 0 && (
                  <Button onClick={() => setShowForm(true)} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
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