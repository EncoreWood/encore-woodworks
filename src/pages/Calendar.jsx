import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus, Pencil, Briefcase, Users } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
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
  const queryClient = useQueryClient();

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
    if (!selectedDate) return;
    setAddType(type);
    setFormData({ date: format(selectedDate, "yyyy-MM-dd") });
    
    if (type === "project") {
      setEditingProject({ start_date: format(selectedDate, "yyyy-MM-dd") });
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Calendar</h1>
          <p className="text-slate-500 mt-1">View projects by their scheduled dates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="p-8 bg-white border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
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
                  height: 100px;
                }
                .rdp-day_button {
                  width: 100%;
                  height: 100%;
                }
                .rdp-month {
                  width: 100%;
                }
              `}</style>

              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                classNames={{
                  months: "w-full",
                  month: "w-full",
                  table: "w-full border-collapse",
                  head_cell: "text-slate-600 font-semibold text-base py-4",
                  cell: "relative p-0 text-center border-2 border-slate-100",
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
                    return (
                      <div className="w-full h-full flex flex-col p-2">
                        <div className="text-base font-semibold mb-auto flex items-center justify-between">
                          {format(date, "d")}
                          {presenter && (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {projectCount > 0 && (
                            <div className="text-xs px-1.5 py-0.5 bg-amber-500 text-white rounded font-medium">
                              {projectCount}
                            </div>
                          )}
                          {meetingCount > 0 && (
                            <div className="text-xs px-1.5 py-0.5 bg-violet-500 text-white rounded font-medium">
                              {meetingCount}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                }}
              />

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
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-700">Presenter</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Selected Date Info */}
          <div className="space-y-6">
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
                      <DropdownMenuItem onClick={() => handleOpenAdd("project")}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        New Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdd("designMeeting")}>
                        <Users className="w-4 h-4 mr-2" />
                        Design Meeting
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {selectedDate ? (
                <div className="space-y-4">
                  {/* Presenter */}
                  {getPresenterForDate(selectedDate) && (
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
                  {getProjectsForDate(selectedDate).map((project) => (
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
                  {getDesignMeetingsForDate(selectedDate).map((meeting) => (
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

                  {!getPresenterForDate(selectedDate) && 
                   getProjectsForDate(selectedDate).length === 0 && 
                   getDesignMeetingsForDate(selectedDate).length === 0 && (
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
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
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
        </div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {addType === "presenter" && "Add Meeting Presenter"}
                {addType === "designMeeting" && "Add Design Meeting"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">
                  Date: {formData.date && format(new Date(formData.date), "MMM d, yyyy")}
                </Label>
              </div>

              {addType === "presenter" && (
                <div>
                  <Label htmlFor="presenter_name">Presenter Name</Label>
                  <Input
                    id="presenter_name"
                    value={formData.presenter_name || ""}
                    onChange={(e) => setFormData({ ...formData, presenter_name: e.target.value })}
                    placeholder="Enter presenter name"
                  />
                </div>
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

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAdd}
                  disabled={
                    (addType === "presenter" && !formData.presenter_name) ||
                    (addType === "designMeeting" && !formData.client_name)
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
      </div>
    </div>
  );
}