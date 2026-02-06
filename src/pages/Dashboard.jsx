import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle, Play, Square } from "lucide-react";
import { format } from "date-fns";
import StatsCard from "../components/dashboard/StatsCard";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectFilters from "../components/projects/ProjectFilters";
import ProjectForm from "../components/projects/ProjectForm";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    priority: "all"
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
    }
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
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
    const fetchCurrentUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!clockInTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = now - clockInTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  const handleClockIn = () => {
    setClockInTime(new Date());
  };

  const handleClockOut = () => {
    if (!clockInTime || !currentUser) return;
    const employee = employees.find(e => e.user_email === currentUser.email);
    if (!employee) return;

    const now = new Date();
    const clockInStr = format(clockInTime, "HH:mm");
    const clockOutStr = format(now, "HH:mm");
    const [inH, inM] = clockInStr.split(":").map(Number);
    const [outH, outM] = clockOutStr.split(":").map(Number);
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    const hours = ((outMinutes - inMinutes) / 60).toFixed(2);

    createEntryMutation.mutate({
      employee_id: employee.id,
      employee_name: employee.full_name,
      date: format(new Date(), "yyyy-MM-dd"),
      clock_in: clockInStr,
      clock_out: clockOutStr,
      hours_worked: parseFloat(hours),
      entry_type: "work",
      notes: ""
    });

    setClockInTime(null);
    setElapsedTime("00:00:00");
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
          <Button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats */}
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

        {/* Clock In/Out - Users Only */}
        {currentUser?.role === "user" && (
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Work Time</h3>
                <p className="text-sm text-slate-600">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
              {clockInTime ? (
                <Button
                  onClick={handleClockOut}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Clock Out ({elapsedTime})
                </Button>
              ) : (
                <Button
                  onClick={handleClockIn}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Clock In
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="mb-6">
          <ProjectFilters filters={filters} setFilters={setFilters} onClear={clearFilters} />
        </div>

        {/* Google Sheet */}
        <Card className="mb-6 p-0 overflow-hidden">
          <iframe
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vRYO-e9zoCc7ECYLs_uT5l22Erc-ADwyIQTu8TP400oGYrA_ghl-nh4hqch_aVbectqPY5UIlE0pS8d/pubhtml?widget=true&amp;headers=false"
            className="w-full h-[600px] border-0"
            title="Project Sheet"
          />
        </Card>

        {/* Projects Grid */}
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

        {/* Create Form */}
        <ProjectForm
          open={showForm}
          onOpenChange={setShowForm}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}