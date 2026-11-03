import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scissors, Loader2 } from "lucide-react";

// Small form that splits a cut child card off a production card.
export default function SendToCutDialog({ item, parentPts = 0, onClose, onCreate }) {
  const [form, setForm] = useState({ description: "", qty: 1, material: "", finish: "", pts: 1, notes: "" });
  const [saving, setSaving] = useState(false);

  // Prefill from the parent card whenever a different card opens the dialog
  useEffect(() => {
    if (!item) return;
    setForm({
      description: "",
      qty: 1,
      material: item.wood_type || "",
      finish: item.finish || "",
      pts: Number(parentPts) > 0 ? Number(parentPts) : 1,
      notes: "",
    });
  }, [item?.id]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({ ...form, description: form.description.trim(), notes: form.notes.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-orange-600" /> Send to Cut
          </DialogTitle>
        </DialogHeader>

        {item && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-slate-500">
              Splits a cut card off <span className="font-semibold text-slate-700">{item.name}</span>. The card stays where it is.
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">What needs cut? *</Label>
              <Input
                autoFocus
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder='e.g. Island wing panel 12 x 34'
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.qty}
                  onChange={(e) => set("qty", e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Points (PTS)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.pts}
                  onChange={(e) => set("pts", e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Material / wood</Label>
                <Input
                  value={form.material}
                  onChange={(e) => set("material", e.target.value)}
                  placeholder="Maple"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Finish</Label>
                <Input
                  value={form.finish}
                  onChange={(e) => set("finish", e.target.value)}
                  placeholder="Painted"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything the cut gets asked for..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button
                type="submit"
                disabled={!form.description.trim() || saving}
                className="bg-orange-600 hover:bg-orange-700 gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                Create Cut Card
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}