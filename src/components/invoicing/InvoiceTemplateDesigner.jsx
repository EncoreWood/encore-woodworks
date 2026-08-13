import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, X, Upload, Save, Palette } from "lucide-react";

const DEFAULT_TEMPLATE = {
  logo_url: "",
  company_name: "Encore Woodworks",
  tagline: "Custom Cabinetry & Fine Woodworking",
  address: "736 S 5725 W, Hurricane, UT 84737",
  phone: "(435) 632-2903",
  email: "Team@encorewood.com",
  website: "www.encorewood.com",
  primary_color: "#B8860B",
  header_text_color: "#1A1A1A",
  footer_text: "Payment is due within 30 days. Please make checks payable to Encore Woodworks.",
  font_family: "serif",
  default_deposit_percent: 30,
  default_progress_percent: 60,
  default_final_percent: 10,
  last_invoice_number: 0,
};

const SERIF = 'Georgia, "Playfair Display", "Times New Roman", serif';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const hexToRgba = (hex, a) => {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
};

const money = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Inline click-to-edit text. Display styled; click swaps to a matching input. */
function EditableText({ value, onChange, placeholder = "Click to edit", className = "", multiline = false, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const commit = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value ?? ""); setEditing(false); };

  if (editing) {
    const shared = `${className} bg-amber-50 outline outline-1 outline-amber-400 rounded px-1 -mx-1 focus:outline-amber-500`;
    if (multiline) {
      return (
        <textarea autoFocus value={draft} rows={3} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={(e) => e.key === "Escape" && cancel()} className={`${shared} resize-none w-full`} />
      );
    }
    return (
      <input autoFocus type={type} value={draft} onChange={(e) => setDraft(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
        className={`${shared} ${type === "number" ? "w-24 text-right" : ""}`} />
    );
  }
  return (
    <span className={`${className} cursor-text hover:bg-amber-50/70 hover:outline hover:outline-1 hover:outline-amber-200 rounded px-1 -mx-1 transition-colors`}
      onClick={() => setEditing(true)} title="Click to edit">
      {value || <span className="text-slate-300 italic">{placeholder}</span>}
    </span>
  );
}

function ColorSwatch({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)}
        className="w-8 h-7 rounded border border-slate-300 cursor-pointer" />
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-20 h-7 text-xs border border-slate-300 rounded px-1" />
    </label>
  );
}

