import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { editableSizes } from "./missingItemSizes";

// Inline per-size editor for a missing item (qty per size: "1@ 20 x 5 13/16 & 2@ 20 x 8 13/16").
// Pre-fills from the item's size_breakdown, or from its legacy width/length strings.
export default function MissingItemSizeEditor({ item, onDone }) {
  const [rows, setRows] = useState(() => editableSizes(item));
  const [saving, setSaving] = useState(false);

  const setRow = (i, k, v) => setRows(prev => prev.map((r, ri) => ri === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows(prev => [...prev, { qty: "", width: "", length: "" }]);
  const removeRow = (i) => setRows(prev => (prev.length > 1 ? prev.filter((_, ri) => ri !== i) : prev));

  const handleSave = async () => {
    const clean = rows.filter(r => String(r.qty).trim() || r.width || r.length);
    if (clean.length === 0) {
      toast.error("Add at least one size");
      return;
    }
    setSaving(true);
    try {
      const total = clean.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
      await base44.entities.MissingItem.update(item.id, {
        size_breakdown: clean.map(r => ({
          qty: r.qty !== "" && r.qty != null ? Number(r.qty) : null,
          width: r.width || "",
          length: r.length || ""
        })),
        quantity: total > 0 ? total : null,
        width: [...new Set(clean.map(r => r.width).filter(Boolean))].join(" & "),
        length: [...new Set(clean.map(r => r.length).filter(Boolean))].join(" & "),
      });
      toast.success("Sizes updated ✓");
      onDone?.(true);
    } catch (err) {
      console.error("Failed to save sizes:", err);
      toast.error("Failed to save sizes");
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input type="number" value={r.qty} onChange={e => setRow(i, "qty", e.target.value)} placeholder="Qty" className="h-7 text-xs w-14 flex-shrink-0" />
          <span className="text-xs text-slate-400 flex-shrink-0">@</span>
          <Input value={r.width} onChange={e => setRow(i, "width", e.target.value)} placeholder="Width" className="h-7 text-xs" />
          <span className="text-xs text-slate-400 flex-shrink-0">×</span>
          <Input value={r.length} onChange={e => setRow(i, "length", e.target.value)} placeholder="Length" className="h-7 text-xs" />
          {rows.length > 1 && (
            <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0" title="Remove size">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={addRow} className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> Add size
        </button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onDone?.(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}