import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Flag } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getSizeBreakdown, legacySizeSummary } from "./missingItemSizes";

// Per-row stepper for "how many are still missing"
function QtyStepper({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-slate-800">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * Flag a partially-received missing item: pick how many (per size) are still
 * missing. Updates the record so its quantity/sizes reflect only the
 * still-missing portion, reopens it as "Open", and notes what was received.
 */
export default function StillMissingDialog({ report, open, onOpenChange, onUpdated }) {
  const breakdown = getSizeBreakdown(report);
  const rows = breakdown || [];
  const totalQty = breakdown
    ? rows.reduce((s, r) => s + (r.qty || 0), 0)
    : report?.quantity ?? null;
  const sizeText = !breakdown ? (legacySizeSummary(report) || "") : "";

  const [missing, setMissing] = useState([]);

  useEffect(() => {
    if (open) setMissing(rows.map(() => 0));
  }, [open, report?.id]);

  const missingTotal = missing.reduce((s, v) => s + (v || 0), 0);
  const receivedTotal = totalQty != null ? totalQty - missingTotal : null;

  const handleSave = async () => {
    const marked = rows.map((r, i) => ({ ...r, missing: missing[i] || 0 }));
    const stillRows = marked.filter(r => r.missing > 0);
    const missingSum = stillRows.reduce((s, r) => s + r.missing, 0);

    // Nothing arrived — just reopen the report with the full quantity
    if (receivedTotal === 0) {
      try {
        await base44.entities.MissingItem.update(report.id, { status: "Open" });
        toast.success(`Reopened — all ${missingSum} still missing`);
        onUpdated?.();
        onOpenChange(false);
      } catch (err) {
        console.error("Failed to update missing item:", err);
        toast.error("Failed to update missing item");
      }
      return;
    }

    const note = `${receivedTotal} of ${totalQty} received ${format(new Date(), "MMM d")}`;

    // Partial delivery — split the report instead of collapsing it:
    // the original record keeps the RECEIVED portion (with its current status, so it
    // can move through the production stages), and a new report is created for
    // what's still missing.
    const keepPayload = { description: report.description ? `${report.description} — ${note}` : note };
    const newPayload = {
      production_item_id: report.production_item_id,
      production_item_name: report.production_item_name,
      project_id: report.project_id,
      project_name: report.project_name,
      room_name: report.room_name,
      cabinet_name: report.cabinet_name,
      item_description: report.item_description,
      missing_item_type: report.missing_item_type,
      quantity: missingSum,
      status: "Open",
      reported_by: report.reported_by,
      reported_at: new Date().toISOString()
    };

    if (breakdown) {
      keepPayload.size_breakdown = marked
        .filter(r => (r.qty || 0) - r.missing > 0)
        .map(r => ({ qty: (r.qty || 0) - r.missing, width: r.width, length: r.length }));
      newPayload.size_breakdown = stillRows.map(r => ({ qty: r.missing, width: r.width, length: r.length }));
      const joinDims = (bd, key) => {
        const vals = [...new Set(bd.map(r => r[key]).filter(Boolean))];
        return vals.length ? vals.join(" & ") : null;
      };
      keepPayload.width = joinDims(keepPayload.size_breakdown, "width");
      keepPayload.length = joinDims(keepPayload.size_breakdown, "length");
      newPayload.width = joinDims(newPayload.size_breakdown, "width");
      newPayload.length = joinDims(newPayload.size_breakdown, "length");
    } else if (totalQty != null) {
      keepPayload.quantity = receivedTotal;
      if (report.width) newPayload.width = report.width;
      if (report.length) newPayload.length = report.length;
    } else {
      // No known quantity — just reopen with the entered count
      try {
        await base44.entities.MissingItem.update(report.id, { status: "Open", quantity: missingSum });
        toast.success(`Updated — ${missingSum} still missing`);
        onUpdated?.();
        onOpenChange(false);
      } catch (err) {
        console.error("Failed to update missing item:", err);
        toast.error("Failed to update missing item");
      }
      return;
    }

    try {
      await base44.entities.MissingItem.update(report.id, keepPayload);
      await base44.entities.MissingItem.create(newPayload);
      toast.success(`Split — ${missingSum} still missing, ${receivedTotal} received`);
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update missing item:", err);
      toast.error("Failed to update missing item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            Still missing?
          </DialogTitle>
          <DialogDescription>
            {report?.item_description ? `${report.item_description}` : "Update this missing item to show what never showed up."}
            {" "}Mark how many are still missing — the received portion stays on the card to move through production, and a new report opens for what's still missing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {breakdown ? (
            rows.map((r, i) => {
              const dims = [r.width, r.length].filter(Boolean).join(" x ");
              return (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold">{r.qty}</span>@ {dims || "—"}
                  </span>
                  <QtyStepper
                    value={missing[i] || 0}
                    max={r.qty || 0}
                    onChange={(v) => setMissing(prev => prev.map((p, idx) => idx === i ? v : p))}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-sm text-slate-700">
                {sizeText ? (
                  <><span className="font-semibold">{totalQty ?? "?"}</span>@ {sizeText}</>
                ) : (
                  <>Qty <span className="font-semibold">{totalQty ?? "?"}</span></>
                )}
              </span>
              {totalQty != null ? (
                <QtyStepper
                  value={missing[0] || 0}
                  max={totalQty}
                  onChange={(v) => setMissing([v])}
                />
              ) : (
                <input
                  type="number"
                  min="1"
                  className="w-16 h-7 text-sm border border-slate-200 rounded-md px-2 text-center"
                  value={missing[0] || ""}
                  placeholder="Qty"
                  onChange={(e) => setMissing([Math.max(0, parseInt(e.target.value) || 0)])}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={missingTotal <= 0}
            onClick={handleSave}
          >
            🚩 Update — {missingTotal} still missing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}