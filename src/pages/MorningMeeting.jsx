import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Calendar, AlertCircle, Coffee, Sun, Target, CheckCircle2, ChevronLeft, ChevronRight, Edit, MoreVertical, Plus, Trash2, Check } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

const employees = [
  "Mike Johnson",
  "Sarah Chen",
  "David Martinez",
  "Emily Rodriguez",
  "James Wilson"
];

const motivationalQuotes = [
  "Excellence is not a skill, it's an attitude.",
  "Quality is not an act, it is a habit.",
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Do what you do so well that they will want to see it again.",
  "Strive for progress, not perfection.",
  "Great things are done by a series of small things brought together.",
  "The only way to do great work is to love what you do.",
  "Craftsmanship is a tradition of excellence.",
  "Precision and passion create perfection.",
  "Every project is an opportunity to exceed expectations.",
  "Build it right, build it once.",
  "Take pride in every cut, every joint, every finish.",
  "Attention to detail makes all the difference."
];

const agendaSections = [
  {
    id: "urgent",
    title: "🚨 Urgent - Needs Immediate Attention",
    icon: AlertCircle,
    bgColor: "bg-gradient-to-r from-red-50 to-orange-50",
    borderColor: "border-l-red-500",
    textColor: "text-red-700"
  },
  {
    id: "today",
    title: "☀️ Today's Focus - Installing & Ready",
    icon: Target,
    bgColor: "bg-gradient-to-r from-amber-50 to-yellow-50",
    borderColor: "border-l-amber-500",
    textColor: "text-amber-700"
  },
  {
    id: "production",
    title: "⚒️ In Production This Week",
    icon: Coffee,
    bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
    borderColor: "border-l-blue-500",
    textColor: "text-blue-700"
  },
  {
    id: "new",
    title: "✨ New Opportunities",
    icon: Sun,
    bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
    borderColor: "border-l-green-500",
    textColor: "text-green-700"
  }
];

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-slate-100 text-slate-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

