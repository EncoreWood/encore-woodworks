import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus, Briefcase,
  Users, CheckCircle2, Trash2, Sparkles, Hammer, AlertTriangle, ArrowRight, Clock
} from "lucide-react";
import {
  format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, addDays, isWithinInterval, startOfDay
} from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ProjectForm from "../components/projects/ProjectForm";

const statusConfig = {
  inquiry:           { label: "Inquiry",        short: "INQ",  color: "bg-slate-700" },
  side_projects:     { label: "Side Project",   short: "SIDE", color: "bg-slate-700" },
  quoted:            { label: "Quoted",          short: "QTD",  color: "bg-blue-500" },
  approved:          { label: "Approved",        short: "APR",  color: "bg-emerald-500" },
  in_design:         { label: "In Design",       short: "DES",  color: "bg-violet-500" },
  in_production:     { label: "In Production",   short: "PRD",  color: "bg-amber-500" },
  ready_for_install: { label: "Ready",           short: "RDY",  color: "bg-cyan-500" },
  installing:        { label: "Installing",      short: "INST", color: "bg-orange-500" },
  completed:         { label: "Completed",       short: "DONE", color: "bg-emerald-600" },
  on_hold:           { label: "On Hold",         short: "HOLD", color: "bg-red-500" },
};

const parseLocalDate = (dateStr) => new Date(dateStr + "T00:00:00");
const TODAY = startOfDay(new Date());

