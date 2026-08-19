import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const PICKUP_TYPES = ["Door", "Drawer Front", "Panel", "Molding", "Hardware", "Other"];

const EMPTY = {
  room: "", cabinet: "", pickup_type: "Door",
  quantity: "", width: "", length: "", material: "", finish: ""
};

// Convert a data URL to a File for upload
async function dataUrlToFile(dataUrl, fileName) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

export default function PickupFromHighlightDialog({
  open, onOpenChange,
  cropDataUrl, pageDataUrl, pageNumber,
  productionItem, currentUser
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [highlightUrl, setHighlightUrl] = useState(null);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setForm(EMPTY);
    setHighlightUrl(null);
    setLoading(true);

    (async () => {
      try {
        // Upload the cropped highlight + full page for AI context
        const cropFile = await dataUrlToFile(cropDataUrl, `highlight-p${pageNumber}.jpg`);
        const { file_url: cropUrl } = await base44.integrations.Core.UploadFile({ file: cropFile });
        if (cancelled) return;
        setHighlightUrl(cropUrl);

        let pageUrl = cropUrl;
        if (pageDataUrl) {
          try {
            const pageFile = await dataUrlToFile(pageDataUrl, `page-p${pageNumber}.jpg`);
            const up = await base44.integrations.Core.UploadFile({ file: pageFile });
            if (!cancelled && up?.file_url) pageUrl = up.file_url;
          } catch {}
        }

        const prompt = `You are analyzing a cabinet shop manufacturing cut list / spec plan page.
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

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
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

        if (cancelled) return;
        setForm({
          room: result?.room || "",
          cabinet: result?.cabinet || "",
          pickup_type: PICKUP_TYPES.includes(result?.pickup_type) ? result.pickup_type : "Other",
          quantity: result?.quantity || "",
          width: result?.width || "",
          length: result?.length || "",
          material: result?.material || "",
          finish: result?.finish || ""
        });
      } catch (err) {
        if (!cancelled) toast.error("AI extraction failed — you can still fill the form manually.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, cropDataUrl, pageDataUrl, pageNumber]);

  const buildDescription = () => {
    const qty = form.quantity || "";
    return `${form.pickup_type || "Item"}${qty ? ` - Qty ${qty}` : ""}${form.width ? ` - ${form.width}` : ""}${form.length ? ` x ${form.length}` : ""}${form.material ? ` - ${form.material}` : ""}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.MissingItem.create({
        production_item_id: productionItem?.id || null,
        production_item_name: productionItem?.name || "Unknown",
        project_id: productionItem?.project_id || null,
        project_name: productionItem?.project_name || null,
        room_name: form.room,
        cabinet_name: form.cabinet,
        pickup_type: form.pickup_type,
        quantity: form.quantity !== "" ? Number(form.quantity) : null,
        width: form.width,
        length: form.length,
        material: form.material,
        finish: form.finish,
        item_description: buildDescription(),
        status: "Open",
        reported_by: currentUser?.full_name || currentUser?.email || "Unknown",
        reported_at: new Date().toISOString(),
        source_page: pageNumber || null,
        highlight_image_url: highlightUrl || null,
      });
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      toast.success("Pick Up created from highlight ✓");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || "Failed to create pick up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <ClipboardCheck className="w-4 h-4" /> Create Pick Up from Highlight
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            From <strong>{productionItem?.name || "card"}</strong> · Page {pageNumber}
          </p>
        </DialogHeader>

        {highlightUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <img src={highlightUrl} alt="Highlight" className="max-h-24 rounded border border-slate-200 object-contain" />
            <span className="text-xs text-slate-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Cropped snapshot</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Extracting spec data with AI…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Room</Label>
              <Input value={form.room} onChange={e => set("room", e.target.value)} placeholder="e.g. Kitchen" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cabinet</Label>
              <Input value={form.cabinet} onChange={e => set("cabinet", e.target.value)} placeholder="e.g. RSC6" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pick Up Type</Label>
              <Select value={form.pickup_type} onValueChange={v => set("pickup_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} placeholder="2" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input value={form.width} onChange={e => set("width", e.target.value)} placeholder="15 5/8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Length</Label>
              <Input value={form.length} onChange={e => set("length", e.target.value)} placeholder="24 13/16" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material</Label>
              <Input value={form.material} onChange={e => set("material", e.target.value)} placeholder="Maple FF" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finish</Label>
              <Input value={form.finish} onChange={e => set("finish", e.target.value)} placeholder="Down Pipe-FB…" />
            </div>
            <div className="col-span-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Summary: </span>{buildDescription()}
            </div>
          </div>
        )}

        {!loading && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Pick Up
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}