export default function InvoiceTemplateDesigner() {
  const [tpl, setTpl] = useState(null);
  const [tplId, setTplId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sample invoice data for the WYSIWYG preview (local only — not persisted to the template)
  const [invoiceNo, setInvoiceNo] = useState("INV-0001");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceType, setInvoiceType] = useState("deposit");
  const [percentage, setPercentage] = useState(30);
  const [priorPayments, setPriorPayments] = useState(0);
  const [clientName, setClientName] = useState("Mr. & Mrs. Johnson");
  const [clientAddress, setClientAddress] = useState("1234 Oakridge Lane, St. George, UT 84770");
  const [items, setItems] = useState([
    { id: "1", description: "Kitchen Cabinetry — Maple Shaker, full overlay", quantity: 1, unit_price: 18500 },
    { id: "2", description: "Island with seating & turned legs", quantity: 1, unit_price: 6200 },
    { id: "3", description: "Butler's Pantry cabinetry", quantity: 1, unit_price: 4800 },
  ]);
  const [changeOrders, setChangeOrders] = useState([
    { id: "c1", description: "Add integrated wine refrigerator cabinet", amount: 1450 },
  ]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await base44.entities.InvoiceTemplate.list();
        if (!alive) return;
        if (list && list.length > 0) {
          setTplId(list[0].id);
          setTpl({ ...DEFAULT_TEMPLATE, ...list[0] });
        } else {
          setTpl({ ...DEFAULT_TEMPLATE });
        }
      } catch (e) {
        toast.error("Failed to load template");
      }
    })();
    return () => { alive = false; };
  }, []);

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
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...tpl };
      delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (tplId) await base44.entities.InvoiceTemplate.update(tplId, payload);
      else { const created = await base44.entities.InvoiceTemplate.create(payload); setTplId(created.id); }
      toast.success("Invoice template saved");
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Keep the percentage in sync with the template defaults when the type changes
  const changeType = (t) => {
    setInvoiceType(t);
    const pctKey = t === "deposit" ? "default_deposit_percent" : t === "progress" ? "default_progress_percent" : "default_final_percent";
    setPercentage(tpl?.[pctKey] ?? (t === "deposit" ? 30 : t === "progress" ? 60 : 10));
  };

  if (!tpl) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const accent = tpl.primary_color || "#B8860B";
  const headColor = tpl.header_text_color || "#1A1A1A";
  const isFinal = invoiceType === "final";
  const fontBody = tpl.font_family === "times" ? SERIF : tpl.font_family === "courier" ? '"Courier New", monospace' : SANS;

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const coTotal = changeOrders.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const grandTotal = subtotal + coTotal;
  const thisInvoice = grandTotal * (percentage / 100);
  const amountDue = isFinal ? Math.max(0, grandTotal - (Number(priorPayments) || 0)) : Math.max(0, thisInvoice - (Number(priorPayments) || 0));

  const setItem = (id, key, val) => setItems((arr) => arr.map((i) => i.id === id ? { ...i, [key]: val } : i));
  const removeItem = (id) => setItems((arr) => arr.filter((i) => i.id !== id));
  const addItem = () => setItems((arr) => [...arr, { id: Date.now().toString(), description: "New line item", quantity: 1, unit_price: 0 }]);
  const setCO = (id, key, val) => setChangeOrders((arr) => arr.map((c) => c.id === id ? { ...c, [key]: val } : c));
  const removeCO = (id) => setChangeOrders((arr) => arr.filter((c) => c.id !== id));
  const addCO = () => setChangeOrders((arr) => [...arr, { id: Date.now().toString(), description: "New change order", amount: 0 }]);

  const typeLabel = invoiceType === "deposit" ? "DEPOSIT" : invoiceType === "progress" ? "PROGRESS PAYMENT" : "FINAL";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Palette className="w-4 h-4" style={{ color: accent }} /> Template Designer</div>
        <div className="h-6 w-px bg-slate-200" />
        <ColorSwatch label="Accent" value={accent} onChange={(v) => upd("primary_color", v)} />
        <ColorSwatch label="Header text" value={headColor} onChange={(v) => upd("header_text_color", v)} />
        <label className="flex items-center gap-2 text-xs">
          <span className="text-slate-600">Font</span>
          <select value={tpl.font_family} onChange={(e) => upd("font_family", e.target.value)} className="h-7 text-xs border border-slate-300 rounded px-1">
            <option value="serif">Serif (premium)</option>
            <option value="helvetica">Sans (clean)</option>
            <option value="times">Times</option>
            <option value="courier">Mono</option>
          </select>
        </label>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Template
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-1">Click any text on the invoice to edit it. Click the logo to upload a new one. Colors update the preview live.</p>

      {/* The invoice document (WYSIWYG canvas) */}
      <div className="bg-white shadow-xl rounded-lg mx-auto border border-slate-200" style={{ maxWidth: 820, fontFamily: fontBody, color: "#333" }}>
        {/* HEADER */}
        <div className="flex items-start justify-between px-12 pt-10 pb-5">
          <div className="flex items-start gap-4">
            <label className="cursor-pointer shrink-0" title="Click to upload logo">
              {tpl.logo_url ? (
                <img src={tpl.logo_url} alt="logo" className="h-16 w-16 object-contain hover:opacity-80 transition" />
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 hover:border-amber-400 hover:text-amber-500 transition">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-[8px] mt-0.5">logo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <div>
              <EditableText value={tpl.company_name} onChange={(v) => upd("company_name", v)} placeholder="Company Name"
                className="block text-2xl font-bold" />
              {tpl.logo_url && (
                <EditableText value={tpl.tagline} onChange={(v) => upd("tagline", v)} placeholder="Tagline"
                  className="block text-sm text-slate-400 mt-0.5" />
              )}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: headColor, fontFamily: SERIF }}>INVOICE</h1>
            <div className="text-sm text-slate-500 mt-1">
              <span className="font-medium text-slate-600">#</span><EditableText value={invoiceNo} onChange={setInvoiceNo} placeholder="INV-0000" className="font-medium text-slate-600" />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              <span>Issued: </span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="border-0 border-b border-slate-200 bg-transparent text-xs text-slate-500 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        </div>

        {/* Accent divider */}
        <div className="mx-12 h-px" style={{ backgroundColor: accent }} />

        {/* INVOICE TYPE BADGE + percentage */}
        <div className="flex items-center gap-3 px-12 py-5">
          <select value={invoiceType} onChange={(e) => changeType(e.target.value)}
            className="text-xs font-bold text-white rounded-full px-3 py-1 border-0 cursor-pointer focus:outline-none"
            style={{ backgroundColor: accent }}>
            <option value="deposit">DEPOSIT</option>
            <option value="progress">PROGRESS PAYMENT</option>
            <option value="final">FINAL</option>
          </select>
          {!isFinal && (
            <span className="text-sm text-slate-500 flex items-center">
              <EditableText type="number" value={percentage} onChange={(v) => setPercentage(Number(v) || 0)} className="font-semibold text-slate-700" />% of Total Contract
            </span>
          )}
        </div>

        {/* BILL TO */}
        <div className="px-12 pb-5">
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Bill To</p>
          <EditableText value={clientName} onChange={setClientName} placeholder="Client name" className="block text-base font-bold text-slate-800" />
          <EditableText value={clientAddress} onChange={setClientAddress} placeholder="Client address" multiline className="block text-sm text-slate-600 leading-snug max-w-xs" />
        </div>

        {/* LINE ITEMS */}
        <div className="px-12">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold pb-1.5">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2 mb-1">Original Contract Items</p>
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center py-2 group" style={{ borderBottom: "1px solid #E5E5E5" }}>
              <div className="col-span-6 text-sm">
                <EditableText value={it.description} onChange={(v) => setItem(it.id, "description", v)} placeholder="Description" />
              </div>
              <div className="col-span-2 text-right text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                <EditableText type="number" value={it.quantity} onChange={(v) => setItem(it.id, "quantity", v)} />
              </div>
              <div className="col-span-2 text-right text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="text-slate-400">$</span><EditableText type="number" value={it.unit_price} onChange={(v) => setItem(it.id, "unit_price", v)} />
              </div>
              <div className="col-span-2 text-right text-sm font-medium flex items-center justify-end gap-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                ${money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                <button onClick={() => removeItem(it.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition" title="Remove"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 mt-1.5"><Plus className="w-3 h-3" /> Add item</button>

          {changeOrders.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-1 px-2 py-1 rounded" style={{ backgroundColor: hexToRgba(accent, 0.05) }}>Change Orders</p>
              {changeOrders.map((co) => (
                <div key={co.id} className="grid grid-cols-12 gap-2 items-center py-2 group" style={{ borderBottom: "1px solid #E5E5E5", backgroundColor: hexToRgba(accent, 0.03) }}>
                  <div className="col-span-9 text-sm px-2">
                    <EditableText value={co.description} onChange={(v) => setCO(co.id, "description", v)} placeholder="Change order description" />
                  </div>
                  <div className="col-span-3 text-right text-sm font-medium flex items-center justify-end gap-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                    +${money(co.amount)}
                    <button onClick={() => removeCO(co.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition" title="Remove"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </>
          )}
          <button onClick={addCO} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 mt-1.5"><Plus className="w-3 h-3" /> Add change order</button>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end px-12 py-6">
          <div className="w-72 rounded-lg p-4 space-y-2" style={{ backgroundColor: hexToRgba(accent, 0.05) }}>
            {!isFinal ? (
              <>
                <Row label="Contract Total" value={grandTotal} />
                <Row label="Less Prior Payments" value={priorPayments} editable onChange={setPriorPayments} negative />
                <Row label={`This Invoice (${percentage}%)`} value={thisInvoice} />
                <div className="h-px my-1" style={{ backgroundColor: accent }} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: headColor }}>AMOUNT DUE</span>
                  <span className="text-xl font-bold" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>${money(amountDue)}</span>
                </div>
              </>
            ) : (
              <>
                <Row label="Subtotal" value={subtotal} />
                <Row label="Change Orders" value={coTotal} />
                <Row label="Less Prior Payments" value={priorPayments} editable onChange={setPriorPayments} negative />
                <div className="h-px my-1" style={{ backgroundColor: accent }} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: headColor }}>TOTAL DUE</span>
                  <span className="text-xl font-bold" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>${money(amountDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mx-12 h-px" style={{ backgroundColor: accent }} />
        <div className="px-12 py-5">
          <EditableText value={tpl.footer_text} onChange={(v) => upd("footer_text", v)} placeholder="Payment terms…" multiline className="block text-xs text-slate-500 leading-relaxed max-w-lg" />
          <p className="text-center text-xs text-slate-400 mt-2 italic">Thank you for your business!</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-3 text-[10px] text-slate-400">
            <EditableText value={tpl.address} onChange={(v) => upd("address", v)} placeholder="Address" />
            <span>·</span>
            <EditableText value={tpl.phone} onChange={(v) => upd("phone", v)} placeholder="Phone" />
            <span>·</span>
            <EditableText value={tpl.email} onChange={(v) => upd("email", v)} placeholder="Email" />
            <span>·</span>
            <EditableText value={tpl.website} onChange={(v) => upd("website", v)} placeholder="Website" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, editable, onChange, negative }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      {editable ? (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {negative && <span className="text-slate-400">−$</span>}{!negative && <span className="text-slate-400">$</span>}
          <EditableText type="number" value={value} onChange={onChange} className="font-medium text-slate-700" />
        </span>
      ) : (
        <span className="font-medium text-slate-700" style={{ fontVariantNumeric: "tabular-nums" }}>
          {negative ? "−" : ""}${money(value)}
        </span>
      )}
    </div>
  );
}