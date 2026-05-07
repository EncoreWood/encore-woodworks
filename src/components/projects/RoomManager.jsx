import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Edit, CheckCircle2, Circle, Send, Trash2, FileText, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SelectionsTab from "@/components/projects/room-tabs/SelectionsTab";
import PhotosTasksTab from "@/components/projects/room-tabs/PhotosTasksTab";
import ShopFilesTab from "@/components/projects/room-tabs/ShopFilesTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "selections", label: "🎨 Selections" },
  { id: "photos", label: "📸 3Ds & Tasks" },
  { id: "shop", label: "🔧 Shop" },
];

export default function RoomManager({ open, onOpenChange, room, roomIndex, project, onSave, currentUser }) {
  const queryClient = useQueryClient();
  const isNewRoom = roomIndex === null || roomIndex === undefined;
  const [isEditing, setIsEditing] = useState(isNewRoom);
  const [activeTab, setActiveTab] = useState("selections");
  const [formData, setFormData] = useState({
    room_name: "",
    cabinet_count: "",
    style: "",
    finish: "",
    notes: "",
    files: [],
    completed: false,
    cabinet_style: "",
    wood_species: "",
    door_style: "",
    handles: "",
    drawer_glides: "",
    hinges: "",
    molding: "",
    cabs_to_height: "",
    custom_selections: [],
    ...room
  });

  useEffect(() => {
    const newIsNew = roomIndex === null || roomIndex === undefined;
    setIsEditing(newIsNew);
    setActiveTab("selections");
    setFormData({
      room_name: "",
      cabinet_count: "",
      style: "",
      finish: "",
      notes: "",
      files: [],
      completed: false,
      cabinet_style: "",
      wood_species: "",
      door_style: "",
      handles: "",
      drawer_glides: "",
      hinges: "",
      molding: "",
      cabs_to_height: "",
      custom_selections: [],
      ...room
    });
  }, [room, roomIndex]);

  const [uploading, setUploading] = useState(false);

  // Fetch live production items for legacy files
  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
    enabled: open && !!project?.id && (formData.files || []).length > 0
  });

  const filesWithLiveStatus = (formData.files || []).map(file => {
    const match = productionItems.find(
      pi => pi.project_id === project?.id &&
        pi.room_name === formData.room_name &&
        (pi.file_id === file.url || pi.files?.some(f => f.url === file.url || f.name === file.name))
    );
    return match ? { ...file, in_production: true, production_stage: match.stage } : file;
  });

  const createProductionItemMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      toast.success("File sent to production board");
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, files: [...(prev.files || []), { name: file.name, url: file_url }] }));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const handleSendToProduction = (file, fileIndex) => {
    const currentFile = formData.files[fileIndex];
    const updatedFiles = [...formData.files];
    updatedFiles[fileIndex] = { ...currentFile, in_production: true, production_stage: "face_frame" };
    setFormData(prev => ({ ...prev, files: updatedFiles }));

    const updatedRooms = [...(project.rooms || [])];
    if (roomIndex !== null && roomIndex !== undefined) {
      updatedRooms[roomIndex] = { ...formData, cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined, files: updatedFiles };
      base44.entities.Project.update(project.id, { rooms: updatedRooms });
    }

    createProductionItemMutation.mutate({
      name: `${project.project_name} - ${formData.room_name || 'Room'} - ${currentFile.name}`,
      type: "cabinet",
      stage: "face_frame",
      project_id: project.id,
      project_name: project.project_name,
      room_name: formData.room_name,
      file_id: currentFile.url,
      files: [currentFile],
      notes: `From project: ${project.project_name}\nRoom: ${formData.room_name || 'Unnamed'}\n${formData.notes || ''}`
    });
  };

  const handlePtsChange = (fileIdx, newPts) => {
    const updated = [...(formData.files || [])];
    updated[fileIdx] = { ...updated[fileIdx], pts: newPts === "" ? undefined : Number(newPts) };
    setFormData(prev => ({ ...prev, files: updated }));
  };

  const handlePtsSave = async () => {
    if (roomIndex === null || roomIndex === undefined) return;
    const dataToSave = { ...formData, cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined };
    const updatedRooms = [...(project.rooms || [])];
    updatedRooms[roomIndex] = dataToSave;
    await base44.entities.Project.update(project.id, { rooms: updatedRooms });
    for (const pi of productionItems) {
      if (pi.project_id !== project?.id || pi.room_name !== formData.room_name) continue;
      const updatedPiFiles = (pi.files || []).map(pf => {
        const match = formData.files.find(f => f.url === pf.url || f.name === pf.name);
        return match ? { ...pf, pts: match.pts } : pf;
      });
      if (JSON.stringify(updatedPiFiles) !== JSON.stringify(pi.files)) {
        await base44.entities.ProductionItem.update(pi.id, { files: updatedPiFiles });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast.success("PTS saved");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData, cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined };
    onSave(dataToSave);
    setIsEditing(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsEditing(isNewRoom);
  };

  const roomName = formData.room_name || (roomIndex !== null && roomIndex !== undefined ? `Room ${roomIndex + 1}` : "New Room");
  const roomId = project?.id && roomIndex !== null ? `${project.id}_${roomIndex}` : undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <DialogTitle>
                {isNewRoom ? "Add Room" : (formData.room_name || "Room Details")}
              </DialogTitle>
              {!isNewRoom && (
                formData.completed ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-xs">
                    <Circle className="w-3 h-3 mr-1" /> In Progress
                  </Badge>
                )
              )}
            </div>
            {!isNewRoom && !isEditing && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" /> Edit Name
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* New room form: just name */}
        {isNewRoom ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="room_name">Room Name</Label>
              <Input
                id="room_name"
                value={formData.room_name}
                onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                placeholder="e.g., Kitchen, Master Bath"
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={!formData.room_name.trim()}>
                Add Room
              </Button>
            </div>
          </form>
        ) : (
          <>
            {/* Edit room name inline */}
            {isEditing && (
              <form onSubmit={handleSubmit} className="mb-3 flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="room_name_edit" className="text-xs">Room Name</Label>
                  <Input
                    id="room_name_edit"
                    value={formData.room_name}
                    onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 h-9">Save</Button>
                <Button type="button" variant="outline" className="h-9" onClick={() => setIsEditing(false)}>Cancel</Button>
              </form>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "border-amber-500 text-amber-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "selections" && (
              <SelectionsTab
                formData={formData}
                setFormData={setFormData}
                project={project}
                roomIndex={roomIndex}
                readOnly={false}
                onSaved={(savedData) => {
                  setFormData(prev => ({ ...prev, ...savedData }));
                }}
              />
            )}

            {activeTab === "photos" && (
              <PhotosTasksTab
                project={project}
                roomName={roomName}
                roomId={roomId}
                currentUser={currentUser}
                readOnly={false}
              />
            )}

            {activeTab === "shop" && (
              <ShopFilesTab
                project={project}
                roomName={roomName}
                roomId={roomId}
                currentUser={currentUser}
              />
            )}

            {/* Legacy files (if any exist) — shown in Selections tab area below */}
            {activeTab === "selections" && filesWithLiveStatus.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">Legacy Files ({filesWithLiveStatus.length})</p>
                  <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handlePtsSave}>Save PTS</Button>
                </div>
                <div className="space-y-3">
                  {filesWithLiveStatus.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      {file.url && file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={file.url} alt={file.name} className="w-14 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        {file.in_production && (
                          <Badge className="mt-1 bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            In Production: {file.production_stage?.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-500">PTS</span>
                          <input
                            type="number" min="0"
                            value={formData.files?.[idx]?.pts ?? ""}
                            onChange={(e) => handlePtsChange(idx, e.target.value)}
                            className="w-14 h-7 text-xs border border-slate-300 rounded px-1 text-center"
                            placeholder="0"
                          />
                        </div>
                        {file.in_production ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{file.production_stage?.replace(/_/g, ' ')}</Badge>
                        ) : (
                          <Button type="button" size="sm" variant="outline" onClick={() => handleSendToProduction(file, idx)} className="text-blue-600 hover:text-blue-700 text-xs h-7">
                            <Send className="w-3 h-3 mr-1" /> To Production
                          </Button>
                        )}
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}