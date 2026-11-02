import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ImagesField from "./ImagesField";

const STATUSES = ["Idea", "Planned", "In Progress", "Complete"];

const EMPTY = {
  title: "",
  description: "",
  status: "Idea",
  estimated_time_saved: "",
  project_cost: "",
  owner: "",
  images: [],
};

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Add / edit form for one lean project in a shop area.
 * Overview, estimated time saved, cost, assigned person and photos.
 */
export default function LeanProjectForm({ open, onOpenChange, editing, onSave, saving, employees = [] }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      ...(editing || {}),
      project_cost: editing?.project_cost ?? "",
    });
  }, [open, editing]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      description: form.description || "",
      status: form.status || "",
      estimated_time_saved: form.estimated_time_saved || "",
      project_cost: form.project_cost === "" ? null : Number(form.project_cost),
      owner: form.owner || "",
      images: Array.isArray(form.images) ? form.images : [],
    });
  };

  const ownerOptions = employees.map((emp) => emp.full_name).filter(Boolean);
  if (form.owner && !ownerOptions.includes(form.owner)) ownerOptions.unshift(form.owner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lean project" : "New lean project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="lean-title">Project</Label>
            <Input
              id="lean-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Shadow board at the cut station"
              autoFocus
              required
            />
          </div>

          <div>
            <Label htmlFor="lean-overview">Overview</Label>
            <Textarea
              id="lean-overview"
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="What the project is and what it improves"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lean-status">Status</Label>
              <select
                id="lean-status"
                value={form.status || ""}
                onChange={(e) => set("status", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">—</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="lean-owner">Assigned to</Label>
              <select
                id="lean-owner"
                value={form.owner || ""}
                onChange={(e) => set("owner", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">—</option>
                {ownerOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="lean-time">Estimated time saved</Label>
              <Input
                id="lean-time"
                value={form.estimated_time_saved || ""}
                onChange={(e) => set("estimated_time_saved", e.target.value)}
                placeholder="e.g. 2 hrs / week"
              />
            </div>

            <div>
              <Label htmlFor="lean-cost">Project cost</Label>
              <Input
                id="lean-cost"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.project_cost}
                onChange={(e) => set("project_cost", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label>Pictures</Label>
            <ImagesField value={form.images || []} onChange={(items) => set("images", items)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()} className="bg-amber-600 hover:bg-amber-700">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}