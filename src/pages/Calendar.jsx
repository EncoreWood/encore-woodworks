import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
  const { data: cleaningSchedules = [] } = useQuery({ queryKey: ["cleaningSchedules"], queryFn: () => base44.entities.CleaningSchedule.list() });

  const [showCleaningDialog, setShowCleaningDialog] = useState(false);
  const [showCleaningManager, setShowCleaningManager] = useState(false);
  const [cleaningWeekStart, setCleaningWeekStart] = useState("");
  const [cleaningAssignees, setCleaningAssignees] = useState([]);
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [autoRotateCount, setAutoRotateCount] = useState(4);
  const [editingSchedule, setEditingSchedule] = useState(null);

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

  const createCleaningScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.CleaningSchedule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] })
  });

  const deleteCleaningScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.CleaningSchedule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] })
  });

  const updateCleaningScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CleaningSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] }); setEditingSchedule(null); }
  });

  const handleGenerateRotatingSchedule = () => {
    if (!cleaningWeekStart || cleaningAssignees.length === 0) return;
    const startDate = new Date(cleaningWeekStart + "T00:00:00");
    const promises = [];
    for (let i = 0; i < autoRotateCount; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + i * 7);
      const weekStr = format(weekDate, "yyyy-MM-dd");
      // Rotate assignees: each week picks next person in list
      const assigneeIndex = i % cleaningAssignees.length;
      promises.push(createCleaningScheduleMutation.mutateAsync({
        week_start: weekStr,
        assigned_to: [cleaningAssignees[assigneeIndex]],
        notes: cleaningNotes || undefined
      }));
    }
    Promise.all(promises).then(() => {
      setShowCleaningDialog(false);
      setCleaningWeekStart("");
      setCleaningAssignees([]);
      setCleaningNotes("");
    });
  };

  const getCleaningScheduleForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    // Find schedule where this date falls within Monday-Sunday of the week_start
    return cleaningSchedules.filter(cs => {
      if (!cs.week_start) return false;
      const ws = new Date(cs.week_start + "T00:00:00");
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      const d = new Date(dateStr + "T00:00:00");
      return d >= ws && d <= we;
    });
  };

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

  // Build weeks for month grid
  const buildWeeks = (monthDate) => {
    const start = startOfWeek(startOfMonth(monthDate));
    const end = endOfWeek(endOfMonth(monthDate));
    const weeks = [];
    let day = start;
    while (day <= end) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const renderMonthGrid = () => {
    const monthsToRender = viewType === "3months" ? 3 : viewType === "6months" ? 6 : viewType === "year" ? 12 : 1;
    const monthDates = Array.from({ length: monthsToRender }, (_, i) => addMonths(currentMonth, i));
    const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="space-y-6">
        {monthDates.map((monthDate, mi) => {
          const weeks = buildWeeks(monthDate);
          return (
            <div key={mi}>
              {monthsToRender > 1 && (
                <div className="text-sm font-bold text-slate-700 mb-2">{format(monthDate, "MMMM yyyy")}</div>
              )}
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    {DAY_HEADERS.map(d => (
                      <th key={d} className="border border-slate-200 bg-slate-100 text-slate-600 font-semibold text-xs py-2 text-center w-[14.285%]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((date) => {
                        const isOutside = date.getMonth() !== monthDate.getMonth();
                        const isToday = isSameDay(date, TODAY);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                        let cellBg = "bg-white";
                        if (isSelected) cellBg = "bg-amber-100";
                        else if (isToday) cellBg = "bg-blue-50";
                        else if (isOutside) cellBg = "bg-slate-50";
                        return (
                          <td
                            key={format(date, "yyyy-MM-dd")}
                            className={`border border-slate-200 align-top ${cellBg} ${isOutside ? "opacity-40" : ""} ${isToday ? "ring-2 ring-inset ring-blue-400" : ""} cursor-pointer hover:bg-amber-50 transition-colors`}
                            style={{ minHeight: "140px" }}
                            onClick={() => { setSelectedDate(date); setCurrentMonth(date); }}
                          >
                            {renderDayContent(date)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  // Shared pill renderer
  const renderDayContent = (date) => {
    const presenter = getPresenterForDate(date);
    const spanningProjects = getProjectsSpanningDate(date);
    const installProjects = getInstallProjectsSpanningDate(date);
    const meetingCount = getDesignMeetingsForDate(date).length;
    const taskCount = getTasksForDate(date).length;
    const cleaningCount = getBathroomCleaningsForDate(date).length + getCleaningScheduleForDate(date).length;

    return (
      <div className="w-full flex flex-col gap-0.5 p-1.5" style={{ minHeight: "140px" }}>
        <div className="text-sm font-semibold flex items-center justify-between mb-1">
          <span>{format(date, "d")}</span>
          {presenter && (activeFilter === "all" || activeFilter === "presenter") && (
            <User className="w-3 h-3 text-blue-600" />
          )}
        </div>
        {(activeFilter === "all" || activeFilter === "projects") && spanningProjects.map((project) => {
          const overdue = isProjectOverdue(project);
          const sc = statusConfig[project.status];
          const bgClass = overdue ? "bg-red-600" : (project.status === "side_projects" ? "" : (!project.card_color ? (sc?.color || "bg-slate-400") : ""));
          const bgStyle = overdue ? {} : (project.status === "side_projects" ? { backgroundColor: "#374151" } : (project.card_color ? { backgroundColor: project.card_color } : {}));
          return (
            <div key={project.id} className={`h-4 rounded-sm flex items-center px-1 gap-0.5 overflow-hidden ${bgClass}`} style={bgStyle} title={project.project_name}>
              {overdue
                ? <AlertTriangle className="w-2 h-2 text-white flex-shrink-0" />
                : sc?.short && <span className="text-white text-[6px] font-bold opacity-80 flex-shrink-0">{sc.short}·</span>
              }
              <span className="text-white text-[9px] font-medium truncate leading-none" style={{ textShadow: "0 0 3px rgba(0,0,0,0.5)" }}>{project.project_name}</span>
            </div>
          );
        })}
        {(activeFilter === "all" || activeFilter === "projects") && installProjects.map((project) => {
          const bgClass = project.status === "side_projects" ? "" : (!project.card_color ? (statusConfig[project.status]?.color || "bg-slate-400") : "");
          const bgStyle = project.status === "side_projects" ? { backgroundColor: "#374151" } : (project.card_color ? { backgroundColor: project.card_color } : {});
          return (
            <div key={"i-" + project.id} className={`h-4 rounded-sm flex items-center gap-0.5 px-1 overflow-hidden ${bgClass}`} style={bgStyle} title={"Install: " + project.project_name}>
              <Hammer className="w-2 h-2 text-white flex-shrink-0" style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }} />
              <span className="text-white text-[9px] font-medium truncate leading-none" style={{ textShadow: "0 0 3px rgba(0,0,0,0.5)" }}>{project.project_name}</span>
            </div>
          );
        })}
        <div className="flex gap-0.5 flex-wrap">
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
        <DropdownMenuItem onClick={() => { setShowCleaningDialog(true); setCleaningWeekStart(selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")); }}><Sparkles className="w-4 h-4 mr-2 text-teal-600" />Rotating Cleaning Schedule</DropdownMenuItem>
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
               <span className="mr-1">{filter.icon}</span>
               <span className="hidden sm:inline">{filter.label}</span>
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
        {/* Left Column (25%) */}
        <div className="w-[25%] border-r border-slate-300 bg-white flex flex-col">

          {/* ── TODAY'S FOCUS PANEL ── */}
          <div className="flex-shrink-0 p-3 border-b border-slate-200 bg-gradient-to-r from-amber-600 to-amber-500">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-white flex-shrink-0" />
              <h2 className="text-white font-bold text-sm">
                {selectedDate && !isSameDay(selectedDate, TODAY) 
                  ? format(selectedDate, "EEE, MMM d") 
                  : `Today — ${format(TODAY, "MMM d")}`}
              </h2>
              {selectedDate && isSameDay(selectedDate, TODAY) && overdueProjects.length > 0 && (
                <div className="ml-auto flex items-center gap-0.5 bg-red-700 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueProjects.length}
                </div>
              )}
            </div>
          </div>

          {/* Day Details */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {(() => {
              const date = selectedDate || TODAY;
              const activeProjects = getActiveProjectsForDay(date);
              const installsOnDay = getInstallProjectsSpanningDate(date);
              const presenter = getPresenterForDate(date);
              const meetings = getDesignMeetingsForDate(date);
              const cleanings = getBathroomCleaningsForDate(date);
              const vacs = getVacationsForDate(date);
              const dayTasks = getTasksForDate(date);
              const weeklyCleanings = getCleaningScheduleForDate(date);
              const isEmpty = !presenter && activeProjects.length === 0 && meetings.length === 0 && cleanings.length === 0 && vacs.length === 0 && dayTasks.length === 0 && weeklyCleanings.length === 0;

              return (
                <>
                  {presenter && (activeFilter === "all" || activeFilter === "presenter") && (
                    <div className="p-2.5 bg-blue-50 rounded-lg flex items-start gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-800">Presenter</p>
                        <p className="text-xs text-blue-700 truncate">{presenter.presenter_name}</p>
                      </div>
                    </div>
                  )}

                  {(activeFilter === "all" || activeFilter === "projects") && activeProjects.map((project) => {
                    const overdue = isProjectOverdue(project);
                    const isInstall = installsOnDay.some(p => p.id === project.id);
                    const sc = statusConfig[project.status];
                    return (
                      <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                        className={`block p-2.5 rounded-lg border-l-3 text-sm transition-all ${overdue ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50"}`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isInstall && <Hammer className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                            {overdue && !isInstall && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                            <span className={`font-semibold text-xs truncate ${overdue ? "text-red-800" : "text-slate-900"}`}>{project.project_name}</span>
                          </div>
                          <Badge className={`text-[10px] border-0 flex-shrink-0 text-white px-1.5 py-0 ${overdue ? "bg-red-600" : (sc?.color || "bg-slate-500")}`}>
                            {overdue ? "OVER" : (sc?.label?.split(" ")[0] || project.status)}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{project.client_name || "—"}</p>
                        {project.estimated_completion && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Due: {format(parseLocalDate(project.estimated_completion), "MMM d")}</p>
                        )}
                        {project.next_action && (
                          <p className="text-[10px] text-slate-600 mt-1 leading-tight">{project.next_action.substring(0, 50)}{project.next_action.length > 50 ? "..." : ""}</p>
                        )}
                      </Link>
                    );
                  })}

                  {(activeFilter === "all" || activeFilter === "meetings") && meetings.map((m) => (
                    <div key={m.id} className="p-2.5 bg-violet-50 rounded-lg text-sm">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-900 mb-0.5"><Users className="w-3 h-3" />Design Meeting</div>
                      <p className="text-xs text-violet-700 truncate">{m.client_name}</p>
                      {m.project_name && <p className="text-[10px] text-violet-600 truncate">{m.project_name}</p>}
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "cleaning") && cleanings.map((c) => (
                    <div key={c.id} className="p-2.5 bg-cyan-50 rounded-lg text-sm">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-900 mb-0.5"><Sparkles className="w-3 h-3" />Cleaning</div>
                      <p className="text-[10px] text-cyan-700">{c.assigned_to.join(", ")}</p>
                    </div>
                  ))}
                  {(activeFilter === "all" || activeFilter === "cleaning") && weeklyCleanings.map((cs) => (
                    <div key={cs.id} className="p-2.5 bg-teal-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900"><Sparkles className="w-3 h-3" />Weekly Cleaning</div>
                        <button onClick={() => deleteCleaningScheduleMutation.mutate(cs.id)} className="text-slate-300 hover:text-red-400 text-[10px]">✕</button>
                      </div>
                      <p className="text-[10px] text-teal-700">{(cs.assigned_to || []).join(", ")}</p>
                      {cs.notes && <p className="text-[10px] text-teal-600 mt-0.5">{cs.notes}</p>}
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "vacations") && vacs.map((v) => (
                    <div key={v.id} className="p-2.5 bg-pink-50 rounded-lg text-sm">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-900 mb-0.5"><CalendarIcon className="w-3 h-3" />Vacation</div>
                      <p className="text-xs text-pink-700 truncate">{v.employee_name}</p>
                    </div>
                  ))}

                  {(activeFilter === "all" || activeFilter === "tasks") && dayTasks.length > 0 && (
                    <div className="border-t border-slate-200 pt-2.5">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Tasks</h4>
                      <div className="space-y-1.5">
                        {dayTasks.map((task) => (
                          <div key={task.id} className={`flex items-center gap-1.5 p-1.5 rounded text-xs ${task.completed ? "bg-slate-50" : "bg-white border border-slate-200"}`}>
                            <Checkbox checked={task.completed} onCheckedChange={() => updateTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } })} className="data-[state=checked]:bg-purple-600" />
                            <span className={task.completed ? "text-slate-400 line-through" : "text-slate-700"}>{task.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isEmpty && <p className="text-xs text-slate-400 text-center py-4 italic">No items scheduled</p>}
                </>
              );
            })()}
          </div>

          {/* ── NEXT 7 DAYS STRIP ── */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-2.5 overflow-y-auto max-h-[30%]">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Next 7 Days</h3>
            <div className="space-y-1.5">
              {next7Days.map((day) => {
                const spanning = getProjectsSpanningDate(day);
                const installs = getInstallProjectsSpanningDate(day);
                const deadlines = projects.filter(p => p.estimated_completion && isSameDay(parseLocalDate(p.estimated_completion), day));
                const isSelected = selectedDate && isSameDay(selectedDate, day);

                return (
                  <button key={format(day, "yyyy-MM-dd")} onClick={() => { setSelectedDate(day); setCurrentMonth(day); }}
                    className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-all ${isSelected ? "border-amber-400 bg-amber-50 font-semibold" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="font-semibold text-slate-900">{format(day, "EEE, MMM d")}</div>
                    {spanning.length === 0 && installs.length === 0 && deadlines.length === 0 ? (
                      <div className="text-[10px] text-slate-300">Free</div>
                    ) : (
                      <div className="text-[9px] text-slate-600 mt-0.5 space-y-0.5">
                        {spanning.length > 0 && <div>{spanning.length} project{spanning.length > 1 ? "s" : ""}</div>}
                        {installs.length > 0 && <div className="text-orange-600">⚒ {installs.length} install{installs.length > 1 ? "s" : ""}</div>}
                        {deadlines.length > 0 && <div className="text-red-600">⚑ {deadlines.length} deadline{deadlines.length > 1 ? "s" : ""}</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (65%) */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">

          {/* ── CALENDAR ── */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {viewType === "week" && format(startOfWeek(currentMonth), "MMM d") + " – " + format(endOfWeek(currentMonth), "MMM d, yyyy")}
                {viewType === "month" && format(currentMonth, "MMMM yyyy")}
                {viewType === "3months" && format(currentMonth, "MMMM yyyy") + " – " + format(addMonths(currentMonth, 2), "MMMM yyyy")}
                {viewType === "6months" && format(currentMonth, "MMMM yyyy") + " – " + format(addMonths(currentMonth, 5), "MMMM yyyy")}
                {viewType === "year" && format(currentMonth, "yyyy")}
              </h3>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setCurrentMonth(new Date())}>Today</Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Calendar */}
           <div className="flex-1 overflow-auto p-3">
             {renderMonthGrid()}
          <div className="mt-3 px-1 py-2 border-t border-slate-200 flex flex-wrap gap-3 text-xs bg-slate-50">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-red-600" /><span className="text-slate-600 text-[11px]">Overdue</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500" /><span className="text-slate-600 text-[11px]">Project</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-orange-500" /><span className="text-slate-600 text-[11px]">Install</span></div>
            <div className="flex items-center gap-1.5"><div className="px-0.5 py-0 bg-violet-500 text-white rounded text-[8px]">M</div><span className="text-slate-600 text-[11px]">Meeting</span></div>
            <div className="flex items-center gap-1.5"><div className="px-0.5 py-0 bg-purple-500 text-white rounded text-[8px]">T</div><span className="text-slate-600 text-[11px]">Task</span></div>
          </div>
        </div>
      </div>
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

      {/* Rotating Cleaning Schedule Dialog */}
      <Dialog open={showCleaningDialog} onOpenChange={setShowCleaningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Rotating Cleaning Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Starting Week (Monday)</Label>
              <Input type="date" value={cleaningWeekStart} onChange={e => setCleaningWeekStart(e.target.value)} />
            </div>
            <div>
              <Label>Number of Weeks to Schedule</Label>
              <Select value={String(autoRotateCount)} onValueChange={v => setAutoRotateCount(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2,3,4,6,8,12,26,52].map(n => <SelectItem key={n} value={String(n)}>{n} weeks</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employees to Rotate (select order)</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cr-${emp.id}`}
                      checked={cleaningAssignees.includes(emp.full_name)}
                      onCheckedChange={(checked) => {
                        setCleaningAssignees(prev =>
                          checked ? [...prev, emp.full_name] : prev.filter(n => n !== emp.full_name)
                        );
                      }}
                    />
                    <Label htmlFor={`cr-${emp.id}`} className="cursor-pointer font-normal">{emp.full_name}</Label>
                  </div>
                ))}
              </div>
              {cleaningAssignees.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">Rotation order: {cleaningAssignees.join(" → ")}</p>
              )}
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={cleaningNotes} onChange={e => setCleaningNotes(e.target.value)} placeholder="e.g. Shop floor + bathroom" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCleaningDialog(false)}>Cancel</Button>
              <Button
                onClick={handleGenerateRotatingSchedule}
                disabled={!cleaningWeekStart || cleaningAssignees.length === 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Generate {autoRotateCount} Weeks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}