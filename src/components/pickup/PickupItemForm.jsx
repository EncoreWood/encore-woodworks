import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Factory, PenLine, X } from "lucide-react";
import FileUploader from "@/components/projects/FileUploader";
import SketchPad from "@/components/production/SketchPad";

const defaultForm = {
  title: "",
  type: "missing",
  status: "open",
  priority: "medium",
  room_name: "",
  notes: "",
  files: [],
  sketch_url: null,
  linkToProduction: false,
  productionStage: "face_frame"
};

export default function PickupItemForm({ open, onOpenChange, onSubmit, initialData, projectId, projectName, rooms = [], isLoading }) {
  const [form, setForm] = useState(defaultForm);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [showSketch, setShowSketch] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    enabled: open
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectRooms = selectedProject?.rooms || rooms;
  const isEditing = !!(initialData?.id);

  useEffect(() => {
    if (open) {
      setSelectedProjectId(initialData?.project_id || projectId || "");
      setShowSketch(false);
      setForm(initialData ? {
        title: initialData.title || "",
        type: initialData.type || "missing",
        status: initialData.status || "open",
        priority: initialData.priority || "medium",
        room_name: initialData.room_name || "",
        notes: initialData.notes || "",
        files: initialData.files || [],
        sketch_url: initialData.sketch_url || null,
        linkToProduction: false,
        productionStage: "face_frame"
      } : defaultForm);
    }
  }, [open, initialData, projectId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    const { linkToProduction, productionStage, ...itemData } = form;
    onSubmit({
      ...itemData,
      project_id: selectedProjectId || projectId,
      project_name: proj?.project_name || projectName || "",
      source: initialData?.source || "manual",
      linkToProduction: !isEditing && linkToProduction,
      productionStage: !isEditing && linkToProduction ? productionStage : undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Pickup Item" : "Add Pickup Item"}</DialogTitle>
          {projectName && <p className="text-sm text-slate-500">{projectName}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!projectId && (
            <div>
              <Label>Project *</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be picked up or done?"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="reorder">Reorder</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Room</Label>
              {projectRooms.length > 0 ? (
                <Select value={form.room_name} onValueChange={(v) => setForm({ ...form, room_name: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select room..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific room</SelectItem>
                    {projectRooms.map((r, i) => (
                      <SelectItem key={i} value={r.room_name || r}>{r.room_name || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.room_name}
                  onChange={(e) => setForm({ ...form, room_name: e.target.value })}
                  placeholder="Room name..."
                  className="mt-1"
                />
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              className="mt-1 h-20"
            />
          </div>

          {/* Link to Production toggle — only on new items */}
          {!isEditing && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-amber-600" />
                  <Label className="cursor-pointer">Link to Production Board</Label>
                </div>
                <Switch
                  checked={form.linkToProduction}
                  onCheckedChange={(v) => setForm({ ...form, linkToProduction: v })}
                />
              </div>
              {form.linkToProduction && (
                <div>
                  <Label className="text-xs text-slate-500">Starting Stage</Label>
                  <Select value={form.productionStage} onValueChange={(v) => setForm({ ...form, productionStage: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="face_frame">Face Frame</SelectItem>
                      <SelectItem value="spray">Spray</SelectItem>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">A moveable card will be created in the Production board. Moving it there will update the stage shown here.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={isLoading || !form.title.trim() || (!projectId && !selectedProjectId)}>
              {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}