export default function MorningMeeting() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPresenterDialog, setShowPresenterDialog] = useState(false);
  const [presenterName, setPresenterName] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: presenterData } = useQuery({
    queryKey: ["presenter", dateString],
    queryFn: async () => {
      const presenters = await base44.entities.MeetingPresenter.filter({ date: dateString });
      return presenters[0];
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", dateString],
    queryFn: () => base44.entities.MeetingTask.filter({ date: dateString })
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const savePresenterMutation = useMutation({
    mutationFn: async (name) => {
      if (presenterData?.id) {
        return base44.entities.MeetingPresenter.update(presenterData.id, {
          presenter_name: name,
          date: dateString
        });
      } else {
        return base44.entities.MeetingPresenter.create({
          presenter_name: name,
          date: dateString
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presenter", dateString] });
      setShowPresenterDialog(false);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  const handleEditPresenter = () => {
    setPresenterName(presenterData?.presenter_name || "");
    setShowPresenterDialog(true);
  };

  const handleSavePresenter = () => {
    if (presenterName.trim()) {
      savePresenterMutation.mutate(presenterName.trim());
    }
  };

  const handleUpdateProjectStatus = (project, newStatus) => {
    updateProjectMutation.mutate({ id: project.id, data: { status: newStatus } });
  };

  const handleUpdateProjectPriority = (project, newPriority) => {
    updateProjectMutation.mutate({ id: project.id, data: { priority: newPriority } });
  };

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", dateString] });
      setNewTask("");
      setNewAssignee("");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", dateString] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", dateString] });
    }
  });

  const handleAddTask = async () => {
    if (newTask.trim()) {
      const taskData = {
        task: newTask.trim(),
        date: dateString,
        assignee: newAssignee.trim() || undefined,
        completed: false
      };
      createTaskMutation.mutate(taskData);
      
      // Sync to Google Calendar
      await syncTaskToCalendar(taskData);
    }
  };

  const handleToggleTask = (task) => {
    updateTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } });
  };

  const syncTaskToCalendar = async (task) => {
    try {
      await base44.functions.invoke('syncToGoogleCalendar', {
        type: 'task',
        data: {
          task: task.task,
          assignee: task.assignee,
          date: task.date
        }
      });
    } catch (error) {
      console.error('Failed to sync task to calendar:', error);
    }
  };

  // Get daily quote based on day of year
  const getDailyQuote = () => {
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const diff = selectedDate - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  };

  // Get presenter from calendar or fallback to rotation
  const getPresenter = () => {
    if (presenterData?.presenter_name) {
      return presenterData.presenter_name;
    }
    // Fallback to rotation if not set in calendar
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const diff = selectedDate - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return employees[dayOfYear % employees.length];
  };

  const getProjectsBySection = (sectionId) => {
    switch (sectionId) {
      case "urgent":
        return projects.filter((p) => p.priority === "urgent" && p.status !== "completed");
      case "today":
        return projects.filter((p) => ["ready_for_install", "installing"].includes(p.status));
      case "production":
        return projects.filter((p) => p.status === "in_production");
      case "new":
        return projects.filter((p) => p.status === "inquiry");
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md mb-4">
            <Coffee className="w-6 h-6 text-amber-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Daily Morning Meeting
            </h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center">
              <p className="text-lg text-slate-600 font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              {format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  Back to Today
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Presenter Badge */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg">
              <User className="w-5 h-5" />
              <span className="font-semibold">Presenter:</span>
              <span className="font-bold text-lg">{getPresenter()}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 ml-2 text-white hover:bg-blue-700"
                onClick={handleEditPresenter}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-6 shadow-md border-l-4 border-amber-500">
            <p className="text-xl font-semibold text-slate-700 italic">
              "{getDailyQuote()}"
            </p>
          </div>
        </div>

        {/* Tasks Section */}
        <Card className="mb-6 overflow-hidden border-l-4 border-l-purple-500 shadow-lg">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-purple-700" />
                <h2 className="text-xl font-bold text-purple-700">
                  📋 Tasks & Action Items
                </h2>
              </div>
              <Badge className="text-base px-4 py-1 text-purple-700 bg-white">
                {tasks.filter(t => !t.completed).length} remaining
              </Badge>
            </div>
          </div>

          <div className="p-4">
            {/* Add New Task */}
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
                className="flex-1"
              />
              <Input
                placeholder="Assignee (optional)"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
                className="w-48"
              />
              <Button
                onClick={handleAddTask}
                disabled={!newTask.trim() || createTaskMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Tasks List */}
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No tasks yet. Add one above!
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      task.completed
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task)}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          task.completed
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {task.task}
                      </p>
                      {task.assignee && (
                        <p className="text-sm text-slate-500">
                          Assigned to: {task.assignee}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => syncTaskToCalendar(task)}
                      className="text-slate-400 hover:text-green-600"
                      title="Sync to Calendar"
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Agenda Sections */}
        <div className="space-y-6">
          {agendaSections.map((section) => {
            const sectionProjects = getProjectsBySection(section.id);
            const Icon = section.icon;

            return (
              <Card
                key={section.id}
                className={`overflow-hidden border-l-4 ${section.borderColor} shadow-lg hover:shadow-xl transition-all`}
              >
                <div className={`p-4 ${section.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${section.textColor}`} />
                      <h2 className={`text-xl font-bold ${section.textColor}`}>
                        {section.title}
                      </h2>
                    </div>
                    <Badge className={`text-base px-4 py-1 ${section.textColor} bg-white`}>
                      {sectionProjects.length}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  {sectionProjects.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>All clear!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sectionProjects.map((project) => (
                        <div key={project.id} className="bg-white rounded-lg p-4 border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <Link
                              to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                              className="flex-1"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-slate-900">
                                  {project.project_name}
                                </h3>
                                <Badge className={`${priorityColors[project.priority]} border-0`}>
                                  {project.priority}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  <span>{project.client_name}</span>
                                </div>
                                {project.estimated_completion && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Due: {format(new Date(project.estimated_completion), "MMM d")}</span>
                                  </div>
                                )}
                                {project.rooms && project.rooms.length > 0 && (
                                  <span className="text-slate-500">
                                    {project.rooms.length} room{project.rooms.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project, "in_production")}>
                                  Move to Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project, "ready_for_install")}>
                                  Mark Ready for Install
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project, "installing")}>
                                  Mark Installing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project, "completed")}>
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectStatus(project, "on_hold")}>
                                  Put on Hold
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectPriority(project, "urgent")}>
                                  Set Priority: Urgent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectPriority(project, "high")}>
                                  Set Priority: High
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateProjectPriority(project, "medium")}>
                                  Set Priority: Medium
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Edit Presenter Dialog */}
        <Dialog open={showPresenterDialog} onOpenChange={setShowPresenterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Presenter for {format(selectedDate, "MMM d, yyyy")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="presenter">Presenter Name</Label>
                <Select
                  value={presenterName}
                  onValueChange={setPresenterName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.full_name}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPresenterDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePresenter}
                  disabled={!presenterName.trim() || savePresenterMutation.isPending}
                >
                  {savePresenterMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}