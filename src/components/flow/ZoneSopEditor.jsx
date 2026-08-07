import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, X, Loader2, Upload, Image as ImageIcon, Video } from "lucide-react";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Steps are stored as objects {text, image_url, video_url, subtasks}. Older
// records stored plain strings — normalize them on load so the editor always
// works with objects (with an empty subtasks array).
const normalizeStep = (s) =>
  typeof s === "string"
    ? { text: s, image_url: "", video_url: "", subtasks: [] }
    : { text: s?.text || "", image_url: s?.image_url || "", video_url: s?.video_url || "", subtasks: Array.isArray(s?.subtasks) ? s.subtasks : [] };

const EMPTY = {
  title: "",
  overview: "",
  required_ppe: [],
  steps: [],
  common_mistakes: "",
  safety_notes: "",
  training_video_url: "",
  photos: [],
};

export default function ZoneSopEditor({ open, onOpenChange, zone, existingSop, zoneType }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [ppeInput, setPpeInput] = useState("");
  const [stepInput, setStepInput] = useState("");
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStep, setUploadingStep] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (existingSop) {
      setForm({
        title: existingSop.title || "",
        overview: existingSop.overview || "",
        required_ppe: existingSop.required_ppe || [],
        steps: (existingSop.steps || []).map(normalizeStep),
        common_mistakes: existingSop.common_mistakes || "",
        safety_notes: existingSop.safety_notes || "",
        training_video_url: existingSop.training_video_url || "",
        photos: existingSop.photos || [],
      });
    } else {
      const defaultTitle = zone?.name
        ? `${zone.name} Operation`
        : zoneType ? `${cap(zoneType)} Operation` : "";
      setForm({ ...EMPTY, title: defaultTitle });
    }
    setPpeInput("");
    setStepInput("");
  }, [open, existingSop, zone, zoneType]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shopZoneSops"] });

  const handleSave = async () => {
    if (!form.title.trim() || (!zone && !zoneType)) return;
    setSaving(true);
    try {
      const payload = {
        zone_id: zone?.id || null,
        zone_name: zone?.name || (zoneType ? cap(zoneType) : ""),
        zone_type: zoneType || zone?.zone_type || null,
        title: form.title.trim(),
        overview: form.overview,
        required_ppe: form.required_ppe,
        steps: form.steps,
        common_mistakes: form.common_mistakes,
        safety_notes: form.safety_notes,
        training_video_url: form.training_video_url,
        photos: form.photos,
      };
      let result;
      if (existingSop) {
        result = await base44.entities.ShopZoneSOP.update(existingSop.id, payload);
        console.log("✅ ShopZoneSOP.update succeeded:", result);
        toast({ title: "✅ SOP saved to database" });
      } else {
        result = await base44.entities.ShopZoneSOP.create(payload);
        console.log("✅ ShopZoneSOP.create succeeded:", result);
        toast({ title: "✅ SOP saved to database" });
      }
      await invalidate();
      onOpenChange(false);
    } catch (err) {
      console.error("❌ ShopZoneSOP save FAILED:", err);
      toast({ title: "Failed to save SOP", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSop) return;
    if (!confirm(`Delete SOP for "${zone?.name || cap(zoneType)}"?`)) return;
    setSaving(true);
    try {
      await base44.entities.ShopZoneSOP.delete(existingSop.id);
      console.log("✅ ShopZoneSOP.delete succeeded:", existingSop.id);
      toast({ title: "✅ SOP deleted" });
      await invalidate();
      onOpenChange(false);
    } catch (err) {
      console.error("❌ ShopZoneSOP.delete FAILED:", err);
      toast({ title: "Failed to delete SOP", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addPpe = () => {
    const v = ppeInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, required_ppe: [...f.required_ppe, v] }));
    setPpeInput("");
  };
  const removePpe = (i) => setForm((f) => ({ ...f, required_ppe: f.required_ppe.filter((_, idx) => idx !== i) }));

  const addStep = () => {
    const v = stepInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, steps: [...f.steps, { text: v, image_url: "", video_url: "" }] }));
    setStepInput("");
  };
  const removeStep = (i) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const addSubtask = (i) => {
    const v = (subtaskInputs[i] || "").trim();
    if (!v) return;
    setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, subtasks: [...(x.subtasks || []), v] } : x)) }));
    setSubtaskInputs((p) => ({ ...p, [i]: "" }));
  };
  const removeSubtask = (stepIdx, subIdx) =>
    setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === stepIdx ? { ...x, subtasks: (x.subtasks || []).filter((_, s) => s !== subIdx) } : x)) }));
  const updateSubtask = (stepIdx, subIdx, val) =>
    setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === stepIdx ? { ...x, subtasks: (x.subtasks || []).map((s, si) => (si === subIdx ? val : s)) } : x)) }));

  const handleStepImageUpload = async (e, i) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStep(i);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, image_url: file_url } : x)) }));
    } finally {
      setUploadingStep(null);
      e.target.value = "";
    }
  };
  const removeStepImage = (i) =>
    setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, image_url: "" } : x)) }));

  const handleStepVideoUpload = async (e, i) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStep(i);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, video_url: file_url } : x)) }));
    } finally {
      setUploadingStep(null);
      e.target.value = "";
    }
  };
  const removeStepVideo = (i) =>
    setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, video_url: "" } : x)) }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, photos: [...f.photos, file_url] }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const removePhoto = (i) => setForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 SOP: {zone?.name || `${cap(zoneType)} (type)`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. CNC Router Operation" />
          </div>

          {/* Overview */}
          <div className="space-y-1">
            <Label className="text-xs">Overview</Label>
            <Textarea value={form.overview} onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))} rows={2} placeholder="What this station does..." />
          </div>

          {/* PPE */}
          <div className="space-y-1.5">
            <Label className="text-xs">Required PPE</Label>
            <div className="flex flex-wrap gap-1.5">
              {form.required_ppe.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                  {p}
                  <button onClick={() => removePpe(i)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <Input value={ppeInput} onChange={(e) => setPpeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPpe())} placeholder="+ Add PPE" className="h-7 w-32 text-xs" />
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={addPpe}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            <Label className="text-xs">Steps <span className="text-slate-400 font-normal">(add an image next to any step)</span></Label>
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-5">{i + 1}.</span>
                    <Input
                      value={s.text}
                      onChange={(e) => setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)) }))}
                      className="h-8 text-sm flex-1"
                    />
                    <label className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50 text-slate-500" title="Add image to step">
                      {uploadingStep === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStepImageUpload(e, i)} />
                    </label>
                    <label className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50 text-slate-500" title="Add video to step">
                      {uploadingStep === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                      <input type="file" accept="video/*" className="hidden" onChange={(e) => handleStepVideoUpload(e, i)} />
                    </label>
                    <Button size="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => removeStep(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  {s.image_url && (
                    <div className="ml-7 relative w-20 h-20 rounded-md overflow-hidden border border-slate-200">
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeStepImage(i)} className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  {s.video_url && (
                    <div className="ml-7 flex items-center gap-2">
                      <video src={s.video_url} className="h-12 w-20 object-cover rounded-md border border-slate-200 bg-slate-100" preload="metadata" muted />
                      <button onClick={() => removeStepVideo(i)} className="text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {/* Subtasks */}
                  <div className="ml-7 space-y-1">
                    {(s.subtasks || []).map((sub, si) => (
                      <div key={si} className="flex items-center gap-1.5">
                        <span className="text-slate-300 text-xs">↳</span>
                        <Input
                          value={sub}
                          onChange={(e) => updateSubtask(i, si, e.target.value)}
                          className="h-7 text-xs flex-1"
                          placeholder="Subtask..."
                        />
                        <Button size="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => removeSubtask(i, si)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={subtaskInputs[i] || ""}
                        onChange={(e) => setSubtaskInputs((p) => ({ ...p, [i]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask(i))}
                        placeholder="+ Add subtask"
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => addSubtask(i)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input value={stepInput} onChange={(e) => setStepInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStep())} placeholder="Add a step..." className="h-8 text-sm flex-1" />
                <Button size="sm" variant="outline" className="h-8" onClick={addStep}><Plus className="w-3.5 h-3.5 mr-1" />Add Step</Button>
              </div>
            </div>
          </div>

          {/* Common Mistakes */}
          <div className="space-y-1">
            <Label className="text-xs">Common Mistakes</Label>
            <Textarea value={form.common_mistakes} onChange={(e) => setForm((f) => ({ ...f, common_mistakes: e.target.value }))} rows={2} />
          </div>

          {/* Safety Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Safety Notes</Label>
            <Textarea value={form.safety_notes} onChange={(e) => setForm((f) => ({ ...f, safety_notes: e.target.value }))} rows={2} />
          </div>

          {/* Training Video */}
          <div className="space-y-1">
            <Label className="text-xs">Training Video URL (optional)</Label>
            <Input value={form.training_video_url} onChange={(e) => setForm((f) => ({ ...f, training_video_url: e.target.value }))} placeholder="https://..." />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <Label className="text-xs">Reference Photos</Label>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 text-slate-400">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          {existingSop ? (
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={saving}>Delete SOP</Button>
          ) : <span />}
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save SOP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}