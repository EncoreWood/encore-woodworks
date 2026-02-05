import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

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
  const status = statusConfig[project.status] || statusConfig.inquiry;
  const type = typeConfig[project.project_type] || project.project_type;
  const priority = priorityConfig[project.priority] || priorityConfig.medium;
  
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                {project.project_name}
              </h3>
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
    </Link>
  );
}