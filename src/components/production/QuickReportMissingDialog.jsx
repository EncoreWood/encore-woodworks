import { useEffect, useMemo, useState } from "react";
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
import { extractSizesFromPdf, inferPickupType, renderPdfPagesToImages } from "./pdfSizes";

const API_BASE = "https://vivica-d92c9f97.base44.app/functions/reportMissingItem";

const CUSTOM_TYPES = ["Door", "Drawer Front", "Drawer Box", "End Panel", "Panel", "Molding", "Hardware", "Other"];

// One-tap part types: info is pulled from the PDFs attached to the card.
const QUICK_TYPES = [
  { label: "Door Fronts", type: "Door" },
  { label: "Drawer Fronts", type: "Drawer Front" },
  { label: "End Panels", type: "End Panel" },
];

const AI_EXTRACT_PROMPT = (type) => `You are reading a cabinet shop manufacturing plan / cut list PDF page.
List every ${type} entry you can find on the page. Only include rows that are ${type}s (no other part types).
For each row return:
- qty: the numeric quantity (default 1 if not shown)
- width: the width as a fraction string (e.g. "15 5/8")
- length: the length as a fraction string (e.g. "24 13/16")
- material: the material spec for the row (e.g. "Maple FF"), empty string if not shown
- finish: the finish spec from the page header, empty string if not shown
Return an empty rows array if there are no ${type}s on the page.`;

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

  // Sizes pulled from the PDFs attached to the production card
  const pdfFiles = useMemo(
    () => (item?.files || []).filter(f => f.url && /\.pdf$/i.test(f.url)),
    [item?.id]
  );
  const [pdfOptions, setPdfOptions] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // AI-extracted rows (used when text extraction can't read the PDF) and the
  // quick type filter driving the one-tap Door Fronts / Drawer Fronts / End Panels chips.
  const [aiOptions, setAiOptions] = useState([]);
  const [aiLoadingType, setAiLoadingType] = useState(null);
  const [aiProgress, setAiProgress] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [typeFilter, setTypeFilter] = useState(null);

  const runAiExtraction = async (type) => {
    if (pdfFiles.length === 0) {
      toast.info("No PDF attached to this card");
      return;
    }
    setAiLoadingType(type);
    setAiProgress("");
    setAiMessage("");
    try {
      let added = 0;
      for (const f of pdfFiles) {
        const pages = await renderPdfPagesToImages(f.url, 4, (i, n) =>
          setAiProgress(`page ${i} of ${n}`)
        );
        if (pages.length === 0) {
          setAiMessage("Couldn't open the attached PDF — enter the parts manually below.");
          continue;
        }
        for (const pageUrl of pages) {
          setAiProgress("reading with AI…");
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: AI_EXTRACT_PROMPT(type),
            file_urls: [pageUrl],
            response_json_schema: {
              type: "object",
              properties: {
                rows: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      qty: { type: "number" },
                      width: { type: "string" },
                      length: { type: "string" },
                      material: { type: "string" },
                      finish: { type: "string" },
                    },
                  },
                },
              },
            },
          });
          const rows = (res?.rows || []).map(r => ({
            label: type,
            quick_type: type,
            qty: r.qty || 1,
            width: r.width || null,
            length: r.length || null,
            material: r.material || null,
            finish: r.finish || null,
          }));
          if (rows.length) {
            added += rows.length;
            setAiOptions(prev => {
              const seen = new Set(prev.map(p => `${p.width}|${p.length}`));
              return [...prev, ...rows.filter(r => !seen.has(`${r.width}|${r.length}`))];
            });
          }
        }
      }
      if (added === 0) {
        setAiMessage(`No ${type.toLowerCase()}s found in the PDF — enter them manually below.`);
      }
    } catch (err) {
      console.error("AI PDF extraction failed:", err);
      setAiMessage("Couldn't read those from the PDF — enter them manually below.");
    } finally {
      setAiLoadingType(null);
      setAiProgress("");
    }
  };

  const handleQuickType = (type) => {
    const next = typeFilter === type ? null : type;
    setTypeFilter(next);
    if (next && !aiLoadingType) {
      const haveRows = [...pdfOptions, ...aiOptions].some(o =>
        o.quick_type === next || o.label === next || inferPickupType(o.label) === next
      );
      if (!haveRows) runAiExtraction(next);
    }
  };

  useEffect(() => {
    if (!open || pdfFiles.length === 0) { setPdfOptions([]); setPdfLoading(false); return; }
    let cancelled = false;
    setPdfLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          pdfFiles.map(f => extractSizesFromPdf(f.url).catch(err => {
            console.error("Failed to read sizes from attached PDF:", err);
            return [];
          }))
        );
        if (!cancelled) setPdfOptions(results.flat());
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, item?.id]);

  // One selectable row per size (so the user can report a single door at one size),
  // instead of one row bundling every size of the part.
  const allOptions = useMemo(() => {
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

    (pdfOptions || []).forEach(p => {
      const key = `pdf|${p.label}|${p.width}|${p.length}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        key, label: p.label,
        sizeText: [p.width, p.length].filter(Boolean).join(" x "),
        pickup_type: inferPickupType(p.label),
        room_name: p.room_name || null, cabinet_name: null,
        qty: p.qty || 1, width: p.width, length: p.length,
      });
    });
    (aiOptions || []).forEach(p => {
      const key = `ai|${p.label}|${p.width}|${p.length}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        key, label: p.label,
        sizeText: [p.width, p.length].filter(Boolean).join(" x "),
        pickup_type: inferPickupType(p.label),
        quick_type: p.quick_type || null,
        room_name: p.room_name || null, cabinet_name: null,
        qty: p.qty || 1, width: p.width, length: p.length,
        material: p.material || null, finish: p.finish || null,
      });
    });
    return out;
  }, [cardParts, pdfOptions, aiOptions]);

  // The quick chips narrow the list to one part type at a time.
  const options = useMemo(() => (
    typeFilter
      ? allOptions.filter(o => o.quick_type === typeFilter || o.label === typeFilter || inferPickupType(o.label) === typeFilter)
      : allOptions
  ), [allOptions, typeFilter]);

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
    setAiOptions([]);
    setAiLoadingType(null);
    setAiProgress("");
    setAiMessage("");
    setTypeFilter(null);
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
        material: o.material || null,
        finish: o.finish || null,
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

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {QUICK_TYPES.map(q => (
                <button
                  key={q.type}
                  type="button"
                  onClick={() => handleQuickType(q.type)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                    typeFilter === q.type
                      ? "border-orange-500 bg-orange-100 text-orange-800"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {aiLoadingType && (
              <p className="mt-1.5 text-xs text-slate-500 animate-pulse">
                🤖 Pulling {aiLoadingType.toLowerCase()}s from the attached PDF… {aiProgress}
              </p>
            )}
            {!aiLoadingType && aiMessage && (
              <p className="mt-1.5 text-xs text-slate-500">{aiMessage}</p>
            )}

            {pdfLoading && (
              <p className="mt-1.5 text-xs text-slate-500 animate-pulse">📄 Reading sizes from attached PDF...</p>
            )}

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
                        <input
                          type="number"
                          min={1}
                          value={selectedQty}
                          onChange={e => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-12 h-7 text-center font-semibold text-slate-800 rounded-md border border-orange-300 bg-white"
                        />
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