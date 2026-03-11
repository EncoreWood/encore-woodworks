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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Edit, Trash2, User, Mail, Phone, MapPin, Calendar,
  DollarSign, Palette, Wrench, FileText, Loader2, DoorOpen,
  ExternalLink, Plus, Eye, PackageOpen, Paintbrush, TreePine, Save, X, Calculator
} from "lucide-react";
import { format } from "date-fns";
import ProjectForm from "../components/projects/ProjectForm";
import FileViewer from "../components/projects/FileViewer";
import ProposalForm from "../components/proposals/ProposalForm";
import ProposalViewer from "../components/proposals/ProposalViewer";
import RoomManager from "../components/projects/RoomManager";
import PaymentLog from "../components/projects/PaymentLog";
import PageSlideWrapper from "@/components/PageSlideWrapper";

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
  kitchen: "Kitchen", bathroom: "Bathroom", closet: "Closet", garage: "Garage",
  office: "Office", laundry: "Laundry", new_construction: "New Construction",
  remodel: "Remodel", custom: "Custom"
};

// Inline date editor for a single field
function InlineDateEdit({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const handleSave = () => { onSave(val); setEditing(false); };
  const handleCancel = () => { setVal(value || ""); setEditing(false); };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <Input type="date" value={val} onChange={e => setVal(e.target.value)} className="h-8 text-sm w-40" />
          <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}><Save className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}><X className="w-3 h-3" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-medium text-slate-900">{value ? format(new Date(value), "MMM d, yyyy") : <span className="text-slate-400 text-sm">Not set</span>}</p>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => { setVal(value || ""); setEditing(true); }}>
        <Edit className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function ProjectDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showProposalView, setShowProposalView] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingRoomIndex, setEditingRoomIndex] = useState(null);
  // inline section editing
  const [editingSection, setEditingSection] = useState(null); // 'notes', 'budget', 'client'
  const [sectionDraft, setSectionDraft] = useState({});
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then((res) => res[0]),
    enabled: !!projectId
  });

  const { data: proposal } = useQuery({
    queryKey: ["proposal", projectId],
    queryFn: () => base44.entities.Proposal.filter({ project_id: projectId }).then((res) => res[0]),
    enabled: !!projectId
  });

  const { data: projectOrders = [] } = useQuery({
    queryKey: ["projectOrders", projectId],
    queryFn: () => base44.entities.ProjectOrder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: linkedBids = [] } = useQuery({
    queryKey: ["bids_for_project", projectId],
    queryFn: () => base44.entities.Bid.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["project", projectId] });
      const previous = queryClient.getQueryData(["project", projectId]);
      queryClient.setQueryData(["project", projectId], old => old ? { ...old, ...data } : old);
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(["project", projectId], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowEditForm(false);
      setEditingSection(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => { window.location.href = createPageUrl("Kanban"); }
  });

  const saveProposalMutation = useMutation({
    mutationFn: (data) => proposal ? base44.entities.Proposal.update(proposal.id, data) : base44.entities.Proposal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", projectId] });
      setShowProposalForm(false);
    }
  });

  const handlePhaseToggle = (phase) => updateMutation.mutate({ [phase]: !project[phase] });

  const handleSaveRoom = (roomData) => {
    const updatedRooms = [...(project.rooms || [])];
    if (editingRoomIndex !== null) updatedRooms[editingRoomIndex] = roomData;
    else updatedRooms.push(roomData);
    updateMutation.mutate({ rooms: updatedRooms });
    setShowRoomManager(false);
    setEditingRoom(null);
    setEditingRoomIndex(null);
  };

  const handleDeleteRoom = (index) => {
    if (confirm("Delete this room?")) {
      updateMutation.mutate({ rooms: project.rooms.filter((_, i) => i !== index) });
    }
  };

  const startEditSection = (section) => {
    setSectionDraft({
      notes: project.notes || "",
      estimated_budget: project.estimated_budget || "",
      actual_cost: project.actual_cost || "",
      deposit_paid: project.deposit_paid || "",
    });
    setEditingSection(section);
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
        <Link to={createPageUrl("Kanban")}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.inquiry;
  const type = typeConfig[project.project_type] || project.project_type;

  const phases = [
    { key: "design_complete", label: "Design Complete", icon: Palette },
    { key: "materials_ordered", label: "Materials Ordered", icon: FileText },
    { key: "production_complete", label: "Production Complete", icon: Wrench },
    { key: "installation_complete", label: "Installation Complete", icon: MapPin }
  ];
  const completedPhases = phases.filter((p) => project[p.key]).length;
  const progress = (completedPhases / phases.length) * 100;

  const materialsOrderedProgress = (() => {
    if (projectOrders.length === 0) return 0;
    return (projectOrders.filter(o => ["ordered","received","installed"].includes(o.status)).length / projectOrders.length) * 100;
  })();

  return (
    <PageSlideWrapper>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl("Kanban")} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />Back to Projects
          </Link>
          {/* Mobile sticky back bar */}
          <div className="sm:hidden sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200 mb-4 flex items-center gap-2">
            <Link to={createPageUrl("Kanban")} className="flex items-center gap-1 text-amber-600 font-medium text-sm">
              <ArrowLeft className="w-4 h-4" /> Projects
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{project.project_name}</h1>
                <Badge className={cn("font-medium border-0", status.color)}>{status.label}</Badge>
              </div>
              <p className="text-slate-500">{type} Cabinets</p>
            </div>
            <div className="flex gap-2">
              {proposal ? (
                <>
                  <Button variant="outline" onClick={() => setShowProposalView(true)}><Eye className="w-4 h-4 mr-2" />View Proposal</Button>
                  <Button variant="outline" onClick={() => setShowProposalForm(true)}><Edit className="w-4 h-4 mr-2" />Edit Proposal</Button>
                </>
              ) : (
                <Button onClick={() => setShowProposalForm(true)} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 mr-2" />Create Proposal</Button>
              )}
              <Button variant="outline" onClick={() => setShowEditForm(true)}><Edit className="w-4 h-4 mr-2" />Edit Project</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteDialog(true)}>
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
                  <div key={phase.key}>
                    <div
                      className={cn("flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                        project[phase.key] ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                      onClick={() => handlePhaseToggle(phase.key)}
                    >
                      <Checkbox checked={project[phase.key]} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <phase.icon className={cn("w-5 h-5", project[phase.key] ? "text-emerald-600" : "text-slate-400")} />
                      <span className={cn("font-medium flex-1", project[phase.key] ? "text-emerald-700" : "text-slate-700")}>{phase.label}</span>
                      {phase.key === "materials_ordered" && (
                        <Link to={createPageUrl("OrdersBoard") + "?project=" + projectId}>
                          <Button size="sm" variant="outline" className="gap-2" onClick={(e) => e.stopPropagation()}>
                            <PackageOpen className="w-3 h-3" />Orders
                          </Button>
                        </Link>
                      )}
                      {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    </div>
                    {phase.key === "materials_ordered" && projectOrders.length > 0 && (
                      <div className="ml-14 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-600">Order Completion</span>
                          <span className="text-xs font-semibold text-slate-700">
                            {projectOrders.filter(o => ["ordered","received","installed"].includes(o.status)).length}/{projectOrders.length} orders
                          </span>
                        </div>
                        <Progress value={materialsOrderedProgress} className="h-1.5 bg-slate-200" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Specifications */}
            {(project.cabinet_style || project.hardware_type || project.finish || project.wood_types?.length > 0 || project.project_url || project.notes) && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Specifications</h2>
                  <Button size="sm" variant="outline" onClick={() => setShowEditForm(true)} className="gap-1 text-xs h-7">
                    <Edit className="w-3 h-3" />Edit
                  </Button>
                </div>
                <div className="space-y-4">
                  {project.cabinet_style && (
                    <div className="flex items-start gap-3">
                      <Palette className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div><p className="text-sm text-slate-500">Cabinet Style</p><p className="font-medium text-slate-900">{project.cabinet_style}</p></div>
                    </div>
                  )}
                  {project.hardware_type && (
                    <div className="flex items-start gap-3">
                      <Wrench className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div><p className="text-sm text-slate-500">Hardware</p><p className="font-medium text-slate-900">{project.hardware_type}</p></div>
                    </div>
                  )}
                  {project.finish && (
                    <div className="flex items-start gap-3">
                      <Paintbrush className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div><p className="text-sm text-slate-500">Finish</p><p className="font-medium text-slate-900">{project.finish}</p></div>
                    </div>
                  )}
                  {project.wood_types?.length > 0 && (
                    <div className="flex items-start gap-3">
                      <TreePine className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Wood Types</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {project.wood_types.map((wood, idx) => (
                            <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{wood}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {project.project_url && (
                    <div className="flex items-start gap-3">
                      <ExternalLink className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Project URL</p>
                        <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="font-medium text-amber-600 hover:text-amber-700 underline">{project.project_url}</a>
                      </div>
                    </div>
                  )}
                  {project.notes && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-500">Notes</p>
                        {editingSection === "notes" ? (
                          <div className="space-y-2 mt-1">
                            <Textarea value={sectionDraft.notes} onChange={e => setSectionDraft(d => ({...d, notes: e.target.value}))} rows={3} className="text-sm" />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateMutation.mutate({ notes: sectionDraft.notes })}>Save</Button>
                              <Button size="sm" variant="outline" className="h-7" onClick={() => setEditingSection(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between group">
                            <p className="text-slate-700 whitespace-pre-wrap flex-1">{project.notes}</p>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={() => startEditSection("notes")}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Project Files */}
            {project.files && project.files.length > 0 && (
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Files ({project.files.length})</h2>
                <div className="space-y-4">
                  {project.files.map((file, idx) => <FileViewer key={idx} file={file} />)}
                </div>
              </Card>
            )}

            {/* Rooms */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Rooms ({project.rooms?.length || 0})</h2>
                <div className="flex items-center gap-3">
                  {project.rooms?.length > 0 && (
                    <>
                      <span className="text-sm text-slate-500">{project.rooms.filter(r => r.completed).length}/{project.rooms.length} complete</span>
                      <Progress value={(project.rooms.filter(r => r.completed).length / project.rooms.length) * 100} className="w-24 h-2 bg-slate-100" />
                    </>
                  )}
                  <Button onClick={() => { setEditingRoom(null); setEditingRoomIndex(null); setShowRoomManager(true); }} size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />Add Room
                  </Button>
                </div>
              </div>
              {project.rooms?.length > 0 ? (
                <div className="space-y-3">
                  {project.rooms.map((room, idx) => (
                    <div
                      key={idx}
                      className={cn("p-4 rounded-lg border transition-all cursor-pointer hover:border-amber-300",
                        room.completed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
                      )}
                      onClick={() => { setEditingRoom(room); setEditingRoomIndex(idx); setShowRoomManager(true); }}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={room.completed}
                          onCheckedChange={(checked) => {
                            const updatedRooms = [...project.rooms];
                            updatedRooms[idx] = { ...room, completed: checked };
                            updateMutation.mutate({ rooms: updatedRooms });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <DoorOpen className={cn("w-5 h-5 mt-0.5", room.completed ? "text-emerald-600" : "text-amber-500")} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={cn("font-medium", room.completed ? "text-emerald-700" : "text-slate-900")}>{room.room_name || `Room ${idx + 1}`}</h3>
                            <div className="flex items-center gap-2">
                              {room.cabinet_count && <Badge variant="outline" className="text-xs">{room.cabinet_count} cabinets</Badge>}
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(idx); }} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {room.style && <div><span className="text-slate-500">Style:</span> <span className="text-slate-700">{room.style}</span></div>}
                            {room.finish && <div><span className="text-slate-500">Finish:</span> <span className="text-slate-700">{room.finish}</span></div>}
                          </div>
                          {room.notes && <p className="text-sm text-slate-600 mt-2">{room.notes}</p>}
                          {room.files?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-slate-500">Files ({room.files.length})</p>
                                {room.files.some(f => f.in_production) && (
                                  <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">{room.files.filter(f => f.in_production).length} in production</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {room.files.slice(0, 4).map((file, fIdx) => (
                                  <div key={fIdx} className="relative">
                                    {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <img src={file.url} alt={file.name} className="w-full h-16 object-cover rounded border border-slate-200" />
                                    ) : (
                                      <div className="w-full h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                    {file.in_production && (
                                      <Badge className="absolute -top-1 -right-1 text-xs bg-blue-600 h-4 px-1">{file.production_stage?.split('_')[0]}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {room.files.length > 4 && <p className="text-xs text-slate-500">+{room.files.length - 4} more files</p>}
                              <p className="text-xs text-slate-500">Click room to manage files</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No rooms added yet. Click "Add Room" to get started.</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Client Information</h2>
                <Button size="sm" variant="outline" onClick={() => setShowEditForm(true)} className="gap-1 text-xs h-7">
                  <Edit className="w-3 h-3" />Edit
                </Button>
              </div>
              <div className="space-y-4">
                {["contractor", "home_owner", "designer"].map((role) => {
                  const contact = project[role];
                  if (!contact?.name && !contact?.email && !contact?.phone) return null;
                  const labels = { contractor: "Contractor", home_owner: "Home Owner", designer: "Designer" };
                  return (
                    <div key={role} className="border rounded-lg p-3 space-y-1.5 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{labels[role]}</p>
                      {contact.name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="text-slate-800 font-medium">{contact.name}</span></div>}
                      {contact.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /><a href={`mailto:${contact.email}`} className="text-amber-600 hover:text-amber-700 text-sm">{contact.email}</a></div>}
                      {contact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><a href={`tel:${contact.phone}`} className="text-amber-600 hover:text-amber-700 text-sm">{contact.phone}</a></div>}
                    </div>
                  );
                })}
                {!project.contractor?.name && !project.home_owner?.name && !project.designer?.name && project.client_name && (
                  <div className="flex items-center gap-3"><User className="w-5 h-5 text-slate-400" /><span className="text-slate-700">{project.client_name}</span></div>
                )}
                {project.address && (
                  <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-slate-400 mt-0.5" /><span className="text-slate-700">{project.address}</span></div>
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <InlineDateEdit label="Start Date" value={project.start_date} onSave={(v) => updateMutation.mutate({ start_date: v })} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <InlineDateEdit label="Est. Completion" value={project.estimated_completion} onSave={(v) => updateMutation.mutate({ estimated_completion: v })} />
                  </div>
                </div>
                {project.actual_completion && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div><p className="text-sm text-slate-500">Completed</p><p className="font-medium text-emerald-700">{format(new Date(project.actual_completion), "MMM d, yyyy")}</p></div>
                  </div>
                )}
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Install Dates</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1">
                        <InlineDateEdit label="Install Start" value={project.install_start_date} onSave={(v) => updateMutation.mutate({ install_start_date: v })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1">
                        <InlineDateEdit label="Install End" value={project.install_end_date} onSave={(v) => updateMutation.mutate({ install_end_date: v })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Photos */}
            {(() => {
              const photos = (project.files || []).filter(f => f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
              if (photos.length === 0) return null;
              return (
                <Card className="p-6 bg-white border-0 shadow-sm">
                  <button
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowPhotos(p => !p)}
                  >
                    <h2 className="text-lg font-semibold text-slate-900">Project Photos ({photos.length})</h2>
                    <span className="text-sm text-amber-600">{showPhotos ? "Hide" : "View"}</span>
                  </button>
                  {showPhotos && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {photos.map((photo, idx) => (
                        <button key={idx} onClick={() => setLightboxPhoto(photo)} className="focus:outline-none">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-20 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Plan Bid */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-500" /> Plan Bids
                </h2>
                <a href={createPageUrl("PlanBidding") + "?project_id=" + projectId}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> New Bid
                  </Button>
                </a>
              </div>
              {linkedBids.length === 0 ? (
                <p className="text-sm text-slate-400">No bids linked yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedBids.map(bid => {
                    const statusColors = { draft: "bg-amber-100 text-amber-700", finalized: "bg-green-100 text-green-700", sent: "bg-blue-100 text-blue-700" };
                    return (
                      <a key={bid.id} href={createPageUrl("PlanBidding") + "?bid_id=" + bid.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{bid.project_name}</p>
                          <p className="text-xs text-slate-400">{bid.rooms?.length || 0} rooms · {bid.total_lf ? `${bid.total_lf} LF` : "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-800">${(bid.total || 0).toLocaleString()}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[bid.status] || statusColors.draft}`}>{bid.status || "draft"}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Payment Log */}
            <PaymentLog project={project} onSave={(data) => updateMutation.mutate(data)} />

            {/* Budget */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Budget</h2>
                {editingSection !== "budget" && (
                  <Button size="sm" variant="outline" onClick={() => startEditSection("budget")} className="gap-1 text-xs h-7">
                    <Edit className="w-3 h-3" />Edit
                  </Button>
                )}
              </div>
              {editingSection === "budget" ? (
                <div className="space-y-3">
                  <div><Label className="text-xs text-slate-500">Estimated Budget ($)</Label><Input type="number" value={sectionDraft.estimated_budget} onChange={e => setSectionDraft(d => ({...d, estimated_budget: e.target.value}))} className="h-8 text-sm mt-1" /></div>
                  <div><Label className="text-xs text-slate-500">Actual Cost ($)</Label><Input type="number" value={sectionDraft.actual_cost} onChange={e => setSectionDraft(d => ({...d, actual_cost: e.target.value}))} className="h-8 text-sm mt-1" /></div>
                  <div><Label className="text-xs text-slate-500">Deposit Paid ($)</Label><Input type="number" value={sectionDraft.deposit_paid} onChange={e => setSectionDraft(d => ({...d, deposit_paid: e.target.value}))} className="h-8 text-sm mt-1" /></div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateMutation.mutate({ estimated_budget: sectionDraft.estimated_budget ? parseFloat(sectionDraft.estimated_budget) : null, actual_cost: sectionDraft.actual_cost ? parseFloat(sectionDraft.actual_cost) : null, deposit_paid: sectionDraft.deposit_paid ? parseFloat(sectionDraft.deposit_paid) : null })}>Save</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setEditingSection(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.estimated_budget && (
                    <div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-slate-400" /><div><p className="text-sm text-slate-500">Estimated</p><p className="text-xl font-semibold text-slate-900">${project.estimated_budget.toLocaleString()}</p></div></div>
                  )}
                  {project.actual_cost && (
                    <div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-slate-400" /><div><p className="text-sm text-slate-500">Actual Cost</p><p className="text-xl font-semibold text-slate-900">${project.actual_cost.toLocaleString()}</p></div></div>
                  )}
                  {project.deposit_paid && (
                    <div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-emerald-500" /><div><p className="text-sm text-slate-500">Deposit Paid</p><p className="font-semibold text-emerald-700">${project.deposit_paid.toLocaleString()}</p></div></div>
                  )}
                  {!project.estimated_budget && !project.actual_cost && !project.deposit_paid && (
                    <p className="text-sm text-slate-400">No budget set</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Edit Form */}
        <ProjectForm open={showEditForm} onOpenChange={setShowEditForm} onSubmit={(data) => updateMutation.mutate(data)} initialData={project} isLoading={updateMutation.isPending} />

        {/* Proposal Form */}
        <Dialog open={showProposalForm} onOpenChange={setShowProposalForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{proposal ? "Edit Proposal" : "Create Proposal"}</DialogTitle></DialogHeader>
            <ProposalForm proposal={proposal} project={project} onSave={(data) => saveProposalMutation.mutate(data)} onCancel={() => setShowProposalForm(false)} />
          </DialogContent>
        </Dialog>

        {/* Proposal Viewer */}
        <Dialog open={showProposalView} onOpenChange={setShowProposalView}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Proposal - {project.project_name}</DialogTitle></DialogHeader>
            <ProposalViewer proposal={proposal} />
          </DialogContent>
        </Dialog>

        {/* Room Manager */}
        <RoomManager open={showRoomManager} onOpenChange={setShowRoomManager} room={editingRoom} roomIndex={editingRoomIndex} project={project} onSave={handleSaveRoom} />

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
            <DialogContent className="max-w-4xl p-2 bg-black border-0">
              <img src={lightboxPhoto.url} alt={lightboxPhoto.name} className="w-full max-h-[85vh] object-contain rounded" />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete "{project.project_name}"? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </PageSlideWrapper>
  );
}