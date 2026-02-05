import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Palette,
  Wrench,
  FileText,
  Loader2,
  DoorOpen,
  FileIcon,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import ProjectForm from "../components/projects/ProjectForm";
import FileViewer from "../components/projects/FileViewer";

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

export default function ProjectDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then((res) => res[0]),
    enabled: !!projectId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowEditForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      window.location.href = createPageUrl("Dashboard");
    }
  });

  const handlePhaseToggle = (phase) => {
    updateMutation.mutate({ [phase]: !project[phase] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Project not found</h2>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.inquiry;
  const type = typeConfig[project.project_type] || project.project_type;

  // Calculate progress
  const phases = [
    { key: "design_complete", label: "Design Complete", icon: Palette },
    { key: "materials_ordered", label: "Materials Ordered", icon: FileText },
    { key: "production_complete", label: "Production Complete", icon: Wrench },
    { key: "installation_complete", label: "Installation Complete", icon: MapPin }
  ];
  const completedPhases = phases.filter((p) => project[p.key]).length;
  const progress = (completedPhases / phases.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Projects
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{project.project_name}</h1>
                <Badge className={cn("font-medium border-0", status.color)}>{status.label}</Badge>
              </div>
              <p className="text-slate-500">{type} Cabinets</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditForm(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Progress</h2>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Overall Completion</span>
                  <span className="text-sm font-semibold text-slate-700">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-100" />
              </div>

              <div className="space-y-4">
                {phases.map((phase) => (
                  <div
                    key={phase.key}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                      project[phase.key]
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                    onClick={() => handlePhaseToggle(phase.key)}
                  >
                    <Checkbox
                      checked={project[phase.key]}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <phase.icon
                      className={cn(
                        "w-5 h-5",
                        project[phase.key] ? "text-emerald-600" : "text-slate-400"
                      )}
                    />
                    <span
                      className={cn(
                        "font-medium",
                        project[phase.key] ? "text-emerald-700" : "text-slate-700"
                      )}
                    >
                      {phase.label}
                    </span>
                    {updateMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Project Files */}
            {project.files && project.files.length > 0 && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Project Files ({project.files.length})
                </h2>
                <div className="space-y-4">
                  {project.files.map((file, idx) => (
                    <FileViewer key={idx} file={file} />
                  ))}
                </div>
              </Card>
            )}

            {/* Rooms */}
            {project.rooms && project.rooms.length > 0 && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Rooms ({project.rooms.length})
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {project.rooms.filter(r => r.completed).length}/{project.rooms.length} complete
                    </span>
                    <Progress 
                      value={(project.rooms.filter(r => r.completed).length / project.rooms.length) * 100} 
                      className="w-24 h-2 bg-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {project.rooms.map((room, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        room.completed 
                          ? "bg-emerald-50 border-emerald-200" 
                          : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={room.completed}
                          onCheckedChange={(checked) => {
                            const updatedRooms = [...project.rooms];
                            updatedRooms[idx] = { ...room, completed: checked };
                            updateMutation.mutate({ rooms: updatedRooms });
                          }}
                          className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <DoorOpen className={cn(
                          "w-5 h-5 mt-0.5",
                          room.completed ? "text-emerald-600" : "text-amber-500"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={cn(
                              "font-medium",
                              room.completed ? "text-emerald-700" : "text-slate-900"
                            )}>
                              {room.room_name || `Room ${idx + 1}`}
                            </h3>
                            {room.cabinet_count && (
                              <Badge variant="outline" className="text-xs">
                                {room.cabinet_count} cabinets
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {room.style && (
                              <div>
                                <span className="text-slate-500">Style:</span>{" "}
                                <span className="text-slate-700">{room.style}</span>
                              </div>
                            )}
                            {room.finish && (
                              <div>
                                <span className="text-slate-500">Finish:</span>{" "}
                                <span className="text-slate-700">{room.finish}</span>
                              </div>
                            )}
                          </div>
                          {room.notes && (
                            <p className="text-sm text-slate-600 mt-2">{room.notes}</p>
                          )}
                          {room.files && room.files.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium text-slate-500 mb-2">Files:</p>
                              {room.files.map((file, fileIdx) => (
                                <FileViewer key={fileIdx} file={file} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Specifications */}
            {(project.cabinet_style || project.hardware_type || project.notes) && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Specifications</h2>
                <div className="space-y-4">
                  {project.cabinet_style && (
                    <div className="flex items-start gap-3">
                      <Palette className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Cabinet Style</p>
                        <p className="font-medium text-slate-900">{project.cabinet_style}</p>
                      </div>
                    </div>
                  )}
                  {project.hardware_type && (
                    <div className="flex items-start gap-3">
                      <Wrench className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Hardware</p>
                        <p className="font-medium text-slate-900">{project.hardware_type}</p>
                      </div>
                    </div>
                  )}
                  {project.notes && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Notes</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{project.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Client Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-700">{project.client_name}</span>
                </div>
                {project.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <a href={`mailto:${project.client_email}`} className="text-amber-600 hover:text-amber-700">
                      {project.client_email}
                    </a>
                  </div>
                )}
                {project.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <a href={`tel:${project.client_phone}`} className="text-amber-600 hover:text-amber-700">
                      {project.client_phone}
                    </a>
                  </div>
                )}
                {project.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <span className="text-slate-700">{project.address}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                {project.start_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Start Date</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(project.start_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {project.estimated_completion && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Est. Completion</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(project.estimated_completion), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {project.actual_completion && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-slate-500">Completed</p>
                      <p className="font-medium text-emerald-700">
                        {format(new Date(project.actual_completion), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Budget */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Budget</h2>
              <div className="space-y-4">
                {project.estimated_budget && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Estimated</p>
                      <p className="text-xl font-semibold text-slate-900">
                        ${project.estimated_budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {project.actual_cost && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Actual Cost</p>
                      <p className="text-xl font-semibold text-slate-900">
                        ${project.actual_cost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {project.deposit_paid && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-slate-500">Deposit Paid</p>
                      <p className="font-semibold text-emerald-700">
                        ${project.deposit_paid.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Edit Form */}
        <ProjectForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          onSubmit={(data) => updateMutation.mutate(data)}
          initialData={project}
          isLoading={updateMutation.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{project.project_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}