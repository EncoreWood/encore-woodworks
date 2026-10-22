import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ensureMissingItemCard } from "@/components/production/missingCardHelper";

const MISSING_ITEM_TYPES = [
  { value: "door", label: "Door" },
  { value: "drawer_front", label: "Drawer Front" },
  { value: "hinges", label: "Hinges" },
  { value: "glides", label: "Glides" },
  { value: "hardware", label: "Hardware" },
  { value: "drawer_box", label: "Drawer Box" },
  { value: "other", label: "Other" },
];

const PRODUCTION_STAGES = [
  { value: "cut", label: "Cut" },
  { value: "face_frame", label: "Face Frame" },
  { value: "spray", label: "Spray" },
  { value: "build", label: "Build" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
];

export default function ReportMissingDialog({ open, onOpenChange, currentUser, prefillItem }) {
  const [form, setForm] = useState({
    production_item_name: prefillItem?.name || "",
    production_item_id: prefillItem?.id || "",
    project_id: prefillItem?.project_id || "",
    project_name: prefillItem?.project_name || "",
    room_name: prefillItem?.room_name || "",
    cabinet_name: "",
    missing_item_type: "",
    description: "",
    production_stage: prefillItem?.stage || "",
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 60_000,
  });

  const selectedProject = projects.find(p => p.id === form.project_id);
  const rooms = selectedProject?.rooms || [];

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleProjectChange = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    set("project_id", projectId);
    set("project_name", proj?.project_name || "");
    set("room_name", "");
  };

  const handleSubmit = async () => {
    if (!form.production_item_name || !form.missing_item_type) return;
    setSaving(true);
    const typeLabel = MISSING_ITEM_TYPES.find(t => t.value === form.missing_item_type)?.label || form.missing_item_type;
    const record = await base44.entities.MissingItem.create({
      ...form,
      reported_by: currentUser?.full_name || currentUser?.email || "Unknown",
      reported_at: new Date().toISOString(),
      status: "Open",
    });
    // Create the separate missing-items card linked to the parent card.
    // The parent card itself is NOT flagged or sent back.
    let childCard = null;
    if (form.production_item_id && record?.id) {
      try {
        childCard = await ensureMissingItemCard({
          parentItem: prefillItem,
          rows: [{
            description: `${typeLabel}${form.cabinet_name ? ` — ${form.cabinet_name}` : ""}`,
            qty: null, width: null, length: null,
            material: null, finish: null,
            missing_item_id: record.id,
          }],
          notes: form.description || null,
        });
        if (childCard) {
          await base44.entities.MissingItem.update(record.id, { missing_card_id: childCard.id });
          toast.success(`Missing item reported — card ${childCard.name} created ✓`);
          queryClient.invalidateQueries({ queryKey: ["productionItems"] });
        }
      } catch (err) {
        console.error("Failed to create missing-items card:", err);
        toast.error("Reported, but the linked card couldn't be created");
      }
    }
    if (!childCard) toast.success("Missing item reported ✓");
    queryClient.invalidateQueries({ queryKey: ["missingItems"] });
    setSaving(false);
    onOpenChange(false);
    setForm({
      production_item_name: "", production_item_id: "",
      project_id: "", project_name: "", room_name: "",
      cabinet_name: "", missing_item_type: "", description: "", production_stage: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Missing Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1 block">Production Item *</Label>
            <Input
              value={form.production_item_name}
              onChange={e => set("production_item_name", e.target.value)}
              placeholder="e.g. Upper Cabinets - Kitchen"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Job / Project</Label>
              <Select value={form.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Room</Label>
              <Select value={form.room_name} onValueChange={v => set("room_name", v)} disabled={rooms.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={rooms.length === 0 ? "No rooms" : "Select room..."} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.room_name} value={r.room_name}>{r.room_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Cabinet</Label>
              <Input
                value={form.cabinet_name}
                onChange={e => set("cabinet_name", e.target.value)}
                placeholder="e.g. Base-Left, Upper-3"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Missing Item *</Label>
              <Select value={form.missing_item_type} onValueChange={v => set("missing_item_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {MISSING_ITEM_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1 block">Production Stage</Label>
            <Select value={form.production_stage} onValueChange={v => set("production_stage", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Current stage..." />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_STAGES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1 block">Notes / Description</Label>
            <Textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-400">
              Reported by: <span className="font-medium text-slate-600">{currentUser?.full_name || currentUser?.email || "—"}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.production_item_name || !form.missing_item_type}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? "Saving..." : "Report Missing"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}