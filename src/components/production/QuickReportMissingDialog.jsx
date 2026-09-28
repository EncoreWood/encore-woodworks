import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { getSizeBreakdown, splitDimList } from "./missingItemSizes";

const API_BASE = "https://vivica-d92c9f97.base44.app/functions/reportMissingItem";

const CUSTOM_TYPES = ["Door", "Drawer Front", "Drawer Box", "Panel", "Molding", "Hardware", "Other"];

export default function QuickReportMissingDialog({ open, onOpenChange, item, currentUser }) {
  const [room, setRoom] = useState(item?.room_name || "");
  const [cabinet, setCabinet] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customType, setCustomType] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customWidth, setCustomWidth] = useState("");
  const [customLength, setCustomLength] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fronts / drawer boxes already on file for this card (captured from the plan highlights),
  // so the user can pick one instead of typing the type and size.
  const { data: cardParts = [] } = useQuery({
    queryKey: ["missingItems", "cardParts", item?.id],
    queryFn: () => base44.entities.MissingItem.filter({ production_item_id: item.id }),
    enabled: open && !!item?.id,
    staleTime: 30_000,
  });

  // One selectable row per size (so the user can report a single door at one size),
  // instead of one row bundling every size of the part.
  const options = useMemo(() => {
    const seen = new Set();
    const out = [];
    (cardParts || []).forEach(p => {
      const label = p.item_description || p.pickup_type || "Part";
      const pickupType = p.pickup_type || null;
      const roomName = p.room_name || null;
      const cabinetName = p.cabinet_name || null;

      const breakdown = getSizeBreakdown(p);
      let sizes = null; // [{qty, width, length}]
      if (breakdown) {
        sizes = breakdown.map(s => ({
          qty: parseFloat(s.qty) || 1,
          width: s.width || null,
          length: s.length || null,
        }));
      } else {
        const widths = splitDimList(p.width);
        const lengths = splitDimList(p.length);
        if (widths.length || lengths.length) {
          sizes = [];
          const n = Math.max(widths.length, lengths.length);
          for (let i = 0; i < n; i++) {
            sizes.push({
              qty: 1,
              width: widths[i] ?? (widths.length ? widths[widths.length - 1] : null),
              length: lengths[i] ?? (lengths.length ? lengths[lengths.length - 1] : null),
            });
          }
        }
      }

      if (!sizes) {
        const key = `${label}|${p.width || ""}|${p.length || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          key, label, sizeText: null,
          pickup_type: pickupType, room_name: roomName, cabinet_name: cabinetName,
          qty: p.quantity ?? 1, width: p.width || null, length: p.length || null,
        });
        return;
      }

      sizes.forEach(s => {
        const key = `${label}|${s.width || ""}|${s.length || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          key, label,
          sizeText: [s.width, s.length].filter(Boolean).join(" x ") || null,
          pickup_type: pickupType, room_name: roomName, cabinet_name: cabinetName,
          qty: s.qty || 1, width: s.width, length: s.length,
        });
      });
    });
    return out;
  }, [cardParts]);

  const showCustom = customMode || options.length === 0;
  const canSubmit = !!selectedKey || (showCustom && (customText.trim() || customType));

  const reset = () => {
    setRoom(item?.room_name || "");
    setCabinet("");
    setSelectedKey(null);
    setSelectedQty(1);
    setCustomMode(false);
    setCustomText("");
    setCustomType("");
    setCustomQty("1");
    setCustomWidth("");
    setCustomLength("");
    setNotes("");
  };

  const pick = (o) => {
    setSelectedKey(prev => (prev === o.key ? null : o.key));
    setSelectedQty(o.qty || 1);
    setCustomMode(false);
    if (o.room_name) setRoom(o.room_name);
    if (o.cabinet_name) setCabinet(o.cabinet_name);
  };

  const buildPayload = () => {
    if (selectedKey) {
      const o = options.find(x => x.key === selectedKey);
      const hasSize = !!(o.width && o.length);
      return {
        item_description: o.label,
        pickup_type: o.pickup_type,
        width: o.width,
        length: o.length,
        quantity: selectedQty,
        size_breakdown: hasSize ? [{ qty: selectedQty, width: o.width, length: o.length }] : null,
      };
    }
    const qty = parseFloat(customQty);
    const validQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const hasSize = !!(customWidth.trim() && customLength.trim());
    return {
      item_description: customText.trim() || customType,
      pickup_type: customType || null,
      width: hasSize ? customWidth.trim() : null,
      length: hasSize ? customLength.trim() : null,
      quantity: hasSize ? validQty : null,
      size_breakdown: hasSize ? [{ qty: validQty, width: customWidth.trim(), length: customLength.trim() }] : null,
    };
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    const token = appParams.token;

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        production_item_id: item?.id,
        production_item_name: item?.name,
        project_name: item?.project_name,
        room,
        cabinet,
        notes,
        ...buildPayload(),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.result === "created") {
      toast.success("Missing item reported ✓");
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    } else if (data.result === "confirmed") {
      toast.warning(`Already reported by ${data.reported_by}. You've been added as a confirmer.`);
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    } else if (data.result === "already_confirmed") {
      toast.info("You already reported or confirmed this item.");
      reset();
      onOpenChange(false);
    } else {
      toast.error(data.error || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            🚩 Report Missing Item
          </DialogTitle>
          {item && <p className="text-xs text-slate-500 mt-1">For: <strong>{item.name}</strong></p>}
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Room</Label>
              <Input className="mt-1 h-8 text-sm" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Kitchen" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Cabinet</Label>
              <Input className="mt-1 h-8 text-sm" value={cabinet} onChange={e => setCabinet(e.target.value)} placeholder="e.g. Upper-Left" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">What's missing *</Label>

            {options.length > 0 && (
              <div className="mt-1.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {options.map(o => (
                  <div
                    key={o.key}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                      selectedKey === o.key
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <button type="button" className="flex-1 text-left" onClick={() => pick(o)}>
                      <span className="font-medium text-slate-800">{o.label}</span>
                      {o.sizeText && <span className="text-slate-500"> — {o.sizeText}</span>}
                    </button>
                    {selectedKey === o.key && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                          className="w-6 h-6 rounded-md border border-slate-300 bg-white text-slate-600 leading-none"
                        >−</button>
                        <span className="w-6 text-center font-semibold text-slate-800">{selectedQty}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedQty(selectedQty + 1)}
                          className="w-6 h-6 rounded-md border border-slate-300 bg-white text-slate-600 leading-none"
                        >+</button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => { setCustomMode(v => !v); setSelectedKey(null); }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
                >
                  + Something else — type my own
                </button>
              </div>
            )}

            {showCustom && (
              <div className="mt-1.5 space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                {options.length > 0 && (
                  <Input
                    className="h-8 text-sm bg-white"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="e.g. Door hinge"
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-slate-500">Type</Label>
                    <Select value={customType || undefined} onValueChange={v => setCustomType(v === customType ? "" : v)}>
                      <SelectTrigger className="h-8 text-sm bg-white mt-0.5">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOM_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-slate-500">Qty</Label>
                    <Input className="h-8 text-sm bg-white mt-0.5" value={customQty} onChange={e => setCustomQty(e.target.value)} placeholder="1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-slate-500">Width</Label>
                    <Input className="h-8 text-sm bg-white mt-0.5" value={customWidth} onChange={e => setCustomWidth(e.target.value)} placeholder="e.g. 15 5/8" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-slate-500">Length</Label>
                    <Input className="h-8 text-sm bg-white mt-0.5" value={customLength} onChange={e => setCustomLength(e.target.value)} placeholder="e.g. 24 13/16" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Notes (optional)</Label>
            <Input className="mt-1 h-8 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Reporting..." : "🚩 Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}