const isProjectOverdue = (project) => {
  if (!project.estimated_completion) return false;
  if (project.status === "completed") return false;
  return parseLocalDate(project.estimated_completion) < TODAY;
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState(null);
  const [formData, setFormData] = useState({});
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewType, setViewType] = useState("month");
  const queryClient = useQueryClient();

  const filterOptions = [
    { id: "all", label: "All Events", icon: "📅" },
    { id: "projects", label: "Projects", icon: "💼" },
    { id: "meetings", label: "Design Meetings", icon: "👥" },
    { id: "tasks", label: "Tasks", icon: "✓" },
    { id: "presenter", label: "Presenters", icon: "👤" },
    { id: "cleaning", label: "Cleaning", icon: "✨" },
    { id: "vacations", label: "Vacations", icon: "🏖️" }
  ];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });
  const { data: presenters = [] } = useQuery({ queryKey: ["presenters"], queryFn: () => base44.entities.MeetingPresenter.list() });
  const { data: designMeetings = [] } = useQuery({ queryKey: ["designMeetings"], queryFn: () => base44.entities.DesignMeeting.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => base44.entities.MeetingTask.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: () => base44.entities.Contact.list() });
  const { data: bathroomCleanings = [] } = useQuery({ queryKey: ["bathroomCleanings"], queryFn: () => base44.entities.BathroomCleaning.list() });
  const { data: vacations = [] } = useQuery({ queryKey: ["vacations"], queryFn: () => base44.entities.Vacation.list() });

  const createPresenterMutation = useMutation({
    mutationFn: async (data) => {
      const r = await base44.entities.MeetingPresenter.create(data);
      try { await base44.functions.invoke('syncToGoogleCalendar', { type: 'presenter', data }); } catch(e) {}
      return r;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["presenters"] }); setShowAddDialog(false); setFormData({}); }
  });

  const createDesignMeetingMutation = useMutation({
    mutationFn: async (data) => {
      const r = await base44.entities.DesignMeeting.create(data);
      try { await base44.functions.invoke('syncToGoogleCalendar', { type: 'designMeeting', data }); } catch(e) {}
      return r;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["designMeetings"] }); setShowAddDialog(false); setFormData({}); }
  });

  const createBathroomCleaningMutation = useMutation({
    mutationFn: (data) => base44.entities.BathroomCleaning.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bathroomCleanings"] }); setShowAddDialog(false); setFormData({}); }
  });

  const createVacationMutation = useMutation({
    mutationFn: (data) => base44.entities.Vacation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vacations"] }); setShowAddDialog(false); setFormData({}); }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const r = await base44.entities.Project.create(data);
      try { await base44.functions.invoke('syncToGoogleCalendar', { type: 'project', data }); } catch(e) {}
      return r;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowProjectForm(false); setEditingProject(null); }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const r = await base44.entities.Project.update(id, data);
      try { await base44.functions.invoke('syncToGoogleCalendar', { type: 'project', data }); } catch(e) {}
      return r;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowProjectForm(false); setEditingProject(null); }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const r = await base44.entities.MeetingTask.create(data);
      try { await base44.functions.invoke('syncToGoogleCalendar', { type: 'task', data }); } catch(e) {}
      return r;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setNewTask(""); }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const handleOpenAdd = (type) => {
    const defaultDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    setAddType(type);
    setFormData({ date: defaultDate });
    if (type === "project") { setEditingProject({ start_date: defaultDate }); setShowProjectForm(true); }
    else setShowAddDialog(true);
  };

  const handleSubmitAdd = () => {
    if (addType === "presenter" && formData.presenter_name) createPresenterMutation.mutate(formData);
    else if (addType === "designMeeting" && formData.client_name) createDesignMeetingMutation.mutate(formData);
    else if (addType === "bathroomCleaning" && formData.assigned_to?.length > 0) createBathroomCleaningMutation.mutate(formData);
    else if (addType === "vacation" && formData.employee_id && formData.start_date && formData.end_date) {
      const employee = employees.find(e => e.id === formData.employee_id);
      createVacationMutation.mutate({ employee_id: formData.employee_id, employee_name: employee?.full_name || "", start_date: formData.start_date, end_date: formData.end_date, status: "approved", notes: formData.notes || undefined });
    } else if (addType === "task" && formData.task) {
      createTaskMutation.mutate({ task: formData.task, date: formData.date, assignee: formData.assignee || undefined, completed: false });
      setShowAddDialog(false); setFormData({});
    }
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      const dateToUse = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      createTaskMutation.mutate({ task: newTask.trim(), date: dateToUse, completed: false });
    }
  };

  const handleSubmitProject = (data) => {
    if (editingProject?.id) updateProjectMutation.mutate({ id: editingProject.id, data });
    else createProjectMutation.mutate(data);
  };

  // --- Data helpers ---
  const getPresenterForDate = (date) => presenters.find(p => p.date === format(date, "yyyy-MM-dd"));
  const getDesignMeetingsForDate = (date) => designMeetings.filter(m => m.date === format(date, "yyyy-MM-dd"));
  const getTasksForDate = (date) => tasks.filter(t => t.date === format(date, "yyyy-MM-dd"));
  const getBathroomCleaningsForDate = (date) => bathroomCleanings.filter(c => c.date === format(date, "yyyy-MM-dd"));
  const getVacationsForDate = (date) => vacations.filter(v => isWithinInterval(date, { start: new Date(v.start_date), end: new Date(v.end_date) }));

  const getProjectsSpanningDate = (date) => projects.filter((p) => {
    const s = p.start_date ? parseLocalDate(p.start_date) : null;
    const e = p.estimated_completion ? parseLocalDate(p.estimated_completion) : null;
    if (!s || !e) return false;
    return isWithinInterval(date, { start: s, end: e });
  });

  const getInstallProjectsSpanningDate = (date) => projects.filter((p) => {
    const s = p.install_start_date ? parseLocalDate(p.install_start_date) : null;
    const e = p.install_end_date ? parseLocalDate(p.install_end_date) : null;
    if (!s || !e) return false;
    return isWithinInterval(date, { start: s, end: e });
  });

  const getActiveProjectsForDay = (date) => {
    const spanning = getProjectsSpanningDate(date);
    const installSpanning = getInstallProjectsSpanningDate(date);
    const all = [...spanning];
    installSpanning.forEach(p => { if (!all.find(x => x.id === p.id)) all.push(p); });
    return all;
  };

  // --- Computed ---
  const todayActiveProjects = getActiveProjectsForDay(TODAY);
  const todayInstalls = getInstallProjectsSpanningDate(TODAY);
  const overdueProjects = projects.filter(p => isProjectOverdue(p));
  const todayNextActions = projects.filter(p => p.next_action_due && isSameDay(parseLocalDate(p.next_action_due), TODAY) && !todayActiveProjects.find(a => a.id === p.id));
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + 1));

  const getDateRange = () => {
    switch (viewType) {
      case "week": return { start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) };
      case "3months": return { start: startOfMonth(currentMonth), end: endOfMonth(addMonths(currentMonth, 2)) };
      case "6months": return { start: startOfMonth(currentMonth), end: endOfMonth(addMonths(currentMonth, 5)) };
      case "year": return { start: startOfMonth(currentMonth), end: endOfMonth(addMonths(currentMonth, 11)) };
      default: return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
    }
  };
  const { start: monthStart, end: monthEnd } = getDateRange();

  const projectsInMonth = projects.filter((p) => {
    const s = p.start_date ? parseLocalDate(p.start_date) : null;
    const e = p.estimated_completion ? parseLocalDate(p.estimated_completion) : null;
    return (s && s >= monthStart && s <= monthEnd) || (e && e >= monthStart && e <= monthEnd);
  });

  // Shared pill renderer
  const renderDayContent = (date, isSmall = false) => {
    const presenter = getPresenterForDate(date);
    const spanningProjects = getProjectsSpanningDate(date);
    const installProjects = getInstallProjectsSpanningDate(date);
    const meetingCount = getDesignMeetingsForDate(date).length;
    const taskCount = getTasksForDate(date).length;
    const cleaningCount = getBathroomCleaningsForDate(date).length;
    const pillH = isSmall ? "h-3.5" : "h-4";
    const pillFont = isSmall ? "text-[8px]" : "text-[9px]";
    const maxP = isSmall ? 2 : 3;
    const maxI = isSmall ? 1 : 2;

    return (
      <div className="w-full h-full flex flex-col p-2 relative">
        <div className={`${isSmall ? "text-sm" : "text-base"} font-semibold mb-auto flex items-center justify-between z-10`}>
          {format(date, "d")}
          {presenter && (activeFilter === "all" || activeFilter === "presenter") && (
            <User className="w-3 h-3 text-blue-600" />
          )}
        </div>
        <div className="absolute bottom-2 left-0 right-0 px-1 flex flex-col gap-0.5">
          {(activeFilter === "all" || activeFilter === "projects") && spanningProjects.slice(0, maxP).map((project) => {
            const overdue = isProjectOverdue(project);
            const sc = statusConfig[project.status];
            const bgClass = overdue ? "bg-red-600" : (project.status === "side_projects" ? "" : (!project.card_color ? (sc?.color || "bg-slate-400") : ""));
            const bgStyle = overdue ? {} : (project.status === "side_projects" ? { backgroundColor: "#374151" } : (project.card_color ? { backgroundColor: project.card_color } : {}));
            return (
              <div key={project.id} className={`${pillH} rounded-sm flex items-center px-1 overflow-hidden gap-0.5 ${bgClass}`} style={bgStyle} title={project.project_name}>
                {overdue
                  ? <AlertTriangle className="w-2 h-2 text-white flex-shrink-0" />
                  : sc?.short && <span className="text-white text-[6px] font-bold opacity-80 flex-shrink-0">{sc.short}·</span>
                }
                <span className={`text-white ${pillFont} font-medium truncate leading-none`} style={{ textShadow: "0 0 3px rgba(0,0,0,0.5)" }}>{project.project_name}</span>
              </div>
            );
          })}
          {(activeFilter === "all" || activeFilter === "projects") && installProjects.slice(0, maxI).map((project) => {
            const bgClass = project.status === "side_projects" ? "" : (!project.card_color ? (statusConfig[project.status]?.color || "bg-slate-400") : "");
            const bgStyle = project.status === "side_projects" ? { backgroundColor: "#374151" } : (project.card_color ? { backgroundColor: project.card_color } : {});
            return (
              <div key={"i-" + project.id} className={`${pillH} rounded-sm flex items-center gap-0.5 px-1 overflow-hidden ${bgClass}`} style={bgStyle} title={"Install: " + project.project_name}>
                <Hammer className="w-2 h-2 text-white flex-shrink-0" style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }} />
                <span className={`text-white ${pillFont} font-medium truncate leading-none`} style={{ textShadow: "0 0 3px rgba(0,0,0,0.5)" }}>{project.project_name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-0.5 flex-wrap mt-0.5 relative z-10">
          {meetingCount > 0 && (activeFilter === "all" || activeFilter === "meetings") && (
            <div className="text-[9px] px-1 py-0.5 bg-violet-500 text-white rounded font-medium">{meetingCount}M</div>
          )}
          {taskCount > 0 && (activeFilter === "all" || activeFilter === "tasks") && (
            <div className="text-[9px] px-1 py-0.5 bg-purple-500 text-white rounded font-medium">{taskCount}T</div>
          )}
          {cleaningCount > 0 && (activeFilter === "all" || activeFilter === "cleaning") && (
            <div className="text-[9px] px-1 py-0.5 bg-cyan-500 text-white rounded font-medium">{cleaningCount}C</div>
          )}
        </div>
      </div>
    );
  };

  const AddDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenAdd("presenter")}><User className="w-4 h-4 mr-2" />Meeting Presenter</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenAdd("task")}><CheckCircle2 className="w-4 h-4 mr-2" />Task</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenAdd("project")}><Briefcase className="w-4 h-4 mr-2" />New Project</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenAdd("designMeeting")}><Users className="w-4 h-4 mr-2" />Design Meeting</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenAdd("bathroomCleaning")}><Sparkles className="w-4 h-4 mr-2" />Bathroom Cleaning</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenAdd("vacation")}><CalendarIcon className="w-4 h-4 mr-2" />Vacation</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-500">Loading calendar...</div></div>;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b border-slate-200 bg-white/40 backdrop-blur-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track active projects, installs, and deadlines</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex gap-1.5">
            {filterOptions.map((filter) => (
              <Button key={filter.id} variant={activeFilter === filter.id ? "default" : "outline"} size="sm"
                onClick={() => setActiveFilter(filter.id)}
                className={`text-xs ${activeFilter === filter.id ? "bg-amber-600 hover:bg-amber-700" : ""}`}
              >
                <span className="mr-0.5">{filter.icon}</span>
              </Button>
            ))}
          </div>
          <div className="border-l border-slate-200 mx-1" />
          <div className="flex gap-1.5">
            {[{ id: "week", label: "W" }, { id: "month", label: "M" }, { id: "3months", label: "3M" }, { id: "6months", label: "6M" }, { id: "year", label: "Y" }].map((view) => (
              <Button key={view.id} variant={viewType === view.id ? "default" : "outline"} size="sm"
                onClick={() => setViewType(view.id)}
                className={`text-xs ${viewType === view.id ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column (35%) */}
        <div className="w-[35%] border-r border-slate-300 bg-white overflow-y-auto flex flex-col">

        {/* ── TODAY'S FOCUS PANEL ── */}
        <Card className="mb-4 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-lg">Today's Focus — {format(TODAY, "EEEE, MMMM d")}</h2>
            {overdueProjects.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 bg-red-700 text-white text-sm font-semibold px-3 py-1 rounded-full">
                <AlertTriangle className="w-4 h-4" />
                {overdueProjects.length} Overdue
              </div>
            )}
          </div>
          <div className="p-5">
            {todayActiveProjects.length === 0 && todayNextActions.length === 0 && overdueProjects.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Nothing active today — clear schedule!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayActiveProjects.map((project) => {
                  const overdue = isProjectOverdue(project);
                  const isInstall = todayInstalls.some(p => p.id === project.id);
                  const sc = statusConfig[project.status];
                  return (
                    <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className={`block p-4 rounded-xl border-2 transition-all hover:shadow-md ${overdue ? "border-red-300 bg-red-50 hover:border-red-400" : "border-slate-200 bg-white hover:border-amber-300"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {isInstall && <Hammer className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                          {overdue && !isInstall && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          <span className={`font-semibold text-sm truncate ${overdue ? "text-red-700" : "text-slate-900"}`}>{project.project_name}</span>
                        </div>
                        <Badge className={`text-xs border-0 flex-shrink-0 text-white ${overdue ? "bg-red-600" : (sc?.color || "bg-slate-500")}`}>
                          {overdue ? "OVERDUE" : (sc?.label || project.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{project.client_name || project.contractor?.name || "—"}</p>
                      {project.next_action && (
                        <div className="flex items-start gap-1.5 pt-2 border-t border-slate-100">
                          <ArrowRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${overdue ? "text-red-500" : "text-amber-600"}`} />
                          <div>
                            <p className="text-xs text-slate-700">{project.next_action}</p>
                            {project.next_action_owner && <p className="text-xs text-slate-400 mt-0.5">→ {project.next_action_owner}</p>}
                          </div>
                        </div>
                      )}
                      {overdue && project.estimated_completion && (
                        <p className="text-xs text-red-600 font-semibold mt-1.5">Due: {format(parseLocalDate(project.estimated_completion), "MMM d, yyyy")}</p>
                      )}
                    </Link>
                  );
                })}
                {todayNextActions.map((project) => {
                  const sc = statusConfig[project.status];
                  return (
                    <Link key={"na-" + project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className="block p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="font-semibold text-sm truncate text-slate-900">{project.project_name}</span>
                        </div>
                        <Badge className={`text-xs border-0 flex-shrink-0 text-white ${sc?.color || "bg-slate-500"}`}>{sc?.label || project.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{project.client_name || project.contractor?.name || "—"}</p>
                      {project.next_action && (
                        <div className="flex items-start gap-1.5 pt-2 border-t border-blue-100">
                          <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
                          <div>
                            <p className="text-xs text-slate-700">{project.next_action}</p>
                            {project.next_action_owner && <p className="text-xs text-slate-400 mt-0.5">→ {project.next_action_owner}</p>}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* ── NEXT 7 DAYS STRIP ── */}
        <Card className="mb-6 border-0 shadow-lg p-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Next 7 Days</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {next7Days.map((day) => {
              const spanning = getProjectsSpanningDate(day);
              const installs = getInstallProjectsSpanningDate(day);
              const deadlines = projects.filter(p => p.estimated_completion && isSameDay(parseLocalDate(p.estimated_completion), day));
              const nextActions = projects.filter(p => p.next_action_due && isSameDay(parseLocalDate(p.next_action_due), day));
              const isWeekend = [0, 6].includes(day.getDay());
              const isSelected = selectedDate && isSameDay(selectedDate, day);

              return (
                <button key={format(day, "yyyy-MM-dd")} onClick={() => { setSelectedDate(day); setCurrentMonth(day); }}
                  className={`flex-shrink-0 w-32 p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${isSelected ? "border-amber-400 bg-amber-50" : isWeekend ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200 bg-white hover:border-amber-200"}`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{format(day, "EEE")}</div>
                  <div className="text-2xl font-bold text-slate-900 leading-none my-0.5">{format(day, "d")}</div>
                  <div className="text-[10px] text-slate-400 mb-2">{format(day, "MMM")}</div>
                  {spanning.length === 0 && installs.length === 0 && deadlines.length === 0 && nextActions.length === 0 ? (
                    <div className="text-[10px] text-slate-300">Free</div>
                  ) : (
                    <div className="space-y-0.5">
                      {spanning.length > 0 && <div className="text-[10px] font-medium text-slate-600">{spanning.length} project{spanning.length > 1 ? "s" : ""}</div>}
                      {installs.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                          <Hammer className="w-2.5 h-2.5" />{installs.length} install{installs.length > 1 ? "s" : ""}
                        </div>
                      )}
                      {deadlines.length > 0 && <div className="text-[10px] text-red-600 font-medium">⚑ {deadlines.length} deadline{deadlines.length > 1 ? "s" : ""}</div>}
                      {nextActions.length > 0 && <div className="text-[10px] text-blue-600 font-medium">→ {nextActions.length} action{nextActions.length > 1 ? "s" : ""}</div>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── CALENDAR ── */}
        <Card className="p-6 bg-white border-0 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {viewType === "week" && format(startOfWeek(currentMonth), "MMM d") + " – " + format(endOfWeek(currentMonth), "MMM d, yyyy")}
              {viewType === "month" && format(currentMonth, "MMMM yyyy")}
              {viewType === "3months" && format(currentMonth, "MMMM yyyy") + " – " + format(addMonths(currentMonth, 2), "MMMM yyyy")}
              {viewType === "6months" && format(currentMonth, "MMMM yyyy") + " – " + format(addMonths(currentMonth, 5), "MMMM yyyy")}
              {viewType === "year" && format(currentMonth, "yyyy")}
            </h2>
            <div className="flex gap-2">
              <AddDropdown />
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <style>{`
            .rdp-day { position: relative; height: ${viewType === "week" ? "120px" : viewType === "month" ? "100px" : "56px"}; }
            .rdp-day_button { width: 100%; height: 100%; }
            .rdp-month { width: 100%; }
            .rdp-months {
              ${(viewType === "3months" || viewType === "6months") ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;" : ""}
              ${viewType === "year" ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.5rem;" : ""}
            }
          `}</style>

          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { if (date) setSelectedDate(date); }}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            numberOfMonths={viewType === "3months" ? 3 : viewType === "6months" ? 6 : viewType === "year" ? 12 : 1}
            disabled={viewType === "week" ? (date) => {
              const ws = startOfWeek(currentMonth); const we = endOfWeek(currentMonth);
              return date < ws || date > we;
            } : undefined}
            className="w-full"
            classNames={{
              months: "w-full",
              month: "w-full",
              table: "w-full border-collapse table-fixed",
              head_cell: viewType === "month" || viewType === "week" ? "text-slate-600 font-semibold text-sm py-3 w-[14.28%]" : "text-slate-500 font-semibold text-xs py-2 w-[14.28%]",
              cell: "relative p-0 text-center border border-slate-200 w-[14.28%] bg-slate-100",
              day: "relative w-full p-0 font-normal hover:bg-amber-50 transition-colors bg-white",
              day_selected: "bg-amber-100 text-amber-900 font-semibold",
              day_today: "bg-blue-50 font-bold ring-2 ring-inset ring-blue-400",
              day_outside: "text-slate-300 opacity-40 bg-slate-50"
            }}
            components={{
              DayContent: ({ date }) => renderDayContent(date, viewType !== "month" && viewType !== "week")
            }}
          />

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-600" /><span className="text-slate-600">Overdue</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span className="text-slate-600">Active Project</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-500 flex items-center justify-center"><Hammer className="w-2 h-2 text-white" /></div><span className="text-slate-600">Install</span></div>
            <div className="flex items-center gap-1.5"><div className="px-1 py-0 bg-violet-500 text-white rounded text-[9px]">M</div><span className="text-slate-600">Meeting</span></div>
            <div className="flex items-center gap-1.5"><div className="px-1 py-0 bg-purple-500 text-white rounded text-[9px]">T</div><span className="text-slate-600">Task</span></div>
            <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-600" /><span className="text-slate-600">Presenter</span></div>
          </div>
        </Card>

        {/* ── INFO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Day Detail Panel */}
          <Card className="p-6 bg-white border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedDate
                  ? isSameDay(selectedDate, TODAY)
                    ? <>Today <span className="text-slate-400 font-normal text-base">· {format(selectedDate, "MMM d, yyyy")}</span></>
                    : format(selectedDate, "EEEE, MMM d, yyyy")
                  : "Today"}
              </h2>
              <AddDropdown />
            </div>

            {(() => {
              const date = selectedDate || TODAY;
              const activeProjects = getActiveProjectsForDay(date);
              const installsOnDay = getInstallProjectsSpanningDate(date);
              const presenter = getPresenterForDate(date);
              const meetings = getDesignMeetingsForDate(date);
              const cleanings = getBathroomCleaningsForDate(date);
              const vacs = getVacationsForDate(date);
              const dayTasks = getTasksForDate(date);
              const isEmpty = !presenter && activeProjects.length === 0 && meetings.length === 0 && cleanings.length === 0 && vacs.length === 0 && dayTasks.length === 0;

              return (
                <div className="space-y-3">
                  {presenter && (activeFilter === "all" || activeFilter === "presenter") && (
                    <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                      <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800">Morning Meeting Presenter</p>
                        <p className="text-sm text-blue-700">{presenter.presenter_name}</p>
                      </div>
                    </div>
                  )}

                  {(activeFilter === "all" || activeFilter === "projects") && activeProjects.map((project) => {
                    const overdue = isProjectOverdue(project);
                    const isInstall = installsOnDay.some(p => p.id === project.id);
                    const sc = statusConfig[project.status];
                    return (
                      <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                        className={`block p-4 rounded-lg border-l-4 transition-all hover:shadow-sm ${overdue ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50 hover:bg-amber-100"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {isInstall && <Hammer className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                            {overdue && !isInstall && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                            <span className={`font-semibold text-sm truncate ${overdue ? "text-red-800" : "text-slate-900"}`}>{project.project_name}</span>
                          </div>
                          <Badge className={`text-xs border-0 flex-shrink-0 text-white ${overdue ? "bg-red-600" : (sc?.color || "bg-slate-500")}`}>
                            {overdue ? "OVERDUE" : (sc?.label || project.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{project.client_name || project.contractor?.name || "—"}</p>
                        {isInstall && project.install_start_date && (
                          <p className="text-xs font-medium text-orange-600 mt-1">
                            Install: {format(parseLocalDate(project.install_start_date), "MMM d")}{project.install_end_date ? ` – ${format(parseLocalDate(project.install_end_date), "MMM d")}` : ""}
                          </p>
                        )}
                        {project.next_action && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-start gap-1.5">
                            <ArrowRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${overdue ? "text-red-500" : "text-amber-600"}`} />
                            <div>
                              <p className="text-xs text-slate-700">{project.next_action}</p>
                              {project.next_action_owner && <p className="text-xs text-slate-400 mt-0.5">→ {project.next_action_owner}</p>}
                            </div>
                          </div>
                        )}
                        {overdue && project.estimated_completion && (
                          <p className="text-xs text-red-600 font-semibold mt-1">Due: {format(parseLocalDate(project.estimated_completion), "MMM d, yyyy")}</p>
                        )}
                      </Link>
                    );
                  })}

                  {(activeFilter === "all" || activeFilter === "meetings") && meetings.map((m) => (
                    <div key={m.id} className="p-3 bg-violet-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold text-violet-900 mb-1"><Users className="w-4 h-4" />Design Meeting</div>
                      <p className="text-sm text-violet-700">{m.client_name}</p>
                      {m.project_name && <p className="text-xs text-violet-600">{m.project_name}</p>}
                      {m.time && <p className="text-xs text-violet-500 mt-0.5">{m.time}</p>}
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "cleaning") && cleanings.map((c) => (
                    <div key={c.id} className="p-3 bg-cyan-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900 mb-1"><Sparkles className="w-4 h-4" />Bathroom Cleaning</div>
                      <p className="text-sm text-cyan-700">{c.assigned_to.join(", ")}</p>
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "vacations") && vacs.map((v) => (
                    <div key={v.id} className="p-3 bg-pink-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold text-pink-900 mb-1"><CalendarIcon className="w-4 h-4" />Vacation</div>
                      <p className="text-sm text-pink-700">{v.employee_name}</p>
                      <p className="text-xs text-pink-500 mt-0.5">{format(new Date(v.start_date), "MMM d")} – {format(new Date(v.end_date), "MMM d")}</p>
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "tasks") && (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Tasks</h3>
                      <div className="flex gap-2 mb-3">
                        <Input placeholder="New task..." value={newTask} onChange={(e) => setNewTask(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddTask()} className="text-sm" />
                        <Button size="sm" onClick={handleAddTask} disabled={!newTask.trim() || createTaskMutation.isPending} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-3 h-3" /></Button>
                      </div>
                      <div className="space-y-2">
                        {dayTasks.map((task) => (
                          <div key={task.id} className={`flex items-center gap-2 p-2 rounded border ${task.completed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"}`}>
                            <Checkbox checked={task.completed} onCheckedChange={() => updateTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } })} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                            <div className="flex-1">
                              <p className={`text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.task}</p>
                              {task.assignee && <p className="text-xs text-slate-500">{task.assignee}</p>}
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => deleteTaskMutation.mutate(task.id)} className="h-6 w-6 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isEmpty && <p className="text-sm text-slate-400 text-center py-6 italic">Nothing scheduled for this day</p>}
                </div>
              );
            })()}
          </Card>

          {/* This Month Projects */}
          <Card className="p-6 bg-white border-0 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">This Month ({projectsInMonth.length})</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {projectsInMonth.length === 0 ? (
                <p className="text-sm text-slate-500">No projects scheduled this month</p>
              ) : (
                projectsInMonth.map((project) => {
                  const overdue = isProjectOverdue(project);
                  const sc = statusConfig[project.status];
                  return (
                    <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className={`block p-3 rounded-lg border transition-all ${overdue ? "border-red-200 bg-red-50 hover:border-red-300" : "border-slate-100 hover:border-amber-200 hover:bg-amber-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {overdue && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                          <h3 className={`font-medium text-sm truncate ${overdue ? "text-red-800" : "text-slate-900"}`}>{project.project_name}</h3>
                        </div>
                        <Badge className={`text-xs border-0 flex-shrink-0 text-white ${overdue ? "bg-red-600" : (sc?.color || "bg-slate-500")}`}>
                          {overdue ? "OVERDUE" : (sc?.label || project.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-1.5">{project.client_name}</p>
                      <div className="space-y-0.5 text-xs text-slate-400">
                        {project.start_date && <div className="flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" />Start: {format(parseLocalDate(project.start_date), "MMM d")}</div>}
                        {project.estimated_completion && (
                          <div className={`flex items-center gap-1.5 ${overdue ? "text-red-600 font-semibold" : ""}`}>
                            <CalendarIcon className="w-3 h-3" />Due: {format(parseLocalDate(project.estimated_completion), "MMM d")}
                          </div>
                        )}
                        {project.install_start_date && (
                          <div className="flex items-center gap-1.5 text-orange-500">
                            <Hammer className="w-3 h-3" />Install: {format(parseLocalDate(project.install_start_date), "MMM d")}{project.install_end_date ? ` – ${format(parseLocalDate(project.install_end_date), "MMM d")}` : ""}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {addType === "presenter" && "Add Meeting Presenter"}
                {addType === "designMeeting" && "Add Design Meeting"}
                {addType === "task" && "Add Task"}
                {addType === "bathroomCleaning" && "Add Bathroom Cleaning"}
                {addType === "vacation" && "Add Vacation"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>

              {addType === "presenter" && (
                <>
                  <div>
                    <Label>Presenter Name</Label>
                    <Select value={formData.presenter_name || ""} onValueChange={(v) => setFormData({ ...formData, presenter_name: v })}>
                      <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Time</Label><Input type="time" value={formData.time || ""} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
                </>
              )}

              {addType === "designMeeting" && (
                <>
                  <div>
                    <Label>Client Name *</Label>
                    <div className="flex gap-2">
                      <Input value={formData.client_name || ""} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} placeholder="Enter client name" className="flex-1" />
                      {contacts.length > 0 && (
                        <Select value="" onValueChange={(id) => { const c = contacts.find(x => x.id === id); if (c) setFormData(p => ({ ...p, client_name: c.name })); }}>
                          <SelectTrigger className="w-36"><SelectValue placeholder="From contacts" /></SelectTrigger>
                          <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div><Label>Project Name</Label><Input value={formData.project_name || ""} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} placeholder="Enter project name" /></div>
                  <div><Label>Time</Label><Input type="time" value={formData.time || ""} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Meeting notes..." /></div>
                </>
              )}

              {addType === "task" && (
                <>
                  <div><Label>Task *</Label><Input value={formData.task || ""} onChange={(e) => setFormData({ ...formData, task: e.target.value })} placeholder="Enter task description" /></div>
                  <div><Label>Assign To</Label><Input value={formData.assignee || ""} onChange={(e) => setFormData({ ...formData, assignee: e.target.value })} placeholder="Person's name (optional)" /></div>
                </>
              )}

              {addType === "bathroomCleaning" && (
                <>
                  <div>
                    <Label>Assign To *</Label>
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                      {employees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2">
                          <Checkbox id={`c-${emp.id}`} checked={formData.assigned_to?.includes(emp.full_name) || false}
                            onCheckedChange={(checked) => {
                              const cur = formData.assigned_to || [];
                              setFormData({ ...formData, assigned_to: checked ? [...cur, emp.full_name] : cur.filter(n => n !== emp.full_name) });
                            }} />
                          <Label htmlFor={`c-${emp.id}`} className="cursor-pointer font-normal">{emp.full_name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." /></div>
                </>
              )}

              {addType === "vacation" && (
                <>
                  <div>
                    <Label>Employee *</Label>
                    <Select value={formData.employee_id || ""} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Start Date *</Label><Input type="date" value={formData.start_date || ""} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
                  <div><Label>End Date *</Label><Input type="date" value={formData.end_date || ""} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Vacation notes..." /></div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitAdd} disabled={
                  (addType === "presenter" && !formData.presenter_name) ||
                  (addType === "designMeeting" && !formData.client_name) ||
                  (addType === "task" && !formData.task) ||
                  (addType === "bathroomCleaning" && (!formData.assigned_to || formData.assigned_to.length === 0)) ||
                  (addType === "vacation" && (!formData.employee_id || !formData.start_date || !formData.end_date))
                }>Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ProjectForm
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
          onSubmit={handleSubmitProject}
          initialData={editingProject}
          isLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
        />
      </div>
    </div>
  );
}