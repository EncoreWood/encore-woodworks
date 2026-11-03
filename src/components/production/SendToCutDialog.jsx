import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, Loader2, MapPin } from "lucide-react";

// Small form that splits a cut child card off a production card. Opened from a
// card's action menu ("Send to Cut") or from the plan viewer ("Cut Parts", which
// also carries the plan page / marked area the cut was spotted on).
export default function SendToCutDialog({ item, plan = null, parentOptions = null, onClose, onCreate }) {
  // Cut cards never inherit the parent card's points — the field starts blank and
  // only carries a value the user types in for the cut work itself.
  const [form, setForm] = useState({ description: "", qty: 1, material: "", finish: "", pts: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const options = parentOptions || [];
  const [pickedId, setPickedId] = useState("");
  const parent = item || options.find((o) => o.id === pickedId) || null;
  const open = !!item || !!plan;
  const sessionKey = `${item?.id || ""}|${plan?.page_number ?? ""}|${open}`;

  // Prefill material/finish from the parent card whenever a different card opens the dialog
  useEffect(() => {
    if (!open) return;
    setForm({
      description: "",
      qty: 1,
      material: parent?.wood_type || "",
      finish: parent?.finish || "",
      pts: "",
      notes: "",
    });
    setPickedId(item?.id || "");
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !parent || saving) return;
    setSaving(true);
    try {
      await onCreate({
        ...form,
        description: form.description.trim(),
        notes: form.notes.trim(),
        parentCardId: parent.id,
        plan,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-orange-600" /> {plan ? "Cut Parts" : "Send to Cut"}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {parent ? (
              <p className="text-xs text-slate-500">
                Splits a cut card off <span className="font-semibold text-slate-700">{parent.name}</span>. The card stays where it is.
              </p>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Which card is this cut for? *</Label>
                <Select value={pickedId} onValueChange={setPickedId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Pick a production card" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}{option.room_name ? ` · ${option.room_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Plan reference — page + the area marked on it */}
            {plan && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-2 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Plan page {plan.page_number}
                </p>
                {plan.cropDataUrl ? (
                  <img
                    src={plan.cropDataUrl}
                    alt="Marked plan area"
                    className="w-full max-h-32 object-contain rounded border border-orange-200 bg-white"
                  />
                ) : (
                  <p className="text-[10px] text-orange-800/70">No area marked — the cut is linked to this page.</p>
                )}
              </div>
            )}

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
                  placeholder="0"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Separate from the main card's points.
                </p>
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
                disabled={!form.description.trim() || !parent || saving}
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