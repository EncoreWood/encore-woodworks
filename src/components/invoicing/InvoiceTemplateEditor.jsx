import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

const DEFAULT_TEMPLATE = {
  logo_url: "",
  company_name: "Encore Woodworks",
  tagline: "Custom Cabinetry",
  address: "736 S 5725 W Hurricane, Utah 84737",
  phone: "(435) 632-2903",
  email: "Team@encorewood.com",
  website: "www.encorewood.com",
  primary_color: "#8a7560",
  header_bg_color: "#1e293b",
  header_text_color: "#ffffff",
  footer_text: "Payment is due within 15 days. Please make checks payable to Encore Woodworks. Thank you for your business!",
  font_family: "helvetica",
  default_deposit_percent: 30,
  default_progress_percent: 60,
  default_final_percent: 10,
  last_invoice_number: 0,
};

export default function InvoiceTemplateEditor({ open, onClose }) {
  const [tpl, setTpl] = useState(null);
  const [tplId, setTplId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const list = await base44.entities.InvoiceTemplate.list();
        if (alive) {
          if (list && list.length > 0) {
            setTplId(list[0].id);
            setTpl({ ...DEFAULT_TEMPLATE, ...list[0] });
          } else {
            setTplId(null);
            setTpl({ ...DEFAULT_TEMPLATE });
          }
        }
      } catch (e) {
        toast.error("Failed to load template");
      }
    })();
    return () => { alive = false; };
  }, [open]);

  const upd = (k, v) => setTpl((t) => ({ ...t, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      upd("logo_url", file_url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...tpl };
      delete payload.id;
      delete payload.created_date;
      delete payload.updated_date;
      delete payload.created_by_id;
      if (tplId) {
        await base44.entities.InvoiceTemplate.update(tplId, payload);
      } else {
        const created = await base44.entities.InvoiceTemplate.create(payload);
        setTplId(created.id);
      }
      toast.success("Invoice template saved");
      onClose();
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Template Settings</DialogTitle>
        </DialogHeader>
        {!tpl ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {tpl.logo_url ? (
                  <img src={tpl.logo_url} alt="logo" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs">No logo</div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {tpl.logo_url ? "Replace" : "Upload"}
                  </span>
                </label>
                {tpl.logo_url && (
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => upd("logo_url", "")}>Remove</Button>
                )}
              </div>
            </div>

            {/* Header text */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company Name</Label>
                <Input value={tpl.company_name || ""} onChange={(e) => upd("company_name", e.target.value)} />
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={tpl.tagline || ""} onChange={(e) => upd("tagline", e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={tpl.address || ""} onChange={(e) => upd("address", e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={tpl.phone || ""} onChange={(e) => upd("phone", e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={tpl.email || ""} onChange={(e) => upd("email", e.target.value)} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={tpl.website || ""} onChange={(e) => upd("website", e.target.value)} />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Primary / Accent</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tpl.primary_color || "#8a7560"} onChange={(e) => upd("primary_color", e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                  <Input value={tpl.primary_color || ""} onChange={(e) => upd("primary_color", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Header Background</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tpl.header_bg_color || "#1e293b"} onChange={(e) => upd("header_bg_color", e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                  <Input value={tpl.header_bg_color || ""} onChange={(e) => upd("header_bg_color", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Header Text</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tpl.header_text_color || "#ffffff"} onChange={(e) => upd("header_text_color", e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                  <Input value={tpl.header_text_color || ""} onChange={(e) => upd("header_text_color", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Font */}
            <div>
              <Label>Font</Label>
              <select
                value={tpl.font_family || "helvetica"}
                onChange={(e) => upd("font_family", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="helvetica">Helvetica (clean sans)</option>
                <option value="times">Times (classic serif)</option>
                <option value="courier">Courier (monospace)</option>
              </select>
            </div>

            {/* Default percentages */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Deposit %</Label>
                <Input type="number" value={tpl.default_deposit_percent ?? 30} onChange={(e) => upd("default_deposit_percent", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Progress %</Label>
                <Input type="number" value={tpl.default_progress_percent ?? 60} onChange={(e) => upd("default_progress_percent", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Final %</Label>
                <Input type="number" value={tpl.default_final_percent ?? 10} onChange={(e) => upd("default_final_percent", parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Footer */}
            <div>
              <Label>Footer Text (payment terms, remittance, thank-you)</Label>
              <Textarea rows={3} value={tpl.footer_text || ""} onChange={(e) => upd("footer_text", e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !tpl} className="bg-amber-600 hover:bg-amber-700">
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}