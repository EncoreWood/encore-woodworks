import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, X, Loader2, Upload } from "lucide-react";

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

export default function ZoneSopEditor({ open, onOpenChange, zone, existingSop }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [ppeInput, setPpeInput] = useState("");
  const [stepInput, setStepInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existingSop) {
      setForm({
        title: existingSop.title || "",
        overview: existingSop.overview || "",
        required_ppe: existingSop.required_ppe || [],
        steps: existingSop.steps || [],
        common_mistakes: existingSop.common_mistakes || "",
        safety_notes: existingSop.safety_notes || "",
        training_video_url: existingSop.training_video_url || "",
        photos: existingSop.photos || [],
      });
    } else {
      setForm({ ...EMPTY, title: zone?.name ? `${zone.name} Operation` : "" });
    }
    setPpeInput("");
    setStepInput("");
  }, [open, existingSop, zone]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shopZoneSops"] });

  const handleSave = async () => {
    if (!form.title.trim() || !zone) return;
    setSaving(true);
    try {
      const payload = {
        zone_id: zone.id,
        zone_name: zone.name,
        title: form.title.trim(),
        overview: form.overview,
        required_ppe: form.required_ppe,
        steps: form.steps,
        common_mistakes: form.common_mistakes,
        safety_notes: form.safety_notes,
        training_video_url: form.training_video_url,
        photos: form.photos,
      };
      if (existingSop) {
        await base44.entities.ShopZoneSOP.update(existingSop.id, payload);
      } else {
        await base44.entities.ShopZoneSOP.create(payload);
      }
      await invalidate();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSop) return;
    if (!confirm(`Delete SOP for "${zone?.name}"?`)) return;
    setSaving(true);
    try {
      await base44.entities.ShopZoneSOP.delete(existingSop.id);
      await invalidate();
      onOpenChange(false);
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
    setForm((f) => ({ ...f, steps: [...f.steps, v] }));
    setStepInput("");
  };
  const removeStep = (i) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

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
          <DialogTitle>📋 SOP: {zone?.name}</DialogTitle>
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
            <Label className="text-xs">Steps</Label>
            <div className="space-y-1.5">
              {form.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5">{i + 1}.</span>
                  <Input value={s} onChange={(e) => setForm((f) => ({ ...f, steps: f.steps.map((x, idx) => idx === i ? e.target.value : x) }))} className="h-8 text-sm flex-1" />
                  <Button size="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => removeStep(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
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