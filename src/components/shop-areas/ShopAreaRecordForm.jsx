import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ChecklistEditor from "./ChecklistEditor";
import ImagesField from "./ImagesField";

const EMPTY = {
  title: "",
  description: "",
  owner: "",
  status: "",
  quantity: "",
  unit: "",
  frequency: "",
  date: "",
  checklist: [],
  images: [],
};

/**
 * Add / edit form for one section of a shop area.
 * Which fields show is controlled by the section config's `fields` list.
 */
export default function ShopAreaRecordForm({ open, onOpenChange, section, editing, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      ...(editing || {}),
      quantity: editing?.quantity ?? "",
    });
  }, [open, editing]);

  const has = (field) => (section?.fields || []).includes(field);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = { title: form.title.trim() };
    (section?.fields || []).forEach((field) => {
      if (field === "quantity") {
        payload.quantity = form.quantity === "" || form.quantity === null ? null : Number(form.quantity);
      } else if (field === "checklist" || field === "images") {
        payload[field] = Array.isArray(form[field]) ? form[field] : [];
      } else {
        payload[field] = form[field] || "";
      }
    });
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} {section?.label?.replace(/s$/, "") || "Record"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="sa-title">Title</Label>
            <Input
              id="sa-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={
                section?.key === "inventory" ? "e.g. 1 1/4\" pocket screws" : "e.g. Table saw set-up"
              }
              autoFocus
              required
            />
          </div>

          {has("description") && (
            <div>
              <Label htmlFor="sa-desc">Description</Label>
              <Textarea
                id="sa-desc"
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Steps, specs or notes"
              />
            </div>
          )}

          {has("checklist") && (
            <div>
              <Label>Checklist</Label>
              <ChecklistEditor
                value={form.checklist || []}
                onChange={(items) => set("checklist", items)}
              />
            </div>
          )}

          {has("images") && (
            <div>
              <Label>Photos</Label>
              <ImagesField
                value={form.images || []}
                onChange={(items) => set("images", items)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {has("owner") && (
              <div>
                <Label htmlFor="sa-owner">Owner</Label>
                <Input
                  id="sa-owner"
                  value={form.owner || ""}
                  onChange={(e) => set("owner", e.target.value)}
                  placeholder="Responsible person"
                />
              </div>
            )}

            {has("status") && (
              <div>
                <Label htmlFor="sa-status">Status</Label>
                <select
                  id="sa-status"
                  value={form.status || ""}
                  onChange={(e) => set("status", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">—</option>
                  {(section?.statuses || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {has("quantity") && (
              <div>
                <Label htmlFor="sa-qty">Quantity</Label>
                <Input
                  id="sa-qty"
                  type="number"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                />
              </div>
            )}

            {has("unit") && (
              <div>
                <Label htmlFor="sa-unit">Unit</Label>
                <Input
                  id="sa-unit"
                  value={form.unit || ""}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="ea, box, bd ft"
                />
              </div>
            )}

            {has("frequency") && (
              <div>
                <Label htmlFor="sa-freq">Frequency</Label>
                <select
                  id="sa-freq"
                  value={form.frequency || ""}
                  onChange={(e) => set("frequency", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">—</option>
                  {["Daily", "Weekly", "Bi-Weekly", "Monthly", "Quarterly", "Annually", "As Needed"].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}

            {has("date") && (
              <div>
                <Label htmlFor="sa-date">Date</Label>
                <Input
                  id="sa-date"
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
            )}
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