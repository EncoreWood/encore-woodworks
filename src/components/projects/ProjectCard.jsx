import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, ChevronRight, DoorOpen, ExternalLink, CheckCircle2, Circle, Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import TaskForm from "./TaskForm";

const statusConfig = {
  inquiry: { label: "Inquiry", color: "bg-slate-100 text-slate-700" },
  quoted: { label: "Quoted", color: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700" },
  in_design: { label: "In Design", color: "bg-violet-50 text-violet-700" },
  in_production: { label: "In Production", color: "bg-amber-50 text-amber-700" },
  ready_for_install: { label: "Ready for Install", color: "bg-cyan-50 text-cyan-700" },
  installing: { label: "Installing", color: "bg-orange-50 text-orange-700" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700" },
  on_hold: { label: "On Hold", color: "bg-red-50 text-red-700" }
};

const typeConfig = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  closet: "Closet",
  garage: "Garage",
  office: "Office",
  laundry: "Laundry",
  custom: "Custom"
};

const priorityConfig = {
  low: { label: "Low", color: "text-slate-500" },
  medium: { label: "Medium", color: "text-blue-600" },
  high: { label: "High", color: "text-amber-600" },
  urgent: { label: "Urgent", color: "text-red-600" }
};

export default function ProjectCard({ project }) {
  const queryClient = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const status = statusConfig[project.status] || statusConfig.inquiry;
  const type = typeConfig[project.project_type] || project.project_type;
  const priority = priorityConfig[project.priority] || priorityConfig.medium;
  
  // Fetch tasks for this project
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", project.id],
    queryFn: () => base44.entities.Task.filter({ project_id: project.id })
  });

  const completedTasks = tasks.filter(t => t.status === "completed").length;

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
      setShowTaskForm(false);
    }
  });
  
  // Calculate progress
  const phases = [
    project.design_complete,
    project.materials_ordered,
    project.production_complete,
    project.installation_complete
  ];
  const completedPhases = phases.filter(Boolean).length;
  const progress = (completedPhases / phases.length) * 100;

  return (
    <Link to={createPageUrl("ProjectDetails") + `?id=${project.id}`}>
      <Card className="group p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                {project.project_name}
              </h3>
              <Link 
                to={createPageUrl("Kanban") + `?project=${project.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-amber-600 transition-colors"
                title="View on Board"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <span className={cn("text-xs font-medium", priority.color)}>
                • {priority.label}
              </span>
            </div>
            <p className="text-sm text-slate-500">{type} Cabinets</p>
          </div>
          <Badge className={cn("font-medium border-0", status.color)}>
            {status.label}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span>{project.client_name}</span>
          </div>
          {project.address && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="truncate">{project.address}</span>
            </div>
          )}
          {project.estimated_completion && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Due {format(new Date(project.estimated_completion), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Tasks {tasks.length > 0 && `(${completedTasks}/${tasks.length})`}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={(e) => {
                e.preventDefault();
                setShowTaskForm(true);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-1.5">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "truncate flex-1",
                    task.status === "completed" ? "line-through text-slate-400" : "text-slate-700"
                  )}>
                    {task.title}
                  </span>
                  {task.priority === "high" && task.status !== "completed" && (
                    <Badge variant="outline" className="text-xs py-0 bg-amber-50 text-amber-700 border-amber-200">
                      High
                    </Badge>
                  )}
                </div>
              ))}
              {tasks.length > 3 && (
                <p className="text-xs text-slate-400">+{tasks.length - 3} more tasks</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No tasks yet</p>
          )}
        </div>

        {/* Rooms List */}
        {project.rooms && project.rooms.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <DoorOpen className="w-4 h-4 text-slate-400" />
              <span>Rooms ({project.rooms.length})</span>
            </div>
            <div className="space-y-1.5">
              {project.rooms.slice(0, 3).map((room, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{room.room_name}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {room.cabinet_count && <span>{room.cabinet_count} cabinets</span>}
                    {room.style && <Badge variant="outline" className="text-xs py-0">{room.style}</Badge>}
                  </div>
                </div>
              ))}
              {project.rooms.length > 3 && (
                <p className="text-xs text-slate-400">+{project.rooms.length - 3} more rooms</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium text-slate-700">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-slate-100" />
        </div>

        {project.estimated_budget && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Budget</span>
            <span className="font-semibold text-slate-900">
              ${project.estimated_budget.toLocaleString()}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm font-medium">View Details</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </Card>

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        projectId={project.id}
        projectName={project.project_name}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        isLoading={createTaskMutation.isPending}
      />
    </Link>
  );
}