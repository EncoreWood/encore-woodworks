import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus, Pencil, Briefcase, Users, CheckCircle2, Trash2, Sparkles } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addDays, startOfYear } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ProjectForm from "../components/projects/ProjectForm";

const statusConfig = {
  inquiry: { label: "Inquiry", color: "bg-slate-500" },
  quoted: { label: "Quoted", color: "bg-blue-500" },
  approved: { label: "Approved", color: "bg-emerald-500" },
  in_design: { label: "In Design", color: "bg-violet-500" },
  in_production: { label: "In Production", color: "bg-amber-500" },
  ready_for_install: { label: "Ready", color: "bg-cyan-500" },
  installing: { label: "Installing", color: "bg-orange-500" },
  completed: { label: "Completed", color: "bg-emerald-600" },
  on_hold: { label: "On Hold", color: "bg-red-500" }
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState(null);
  const [formData, setFormData] = useState({});
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [dayDialogDate, setDayDialogDate] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewType, setViewType] = useState("month");
  const queryClient = useQueryClient();

  const filterOptions = [
    { id: "all", label: "All Events", icon: "📅" },
    { id: "projects", label: "Projects", icon: "💼" },
    { id: "meetings", label: "Design Meetings", icon: "👥" },
    { id: "tasks", label: "Tasks", icon: "✓" },
    { id: "presenter", label: "Presenters", icon: "👤" },
    { id: "cleaning", label: "Cleaning", icon: "✨" }
  ];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: presenters = [] } = useQuery({
    queryKey: ["presenters"],
    queryFn: () => base44.entities.MeetingPresenter.list()
  });

  const { data: designMeetings = [] } = useQuery({
    queryKey: ["designMeetings"],
    queryFn: () => base44.entities.DesignMeeting.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.MeetingTask.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: bathroomCleanings = [] } = useQuery({
    queryKey: ["bathroomCleanings"],
    queryFn: () => base44.entities.BathroomCleaning.list()
  });

  const createPresenterMutation = useMutation({
    mutationFn: async (data) => {
      const presenter = await base44.entities.MeetingPresenter.create(data);
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncToGoogleCalendar', {
          type: 'presenter',
          data
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      return presenter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presenters"] });
      setShowAddDialog(false);
      setFormData({});
    }
  });

  const createDesignMeetingMutation = useMutation({
    mutationFn: async (data) => {
      const meeting = await base44.entities.DesignMeeting.create(data);
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncToGoogleCalendar', {
          type: 'designMeeting',
          data
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designMeetings"] });
      setShowAddDialog(false);
      setFormData({});
    }
  });

  const createBathroomCleaningMutation = useMutation({
    mutationFn: (data) => base44.entities.BathroomCleaning.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bathroomCleanings"] });
      setShowAddDialog(false);
      setFormData({});
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const project = await base44.entities.Project.create(data);
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncToGoogleCalendar', {
          type: 'project',
          data: { ...data, project_name: data.project_name }
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowProjectForm(false);
      setEditingProject(null);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const project = await base44.entities.Project.update(id, data);
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncToGoogleCalendar', {
          type: 'project',
          data: { ...data, project_name: data.project_name }
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowProjectForm(false);
      setEditingProject(null);
    }
  });

  const handleOpenAdd = (type) => {
    const defaultDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    setAddType(type);
    setFormData({ date: defaultDate });
    
    if (type === "project") {
      setEditingProject({ start_date: defaultDate });
      setShowProjectForm(true);
    } else {
      setShowAddDialog(true);
    }
  };

  const handleSubmitAdd = () => {
    if (addType === "presenter" && formData.presenter_name) {
      createPresenterMutation.mutate(formData);
    } else if (addType === "designMeeting" && formData.client_name) {
      createDesignMeetingMutation.mutate(formData);
    } else if (addType === "bathroomCleaning" && formData.assigned_to && formData.assigned_to.length > 0) {
      createBathroomCleaningMutation.mutate(formData);
    } else if (addType === "task" && formData.task) {
      createTaskMutation.mutate({
        task: formData.task,
        date: formData.date,
        assignee: formData.assignee || undefined,
        completed: false
      });
      setShowAddDialog(false);
      setFormData({});
    }
  };

  const getPresenterForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return presenters.find(p => p.date === dateStr);
  };

  const getDesignMeetingsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return designMeetings.filter(m => m.date === dateStr);
  };

  const getTasksForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter(t => t.date === dateStr);
  };

  const getBathroomCleaningsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bathroomCleanings.filter(c => c.date === dateStr);
  };

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.MeetingTask.create(data);
      // Sync to Google Calendar
      try {
        await base44.functions.invoke('syncToGoogleCalendar', {
          type: 'task',
          data
        });
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTask("");
      setNewAssignee("");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const handleAddTask = () => {
    if (newTask.trim()) {
      const dateToUse = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      createTaskMutation.mutate({
        task: newTask.trim(),
        date: dateToUse,
        assignee: newAssignee.trim() || undefined,
        completed: false
      });
    }
  };

  const handleToggleTask = (task) => {
    updateTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } });
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleSubmitProject = (data) => {
    if (editingProject?.id) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const getProjectsForDate = (date) => {
    return projects.filter((project) => {
      const startDate = project.start_date ? new Date(project.start_date) : null;
      const completionDate = project.estimated_completion ? new Date(project.estimated_completion) : null;
      
      return (
        (startDate && isSameDay(startDate, date)) ||
        (completionDate && isSameDay(completionDate, date))
      );
    });
  };

  const getDayContent = (day) => {
    const projectsOnDay = getProjectsForDate(day);
    if (projectsOnDay.length === 0) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 px-0.5 pb-0.5">
        {projectsOnDay.slice(0, 3).map((project) => (
          <div
            key={project.id}
            className={`h-1 flex-1 rounded-full ${statusConfig[project.status]?.color || "bg-slate-400"}`}
            title={project.project_name}
          />
        ))}
      </div>
    );
  };

  // Get date range based on view type
  const getDateRange = () => {
    switch (viewType) {
      case "week":
        return {
          start: startOfWeek(currentMonth),
          end: endOfWeek(currentMonth)
        };
      case "month":
        return {
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth)
        };
      case "3months":
        return {
          start: startOfMonth(currentMonth),
          end: endOfMonth(addMonths(currentMonth, 2))
        };
      case "6months":
        return {
          start: startOfMonth(currentMonth),
          end: endOfMonth(addMonths(currentMonth, 5))
        };
      case "year":
        return {
          start: startOfYear(currentMonth),
          end: endOfMonth(addMonths(currentMonth, 11))
        };
      default:
        return {
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth)
        };
    }
  };

  const dateRange = getDateRange();
  const monthStart = dateRange.start;
  const monthEnd = dateRange.end;

  const projectsInMonth = projects.filter((project) => {
    const startDate = project.start_date ? new Date(project.start_date) : null;
    const completionDate = project.estimated_completion ? new Date(project.estimated_completion) : null;
    
    return (
      (startDate && startDate >= monthStart && startDate <= monthEnd) ||
      (completionDate && completionDate >= monthStart && completionDate <= monthEnd)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Calendar</h1>
          <p className="text-slate-500 mt-1">View projects by their scheduled dates</p>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className={activeFilter === filter.id ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  <span className="mr-1.5">{filter.icon}</span>
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 ml-auto">
              {[
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "3months", label: "3 Months" },
                { id: "6months", label: "6 Months" },
                { id: "year", label: "Year" }
              ].map((view) => (
                <Button
                  key={view.id}
                  variant={viewType === view.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewType(view.id)}
                  className={viewType === view.id ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {view.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
         <Card className="p-8 bg-white border-0 shadow-lg mb-6">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold text-slate-900">
                   {viewType === "week" && format(startOfWeek(currentMonth), "MMM d") + " - " + format(endOfWeek(currentMonth), "MMM d, yyyy")}
                   {viewType === "month" && format(currentMonth, "MMMM yyyy")}
                   {viewType === "3months" && format(currentMonth, "MMMM yyyy") + " - " + format(addMonths(currentMonth, 2), "MMMM yyyy")}
                   {viewType === "6months" && format(currentMonth, "MMMM yyyy") + " - " + format(addMonths(currentMonth, 5), "MMMM yyyy")}
                   {viewType === "year" && format(currentMonth, "yyyy")}
                 </h2>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenAdd("presenter")}>
                        <User className="w-4 h-4 mr-2" />
                        Meeting Presenter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("task")}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("project")}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        New Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("designMeeting")}>
                        <Users className="w-4 h-4 mr-2" />
                        Design Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("bathroomCleaning")}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Bathroom Cleaning
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <style>{`
                .rdp-day {
                  position: relative;
                  height: ${viewType === "week" ? "120px" : viewType === "month" ? "100px" : "60px"};
                }
                .rdp-day_button {
                  width: 100%;
                  height: 100%;
                }
                .rdp-month {
                  width: 100%;
                }
                .rdp-months {
                  ${(viewType === "3months" || viewType === "6months") ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;" : ""}
                  ${viewType === "year" ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.5rem;" : ""}
                }
              `}</style>

              {viewType === "week" ? (
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDayDialogDate(date);
                    setShowDayDialog(true);
                  }}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  disabled={(date) => {
                    const weekStart = startOfWeek(currentMonth);
                    const weekEnd = endOfWeek(currentMonth);
                    return date < weekStart || date > weekEnd;
                  }}
                  className="w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full",
                    table: "w-full border-collapse table-fixed",
                    head_cell: "text-slate-600 font-semibold text-base py-4 w-[14.28%]",
                    cell: "relative p-0 text-center border-2 border-slate-100 w-[14.28%]",
                    day: "relative h-30 w-full p-0 font-normal hover:bg-amber-50 transition-colors",
                    day_selected: "bg-amber-100 text-amber-900 font-semibold",
                    day_today: "bg-blue-50 font-bold border-2 border-blue-300",
                    day_outside: "text-slate-300 opacity-50"
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const presenter = getPresenterForDate(date);
                      const projectCount = getProjectsForDate(date).length;
                      const meetingCount = getDesignMeetingsForDate(date).length;
                      const taskCount = getTasksForDate(date).length;
                      const cleaningCount = getBathroomCleaningsForDate(date).length;
                      return (
                        <div className="w-full h-full flex flex-col p-2">
                          <div className="text-base font-semibold mb-auto flex items-center justify-between">
                            {format(date, "d")}
                            {presenter && activeFilter !== "cleaning" && activeFilter !== "meetings" && activeFilter !== "tasks" && activeFilter !== "projects" && (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {projectCount > 0 && (activeFilter === "all" || activeFilter === "projects") && (
                              <div className="text-xs px-1.5 py-0.5 bg-amber-500 text-white rounded font-medium">
                                {projectCount}
                              </div>
                            )}
                            {meetingCount > 0 && (activeFilter === "all" || activeFilter === "meetings") && (
                              <div className="text-xs px-1.5 py-0.5 bg-violet-500 text-white rounded font-medium">
                                {meetingCount}
                              </div>
                            )}
                            {taskCount > 0 && (activeFilter === "all" || activeFilter === "tasks") && (
                              <div className="text-xs px-1.5 py-0.5 bg-purple-500 text-white rounded font-medium">
                                {taskCount}
                              </div>
                            )}
                            {cleaningCount > 0 && (activeFilter === "all" || activeFilter === "cleaning") && (
                              <div className="text-xs px-1.5 py-0.5 bg-cyan-500 text-white rounded font-medium">
                                {cleaningCount}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  }}
                />
              ) : (viewType === "month") ? (
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDayDialogDate(date);
                    setShowDayDialog(true);
                  }}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full",
                    table: "w-full border-collapse table-fixed",
                    head_cell: "text-slate-600 font-semibold text-base py-4 w-[14.28%]",
                    cell: "relative p-0 text-center border-2 border-slate-100 w-[14.28%]",
                    day: "relative h-24 w-full p-0 font-normal hover:bg-amber-50 transition-colors",
                    day_selected: "bg-amber-100 text-amber-900 font-semibold",
                    day_today: "bg-blue-50 font-bold border-2 border-blue-300",
                    day_outside: "text-slate-300 opacity-50"
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const presenter = getPresenterForDate(date);
                      const projectCount = getProjectsForDate(date).length;
                      const meetingCount = getDesignMeetingsForDate(date).length;
                      const taskCount = getTasksForDate(date).length;
                      const cleaningCount = getBathroomCleaningsForDate(date).length;
                      return (
                        <div className="w-full h-full flex flex-col p-2">
                          <div className="text-base font-semibold mb-auto flex items-center justify-between">
                            {format(date, "d")}
                            {presenter && activeFilter !== "cleaning" && activeFilter !== "meetings" && activeFilter !== "tasks" && activeFilter !== "projects" && (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {projectCount > 0 && (activeFilter === "all" || activeFilter === "projects") && (
                              <div className="text-xs px-1.5 py-0.5 bg-amber-500 text-white rounded font-medium">
                                {projectCount}
                              </div>
                            )}
                            {meetingCount > 0 && (activeFilter === "all" || activeFilter === "meetings") && (
                              <div className="text-xs px-1.5 py-0.5 bg-violet-500 text-white rounded font-medium">
                                {meetingCount}
                              </div>
                            )}
                            {taskCount > 0 && (activeFilter === "all" || activeFilter === "tasks") && (
                              <div className="text-xs px-1.5 py-0.5 bg-purple-500 text-white rounded font-medium">
                                {taskCount}
                              </div>
                            )}
                            {cleaningCount > 0 && (activeFilter === "all" || activeFilter === "cleaning") && (
                              <div className="text-xs px-1.5 py-0.5 bg-cyan-500 text-white rounded font-medium">
                                {cleaningCount}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  }}
                />
              ) : (
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDayDialogDate(date);
                    setShowDayDialog(true);
                  }}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full",
                    table: "w-full border-collapse table-fixed",
                    head_cell: "text-slate-500 font-semibold text-xs py-2 w-[14.28%]",
                    cell: "relative p-0 text-center border border-slate-100 w-[14.28%]",
                    day: "relative h-16 w-full p-0 font-normal hover:bg-amber-50 transition-colors text-sm",
                    day_selected: "bg-amber-100 text-amber-900 font-semibold",
                    day_today: "bg-blue-50 font-bold border border-blue-300",
                    day_outside: "text-slate-300 opacity-50"
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const projectCount = getProjectsForDate(date).length;
                      const meetingCount = getDesignMeetingsForDate(date).length;
                      const taskCount = getTasksForDate(date).length;
                      return (
                        <div className="w-full h-full flex flex-col p-1">
                          <div className="text-sm font-semibold">{format(date, "d")}</div>
                          <div className="flex gap-0.5 flex-wrap mt-0.5 text-xs">
                            {projectCount > 0 && (activeFilter === "all" || activeFilter === "projects") && (
                              <div className="px-1 py-0 bg-amber-500 text-white rounded">
                                {projectCount}P
                              </div>
                            )}
                            {meetingCount > 0 && (activeFilter === "all" || activeFilter === "meetings") && (
                              <div className="px-1 py-0 bg-violet-500 text-white rounded">
                                {meetingCount}M
                              </div>
                            )}
                            {taskCount > 0 && (activeFilter === "all" || activeFilter === "tasks") && (
                              <div className="px-1 py-0 bg-purple-500 text-white rounded">
                                {taskCount}T
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  }}
                />
              )}

              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-amber-500 text-white rounded font-medium text-xs">1</div>
                  <span className="text-slate-700">Project</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-violet-500 text-white rounded font-medium text-xs">1</div>
                  <span className="text-slate-700">Design Meeting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-purple-500 text-white rounded font-medium text-xs">1</div>
                  <span className="text-slate-700">Task</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-700">Presenter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-cyan-500 text-white rounded font-medium text-xs">1</div>
                  <span className="text-slate-700">Bathroom Cleaning</span>
                </div>
              </div>
            </Card>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-white border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
                </h2>
                {selectedDate && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenAdd("presenter")}>
                        <User className="w-4 h-4 mr-2" />
                        Meeting Presenter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("task")}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("project")}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        New Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("designMeeting")}>
                        <Users className="w-4 h-4 mr-2" />
                        Design Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("bathroomCleaning")}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Bathroom Cleaning
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {selectedDate ? (
               <div className="space-y-4">
                  {/* Presenter */}
                  {getPresenterForDate(selectedDate) && (activeFilter === "all" || activeFilter === "presenter") && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                        <User className="w-4 h-4" />
                        Meeting Presenter
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        {getPresenterForDate(selectedDate).presenter_name}
                      </p>
                    </div>
                  )}

                  {/* Projects */}
                  {(activeFilter === "all" || activeFilter === "projects") && getProjectsForDate(selectedDate).map((project) => (
                    <div key={project.id} className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="w-4 h-4 text-amber-700" />
                            <span className="text-sm font-medium text-amber-900">
                              {project.project_name}
                            </span>
                          </div>
                          <p className="text-xs text-amber-700">{project.client_name}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEditProject(project)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Design Meetings */}
                  {(activeFilter === "all" || activeFilter === "meetings") && getDesignMeetingsForDate(selectedDate).map((meeting) => (
                    <div key={meeting.id} className="p-3 bg-violet-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-violet-900">
                        <Users className="w-4 h-4" />
                        Design Meeting
                      </div>
                      <p className="text-sm text-violet-700 mt-1">{meeting.client_name}</p>
                      {meeting.project_name && (
                        <p className="text-xs text-violet-600">{meeting.project_name}</p>
                      )}
                    </div>
                  ))}

                  {/* Bathroom Cleanings */}
                  {(activeFilter === "all" || activeFilter === "cleaning") && getBathroomCleaningsForDate(selectedDate).map((cleaning) => (
                    <div key={cleaning.id} className="p-3 bg-cyan-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-cyan-900">
                        <Sparkles className="w-4 h-4" />
                        Bathroom Cleaning
                      </div>
                      <p className="text-sm text-cyan-700 mt-1">
                        {cleaning.assigned_to.join(", ")}
                      </p>
                      {cleaning.notes && (
                        <p className="text-xs text-cyan-600 mt-1">{cleaning.notes}</p>
                      )}
                    </div>
                  ))}

                  {/* Tasks Section */}
                  {(activeFilter === "all" || activeFilter === "tasks") && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Tasks
                    </h3>
                    
                    {/* Add Task */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="New task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddTask}
                        disabled={!newTask.trim() || createTaskMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2">
                      {getTasksForDate(selectedDate).map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded border ${
                            task.completed
                              ? "bg-slate-50 border-slate-200"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleTask(task)}
                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {task.task}
                            </p>
                            {task.assignee && (
                              <p className="text-xs text-slate-500">{task.assignee}</p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            className="h-6 w-6 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    </div>
                    )}

                    {!getPresenterForDate(selectedDate) && 
                    getProjectsForDate(selectedDate).length === 0 && 
                    getDesignMeetingsForDate(selectedDate).length === 0 &&
                    getTasksForDate(selectedDate).length === 0 &&
                    getBathroomCleaningsForDate(selectedDate).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No items for this date
                    </p>
                    )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  Select a date to view and add items
                </p>
              )}
            </Card>

          {/* This Month Projects */}
          <Card className="p-6 bg-white border-0 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              This Month ({projectsInMonth.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {projectsInMonth.length === 0 ? (
                  <p className="text-sm text-slate-500">No projects scheduled this month</p>
                ) : (
                  projectsInMonth.map((project) => (
                    <Link
                      key={project.id}
                      to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className="block p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-slate-900 text-sm line-clamp-1">
                          {project.project_name}
                        </h3>
                        <Badge
                          className={`text-xs border-0 ${statusConfig[project.status]?.color || "bg-slate-500"} text-white`}
                        >
                          {statusConfig[project.status]?.label || project.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{project.client_name}</p>
                      <div className="space-y-1 text-xs text-slate-500">
                        {project.start_date && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Start: {format(new Date(project.start_date), "MMM d")}</span>
                          </div>
                        )}
                        {project.estimated_completion && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Due: {format(new Date(project.estimated_completion), "MMM d")}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
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
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {addType === "presenter" && (
                <>
                  <div>
                    <Label htmlFor="presenter_name">Presenter Name</Label>
                    <Select
                      value={formData.presenter_name || ""}
                      onValueChange={(value) => setFormData({ ...formData, presenter_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.full_name}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time || ""}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </>
              )}

              {addType === "designMeeting" && (
                <>
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name || ""}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_name">Project Name</Label>
                    <Input
                      id="project_name"
                      value={formData.project_name || ""}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time || ""}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Meeting notes..."
                    />
                  </div>
                </>
              )}

              {addType === "task" && (
                <>
                  <div>
                    <Label htmlFor="task">Task *</Label>
                    <Input
                      id="task"
                      value={formData.task || ""}
                      onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                      placeholder="Enter task description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignee">Assign To</Label>
                    <Input
                      id="assignee"
                      value={formData.assignee || ""}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                      placeholder="Person's name (optional)"
                    />
                  </div>
                </>
              )}

              {addType === "bathroomCleaning" && (
                <>
                  <div>
                    <Label>Assign To *</Label>
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                      {employees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`cleaning-${emp.id}`}
                            checked={formData.assigned_to?.includes(emp.full_name) || false}
                            onCheckedChange={(checked) => {
                              const current = formData.assigned_to || [];
                              setFormData({
                                ...formData,
                                assigned_to: checked
                                  ? [...current, emp.full_name]
                                  : current.filter(n => n !== emp.full_name)
                              });
                            }}
                          />
                          <Label htmlFor={`cleaning-${emp.id}`} className="cursor-pointer font-normal">
                            {emp.full_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAdd}
                  disabled={
                    (addType === "presenter" && !formData.presenter_name) ||
                    (addType === "designMeeting" && !formData.client_name) ||
                    (addType === "task" && !formData.task) ||
                    (addType === "bathroomCleaning" && (!formData.assigned_to || formData.assigned_to.length === 0))
                  }
                >
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Project Form */}
        <ProjectForm
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
          onSubmit={handleSubmitProject}
          initialData={editingProject}
          isLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
        />

        {/* Day Events Dialog */}
        <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {dayDialogDate && format(dayDialogDate, "EEEE, MMMM d, yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {dayDialogDate && (
                <>
                  {/* Presenter */}
                  {getPresenterForDate(dayDialogDate) && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-2">
                        <User className="w-4 h-4" />
                        Meeting Presenter
                      </div>
                      <p className="text-sm text-blue-700">
                        {getPresenterForDate(dayDialogDate).presenter_name}
                      </p>
                      {getPresenterForDate(dayDialogDate).time && (
                        <p className="text-xs text-blue-600 mt-1">
                          {getPresenterForDate(dayDialogDate).time}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Projects */}
                  {getProjectsForDate(dayDialogDate).map((project) => (
                    <Link
                      key={project.id}
                      to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className="block p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                      onClick={() => setShowDayDialog(false)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-amber-700" />
                          <span className="text-sm font-medium text-amber-900">
                            {project.project_name}
                          </span>
                        </div>
                        <Badge
                          className={`text-xs border-0 ${statusConfig[project.status]?.color || "bg-slate-500"} text-white`}
                        >
                          {statusConfig[project.status]?.label || project.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-amber-700">{project.client_name}</p>
                      {project.address && (
                        <p className="text-xs text-amber-600 mt-1">{project.address}</p>
                      )}
                    </Link>
                  ))}

                  {/* Design Meetings */}
                  {getDesignMeetingsForDate(dayDialogDate).map((meeting) => (
                    <div key={meeting.id} className="p-4 bg-violet-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-violet-900 mb-2">
                        <Users className="w-4 h-4" />
                        Design Meeting
                      </div>
                      <p className="text-sm text-violet-700">{meeting.client_name}</p>
                      {meeting.project_name && (
                        <p className="text-xs text-violet-600 mt-1">{meeting.project_name}</p>
                      )}
                      {meeting.time && (
                        <p className="text-xs text-violet-600 mt-1">{meeting.time}</p>
                      )}
                      {meeting.notes && (
                        <p className="text-xs text-violet-600 mt-2 italic">{meeting.notes}</p>
                      )}
                    </div>
                  ))}

                  {/* Tasks */}
                  {getTasksForDate(dayDialogDate).length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-900 mb-3">
                        <CheckCircle2 className="w-4 h-4" />
                        Tasks ({getTasksForDate(dayDialogDate).filter(t => !t.completed).length} remaining)
                      </div>
                      <div className="space-y-2">
                        {getTasksForDate(dayDialogDate).map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 p-2 rounded ${
                              task.completed ? "bg-slate-50" : "bg-white"
                            }`}
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => handleToggleTask(task)}
                              className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            />
                            <div className="flex-1">
                              <p className={`text-sm ${task.completed ? "text-slate-400 line-through" : "text-purple-700"}`}>
                                {task.task}
                              </p>
                              {task.assignee && (
                                <p className="text-xs text-purple-600">{task.assignee}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bathroom Cleanings */}
                  {getBathroomCleaningsForDate(dayDialogDate).map((cleaning) => (
                    <div key={cleaning.id} className="p-4 bg-cyan-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-cyan-900 mb-2">
                        <Sparkles className="w-4 h-4" />
                        Bathroom Cleaning
                      </div>
                      <p className="text-sm text-cyan-700">
                        Assigned to: {cleaning.assigned_to.join(", ")}
                      </p>
                      {cleaning.notes && (
                        <p className="text-xs text-cyan-600 mt-2 italic">{cleaning.notes}</p>
                      )}
                    </div>
                  ))}

                  {!getPresenterForDate(dayDialogDate) && 
                   getProjectsForDate(dayDialogDate).length === 0 && 
                   getDesignMeetingsForDate(dayDialogDate).length === 0 &&
                   getTasksForDate(dayDialogDate).length === 0 &&
                   getBathroomCleaningsForDate(dayDialogDate).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No events scheduled for this day
                    </p>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}