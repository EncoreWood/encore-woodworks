import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Trash2, Upload, X, Send } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RoomManager({ open, onOpenChange, room, roomIndex, project, onSave }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(room || {
    room_name: "",
    cabinet_count: "",
    style: "",
    finish: "",
    notes: "",
    files: [],
    completed: false
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
      console.error("Upload failed:", error);
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
    const itemName = `${project.project_name} - ${formData.room_name || 'Room'} - ${file.name}`;
    
    // Update file to track it's in production
    const updatedFiles = [...formData.files];
    updatedFiles[fileIndex] = { ...file, in_production: true, production_stage: "face_frame" };
    setFormData(prev => ({ ...prev, files: updatedFiles }));
    
    // Immediately save the room with updated file status
    const updatedRooms = [...(project.rooms || [])];
    if (roomIndex !== null) {
      updatedRooms[roomIndex] = { ...formData, files: updatedFiles };
      base44.entities.Project.update(project.id, { rooms: updatedRooms });
    }
    
    // Create production item
    createProductionItemMutation.mutate({
      name: itemName,
      type: "cabinet",
      stage: "face_frame",
      project_id: project.id,
      project_name: project.project_name,
      room_name: formData.room_name,
      file_id: file.url, // Track which file this is
      files: [file],
      notes: `From project: ${project.project_name}\nRoom: ${formData.room_name || 'Unnamed'}\n${formData.notes || ''}`
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add Room"}</DialogTitle>
        </DialogHeader>
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
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  className="w-full"
                  asChild
                >
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
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber-600 hover:text-amber-700"
                          >
                            View file
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.in_production ? (
                          <Badge className="bg-blue-600 text-white text-xs">
                            In Production: {file.production_stage?.replace('_', ' ')}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
              {room ? "Update Room" : "Add Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}