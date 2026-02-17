import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Trash2, Upload, X, Send, Edit, FileText, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RoomManager({ open, onOpenChange, room, roomIndex, project, onSave }) {
  const queryClient = useQueryClient();
  const isNewRoom = roomIndex === null || roomIndex === undefined;
  const [isEditing, setIsEditing] = useState(isNewRoom);
  const [formData, setFormData] = useState({
    room_name: "",
    cabinet_count: "",
    style: "",
    finish: "",
    notes: "",
    files: [],
    completed: false,
    ...room
  });
  const [uploading, setUploading] = useState(false);

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
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({
          ...prev,
          files: [...(prev.files || []), { name: file.name, url: file_url }]
        }));
      }
    } catch (error) {
      toast.error("Failed to upload file");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSendToProduction = (file, fileIndex) => {
    const updatedFiles = [...formData.files];
    updatedFiles[fileIndex] = { ...file, in_production: true, production_stage: "face_frame" };
    setFormData(prev => ({ ...prev, files: updatedFiles }));

    const updatedRooms = [...(project.rooms || [])];
    if (roomIndex !== null && roomIndex !== undefined) {
      const roomToSave = {
        ...formData,
        cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined,
        files: updatedFiles
      };
      updatedRooms[roomIndex] = roomToSave;
      base44.entities.Project.update(project.id, { rooms: updatedRooms });
    }

    createProductionItemMutation.mutate({
      name: `${project.project_name} - ${formData.room_name || 'Room'} - ${file.name}`,
      type: "cabinet",
      stage: "face_frame",
      project_id: project.id,
      project_name: project.project_name,
      room_name: formData.room_name,
      file_id: file.url,
      files: [file],
      notes: `From project: ${project.project_name}\nRoom: ${formData.room_name || 'Unnamed'}\n${formData.notes || ''}`
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined
    };
    onSave(dataToSave);
    setIsEditing(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsEditing(isNewRoom);
  };

  const displayData = formData;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>
              {isNewRoom ? "Add Room" : displayData.room_name || "Room Details"}
            </DialogTitle>
            {!isNewRoom && !isEditing && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* VIEW MODE */}
        {!isEditing ? (
          <div className="space-y-5">
            {/* Status */}
            <div className="flex items-center gap-2">
              {displayData.completed ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600">
                  <Circle className="w-3 h-3 mr-1" /> In Progress
                </Badge>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {displayData.cabinet_count && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Cabinet Count</p>
                  <p className="font-semibold text-slate-900">{displayData.cabinet_count}</p>
                </div>
              )}
              {displayData.style && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Style</p>
                  <p className="font-semibold text-slate-900">{displayData.style}</p>
                </div>
              )}
              {displayData.finish && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Finish</p>
                  <p className="font-semibold text-slate-900">{displayData.finish}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {displayData.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">Notes</p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                  {displayData.notes}
                </p>
              </div>
            )}

            {/* Files */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">
                Files {displayData.files?.length > 0 && `(${displayData.files.length})`}
              </p>
              {displayData.files && displayData.files.length > 0 ? (
                <div className="space-y-3">
                  {displayData.files.map((file, idx) => (
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
                        {file.in_production ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            {file.production_stage?.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendToProduction(file, idx)}
                            className="text-blue-600 hover:text-blue-700 text-xs h-7"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            To Production
                          </Button>
                        )}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No files attached</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_name">Room Name</Label>
                <Input
                  id="room_name"
                  value={formData.room_name}
                  onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  placeholder="e.g., Kitchen, Master Bath"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabinet_count">Cabinet Count</Label>
                <Input
                  id="cabinet_count"
                  type="number"
                  value={formData.cabinet_count}
                  onChange={(e) => setFormData({ ...formData, cabinet_count: e.target.value })}
                  placeholder="Number of cabinets"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="style">Style</Label>
                <Input
                  id="style"
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  placeholder="Cabinet style"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="finish">Finish</Label>
                <Input
                  id="finish"
                  value={formData.finish}
                  onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                  placeholder="Finish/color"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Room-specific notes"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Files</Label>
              <div className="mt-2">
                <label className="cursor-pointer">
                  <input type="file" multiple onChange={handleFileUpload} disabled={uploading} className="hidden" />
                  <Button type="button" variant="outline" disabled={uploading} className="w-full" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Files"}
                    </span>
                  </Button>
                </label>

                {formData.files && formData.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {file.url && file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                              <Upload className="w-5 h-5 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:text-amber-700">
                              View file
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.in_production ? (
                            <Badge className="bg-blue-600 text-white text-xs">
                              In Production: {file.production_stage?.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendToProduction(file, idx)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              To Production
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveFile(idx)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              {!isNewRoom && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
              {isNewRoom && (
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              )}
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                {isNewRoom ? "Add Room" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}