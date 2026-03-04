import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import FileUploader from "../projects/FileUploader";

const initialFormState = {
  name: "",
  type: "cabinet",
  stage: "face_frame",
  files: [],
  notes: ""
};

// jobInfoProjects: if provided, form is in "Job Info" mode — shows project dropdown instead of type, hides stage
export default function ProductionItemForm({ open, onOpenChange, onSubmit, initialData, isLoading, jobInfoProjects }) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      setFormData(initialData || initialFormState);
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {initialData ? "Edit Production Item" : "Add Production Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Kitchen Upper Cabinets"
              required
            />
          </div>

          {jobInfoProjects ? (
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select
                value={formData.project_id || ""}
                onValueChange={(v) => {
                  const proj = jobInfoProjects.find(p => p.id === v);
                  handleChange("project_id", v);
                  handleChange("project_name", proj?.project_name || "");
                  handleChange("type", "cabinet");
                  handleChange("stage", "face_frame");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {jobInfoProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cabinet">Cabinet</SelectItem>
                    <SelectItem value="misc">Misc</SelectItem>
                    <SelectItem value="pickup">Pick up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Starting Stage</Label>
                <Select value={formData.stage} onValueChange={(v) => handleChange("stage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="face_frame">Face Frame</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <FileUploader
              files={formData.files || []}
              onChange={(files) => handleChange("files", files)}
              label="Attach Files"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}