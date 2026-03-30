import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, Box, X, PenLine, ImageIcon } from "lucide-react";
import FileUploader from "../projects/FileUploader";
import GlbViewer from "@/components/cad/GlbViewer";
import SketchPad from "@/components/production/SketchPad";
import { base44 } from "@/api/base44Client";

const initialFormState = {
  name: "",
  type: "cabinet",
  stage: "face_frame",
  files: [],
  notes: "",
  is_job_info: false,
  sketch_url: null
};

// jobInfoProjects: if provided, form is in "Job Info" mode — shows project dropdown instead of type, hides stage
export default function ProductionItemForm({ open, onOpenChange, onSubmit, initialData, isLoading, jobInfoProjects }) {
  const [formData, setFormData] = useState(initialFormState);
  const [uploadingGlb, setUploadingGlb] = useState(false);
  const [showGlb, setShowGlb] = useState(false);
  const glbInputRef = useRef(null);

  const handleGlbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGlb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, glb_url: file_url, glb_name: file.name }));
    setUploadingGlb(false);
    e.target.value = "";
  };

  const removeGlb = () => setFormData(prev => ({ ...prev, glb_url: null, glb_name: null }));

  const [showSketch, setShowSketch] = useState(false);
  const handleSketchSave = (url) => {
    setFormData(prev => ({ ...prev, sketch_url: url }));
    setShowSketch(false);
  };

  useEffect(() => {
    if (open) {
      setFormData(initialData || initialFormState);
      setShowSketch(false);
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
    <>
      {showSketch && (
        <SketchPad
          existingImageUrl={formData.sketch_url}
          onClose={() => setShowSketch(false)}
          onSave={handleSketchSave}
        />
      )}
      <Dialog open={open && !showSketch} onOpenChange={(v) => { if (!showSketch) onOpenChange(v); }}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base font-semibold text-slate-900">
            {initialData ? "Edit Production Item" : "Add Production Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Kitchen Upper Cabinets"
                required
                className="h-9 text-sm"
              />
            </div>

            {jobInfoProjects ? (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Project *</Label>
                <Select
                  value={formData.project_id || ""}
                  onValueChange={(v) => {
                    const proj = jobInfoProjects.find(p => p.id === v);
                    handleChange("project_id", v);
                    handleChange("project_name", proj?.project_name || "");
                    handleChange("type", "cabinet");
                    handleChange("stage", "face_frame");
                    handleChange("is_job_info", true);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {jobInfoProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Type *</Label>
                  <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cabinet">Cabinet</SelectItem>
                      <SelectItem value="misc">Misc</SelectItem>
                      <SelectItem value="pickup">Pick up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Starting Stage</Label>
                  <Select value={formData.stage} onValueChange={(v) => handleChange("stage", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cut">Cut</SelectItem>
                      <SelectItem value="face_frame">Face Frame</SelectItem>
                      <SelectItem value="spray">Spray</SelectItem>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Points (PTS)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.pts ?? ""}
                onChange={(e) => handleChange("pts", e.target.value === "" ? undefined : parseFloat(e.target.value))}
                placeholder="e.g. 1.5"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <FileUploader
              files={formData.files || []}
              onChange={(files) => handleChange("files", files)}
              label="Attach Files"
            />

            {/* 3D Model */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">3D Model (GLB)</Label>
              {formData.glb_url ? (
                <div className="flex items-center gap-2 p-2 border border-indigo-200 bg-indigo-50 rounded-lg">
                  <Box className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-xs text-indigo-700 flex-1 truncate">{formData.glb_name || "3D Model"}</span>
                  <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs text-indigo-600 border-indigo-300" onClick={() => setShowGlb(true)}>View</Button>
                  <button type="button" onClick={removeGlb} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <>
                  <input ref={glbInputRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleGlbUpload} />
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed text-xs h-8"
                    onClick={() => glbInputRef.current?.click()} disabled={uploadingGlb}>
                    {uploadingGlb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingGlb ? "Uploading..." : "Upload 3D Model"}
                  </Button>
                </>
              )}
            </div>

            {showGlb && formData.glb_url && (
              <GlbViewer file={{ url: formData.glb_url, name: formData.glb_name || "3D Model" }} onClose={() => setShowGlb(false)} />
            )}

            {/* Sketch */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Sketch / Drawing</Label>
              {formData.sketch_url ? (
                <div className="space-y-1.5">
                  <img src={formData.sketch_url} alt="Sketch" className="w-full rounded-lg border border-slate-200 max-h-32 object-contain bg-white" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setShowSketch(true)}>
                      <PenLine className="w-3 h-3" /> Edit
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1 text-xs h-7 text-red-600 border-red-200"
                      onClick={() => setFormData(prev => ({ ...prev, sketch_url: null }))}>
                      <X className="w-3 h-3" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed text-xs h-8" onClick={() => setShowSketch(true)}>
                  <PenLine className="w-3.5 h-3.5" /> Open Sketch Pad
                </Button>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex justify-end gap-2 pt-3 border-t flex-shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {initialData ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}