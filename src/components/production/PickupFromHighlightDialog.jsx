import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PICKUP_TYPES = ["Door", "Drawer Front", "Panel", "Molding", "Hardware", "Other"];

const EMPTY = {
  room: "", cabinet: "", pickup_type: "Door",
  quantity: "", width: "", length: "", material: "", finish: ""
};

async function dataUrlToFile(dataUrl, fileName) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

const EXTRACTION_PROMPT = `You are analyzing a cabinet shop manufacturing cut list / spec plan page.
Image 1 is a cropped highlighted region of a single spec table row.
Image 2 is the full page for header context.

From the HIGHLIGHTED CROP (Image 1), extract:
- quantity: the numeric quantity (e.g. 2)
- width: the width as a fraction string (e.g. "15 5/8")
- length: the length as a fraction string (e.g. "24 13/16")
- pickup_type: the part type, must be one of: "Door", "Drawer Front", "Panel", "Molding", "Hardware", "Other"
- material: the material spec (e.g. "Maple FF")

From the PAGE HEADER visible in Image 2, extract:
- room: the room name (e.g. "CH-Eves / Office")
- cabinet: the cabinet number/identifier (e.g. "RSC6")
- finish: the finish spec (e.g. "Down Pipe-FB 3/4 Mel-PG Maple")

If a value cannot be determined, return an empty string for strings or 0 for quantity.
Return only the JSON object.`;

async function extractOne(cropDataUrl, pageUrl, pageNumber, index) {
  const cropFile = await dataUrlToFile(cropDataUrl, `highlight-p${pageNumber}-${index + 1}.jpg`);
  const { file_url: cropUrl } = await base44.integrations.Core.UploadFile({ file: cropFile });
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: EXTRACTION_PROMPT,
    file_urls: [cropUrl, pageUrl],
    response_json_schema: {
      type: "object",
      properties: {
        quantity: { type: "number" },
        width: { type: "string" },
        length: { type: "string" },
        pickup_type: { type: "string", enum: PICKUP_TYPES },
        material: { type: "string" },
        room: { type: "string" },
        cabinet: { type: "string" },
        finish: { type: "string" }
      }
    }
  });
  return {
    cropUrl,
    form: {
      room: result?.room || "",
      cabinet: result?.cabinet || "",
      pickup_type: PICKUP_TYPES.includes(result?.pickup_type) ? result.pickup_type : "Other",
      quantity: result?.quantity || "",
      width: result?.width || "",
      length: result?.length || "",
      material: result?.material || "",
      finish: result?.finish || ""
    }
  };
}

function buildDescription(form) {
  const qty = form.quantity || "";
  return `${form.pickup_type || "Item"}${qty ? ` - Qty ${qty}` : ""}${form.width ? ` - ${form.width}` : ""}${form.length ? ` x ${form.length}` : ""}${form.material ? ` - ${form.material}` : ""}`;
}

export default function PickupFromHighlightDialog({
  open, onOpenChange,
  crops = [], pageDataUrl, pageNumber,
  productionItem, currentUser
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]); // [{ loading, highlightUrl, form }]
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(crops.map(() => ({ loading: true, highlightUrl: null, form: { ...EMPTY } })));
    setNote("");
    setLoading(true);

    (async () => {
      try {
        // Upload the full page once for shared AI context
        let pageUrl = null;
        if (pageDataUrl) {
          try {
            const pageFile = await dataUrlToFile(pageDataUrl, `page-p${pageNumber}.jpg`);
            const up = await base44.integrations.Core.UploadFile({ file: pageFile });
            if (!cancelled && up?.file_url) pageUrl = up.file_url;
          } catch {}
        }

        // Extract each crop in parallel
        const results = await Promise.allSettled(
          crops.map((c, i) => extractOne(c.cropDataUrl, pageUrl, pageNumber, i))
        );

        if (cancelled) return;
        setItems(results.map(r => {
          if (r.status === "fulfilled") {
            return { loading: false, highlightUrl: r.value.cropUrl, form: r.value.form };
          }
          return { loading: false, highlightUrl: null, form: { ...EMPTY } };
        }));
      } catch (err) {
        if (!cancelled) toast.error("AI extraction failed — you can still fill the forms manually.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, crops, pageDataUrl, pageNumber]);

  const setField = (idx, k, v) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, form: { ...it.form, [k]: v } } : it));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const ready = items.filter(it => !it.loading);
    if (ready.length === 0) return;
    setSaving(true);
    try {
      for (const it of ready) {
        await base44.entities.MissingItem.create({
          production_item_id: productionItem?.id || null,
          production_item_name: productionItem?.name || "Unknown",
          project_id: productionItem?.project_id || null,
          project_name: productionItem?.project_name || null,
          room_name: it.form.room,
          cabinet_name: it.form.cabinet,
          pickup_type: it.form.pickup_type,
          quantity: it.form.quantity !== "" ? Number(it.form.quantity) : null,
          width: it.form.width,
          length: it.form.length,
          material: it.form.material,
          finish: it.form.finish,
          item_description: buildDescription(it.form),
          description: note || null,
          status: "Open",
          reported_by: currentUser?.full_name || currentUser?.email || "Unknown",
          reported_at: new Date().toISOString(),
          source_page: pageNumber || null,
          highlight_image_url: it.highlightUrl || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      toast.success(`${ready.length} pick up${ready.length > 1 ? "s" : ""} created ✓`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Failed to create pick ups");
    } finally {
      setSaving(false);
    }
  };

  const readyCount = items.filter(it => !it.loading).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <ClipboardCheck className="w-4 h-4" /> Create Pick Up{items.length > 1 ? `s (${items.length})` : ""} from Highlight
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            From <strong>{productionItem?.name || "card"}</strong> · Page {pageNumber}
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Extracting spec data with AI…
          </div>
        )}

        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <div className="flex items-start gap-2 mb-2">
                {it.highlightUrl ? (
                  <img src={it.highlightUrl} alt="Highlight" className="h-16 w-16 object-contain rounded border border-slate-200 bg-white" />
                ) : (
                  <div className="h-16 w-16 rounded border border-slate-200 bg-white flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-600">Item {idx + 1}</span>
                  {it.loading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-0.5">{buildDescription(it.form)}</p>
                  )}
                </div>
                {!it.loading && items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => removeItem(idx)} title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {!it.loading && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Room</Label>
                    <Input value={it.form.room} onChange={e => setField(idx, "room", e.target.value)} placeholder="e.g. Kitchen" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cabinet</Label>
                    <Input value={it.form.cabinet} onChange={e => setField(idx, "cabinet", e.target.value)} placeholder="e.g. RSC6" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pick Up Type</Label>
                    <Select value={it.form.pickup_type} onValueChange={v => setField(idx, "pickup_type", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" value={it.form.quantity} onChange={e => setField(idx, "quantity", e.target.value)} placeholder="2" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Width</Label>
                    <Input value={it.form.width} onChange={e => setField(idx, "width", e.target.value)} placeholder="15 5/8" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Length</Label>
                    <Input value={it.form.length} onChange={e => setField(idx, "length", e.target.value)} placeholder="24 13/16" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Material</Label>
                    <Input value={it.form.material} onChange={e => setField(idx, "material", e.target.value)} placeholder="Maple FF" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Finish</Label>
                    <Input value={it.form.finish} onChange={e => setField(idx, "finish", e.target.value)} placeholder="Down Pipe-FB…" className="h-8 text-sm" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && items.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Note (applied to all pick ups)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add context for these pick up items…"
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || readyCount === 0} className="bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create {readyCount > 1 ? `${readyCount} Pick Ups` : "Pick Up"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}