import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BellRing } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Employee order request for one inventory item. Creates an InventoryRequest
 * (which notifies the inventory board and the top bar) and flags the item as
 * Needs Ordered.
 */
export default function RequestOrderDialog({ item, open, onOpenChange, onSubmitted }) {
  const { toast } = useToast();
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQty(String(Math.max((item.min_quantity || 0) - (item.quantity || 0), 1)));
    setNote("");
  }, [item]);

  const submit = async () => {
    if (!item || saving) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.InventoryRequest.create({
        item_id: item.id,
        item_name: item.name,
        item_sku: item.item_sku || "",
        location: item.location || "",
        unit: item.unit || "",
        current_quantity: item.quantity ?? 0,
        requested_quantity: Number(qty) || 0,
        note: note.trim(),
        requested_by: user?.full_name || user?.email || "Shop",
        requested_by_email: user?.email || "",
        status: "pending",
      });
      await base44.entities.Inventory.update(item.id, { status: "needs_ordered" });
      onSubmitted?.();
      toast({
        title: "Order request sent",
        description: `${item.name} is flagged Needs Ordered on the inventory board.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't send the request",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 pr-10">
          <BellRing className="w-4 h-4 text-red-600 flex-shrink-0" />
          <DialogTitle className="text-sm font-bold text-slate-900 truncate">
            Request order — {item?.name}
          </DialogTitle>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span>
              On hand: <span className="font-semibold text-slate-700">{item?.quantity ?? 0}{item?.unit ? ` ${item.unit}` : ""}</span>
            </span>
            {item?.min_quantity != null && <span>Min: {item.min_quantity}</span>}
            {item?.location && <span>{item.location}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">How many to order</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(String(Math.max((Number(qty) || 0) - 1, 0)))}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 text-lg font-semibold active:bg-slate-100"
              >
                −
              </button>
              <Input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-9 text-center font-mono bg-white flex-1"
              />
              <button
                type="button"
                onClick={() => setQty(String((Number(qty) || 0) + 1))}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 text-lg font-semibold active:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Which job needs it, urgency, etc."
              className="bg-white text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
            Send Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}