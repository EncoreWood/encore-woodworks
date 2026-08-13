import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Download, Send } from "lucide-react";

const TYPE_DEFAULTS = {
  deposit: "default_deposit_percent",
  progress: "default_progress_percent",
  final: "default_final_percent",
};

const fmtInvNum = (n) => `INV-${String(n).padStart(4, "0")}`;

export default function SendInvoiceModal({ open, project, onClose, onSent }) {
  const [tpl, setTpl] = useState(null);
  const [invoiceType, setInvoiceType] = useState("deposit");
  const [percentage, setPercentage] = useState(30);
  const [amount, setAmount] = useState(0);
  const [amountEdited, setAmountEdited] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [invNum, setInvNum] = useState("INV-0001");
  const [invNumInt, setInvNumInt] = useState(1);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const grandTotal = useMemo(() => {
    const base = Number(project?.base_amount || project?.total_amount || project?.estimated_budget || 0);
    const co = (project?.change_orders || []).reduce((s, co) => s + Number(co.amount || 0), 0);
    return base + co;
  }, [project]);

  // Load template + initialize defaults when opening
  useEffect(() => {
    if (!open || !project) return;
    let alive = true;
    (async () => {
      let loaded = null;
      try {
        const list = await base44.entities.InvoiceTemplate.list();
        if (list && list.length > 0) loaded = list[0];
      } catch {}
      const t = loaded || { company_name: "Encore Woodworks", default_deposit_percent: 30, default_progress_percent: 60, default_final_percent: 10, last_invoice_number: 0 };
      if (!alive) return;
      setTpl(t);

      // Default invoice type from project stage
      const st = project.invoice_status || "deposit_invoice_sent";
      let defType = "deposit";
      if (st === "ninety_percent_sent" || st === "ninety_percent_received") defType = "progress";
      else if (st === "final_sent" || st === "paid_in_full") defType = "final";
      setInvoiceType(defType);

      const defPctKey = TYPE_DEFAULTS[defType];
      const pct = Number(t[defPctKey] ?? (defType === "deposit" ? 30 : defType === "progress" ? 60 : 10));
      setPercentage(pct);
      setAmountEdited(false);
      setAmount(Number((pct / 100 * grandTotal).toFixed(2)));

      const next = Number(t.last_invoice_number || 0) + 1;
      setInvNumInt(next);
      const num = fmtInvNum(next);
      setInvNum(num);

      const company = t.company_name || "Encore Woodworks";
      const due = format(addDays(new Date(), 15), "MMM d, yyyy");
      setToEmail(project.client_email || "");
      setSubject(`Invoice #${num} from ${company}`);
      setBody(
        `Hi ${project.client_name || "Client"},\n\n` +
        `Please find attached your invoice #${num} from ${company}. ` +
        `The total amount due is $${Number((pct / 100 * grandTotal).toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2 })}. ` +
        `Payment is due by ${due}.\n\n` +
        `Thank you for your business!\n\n— ${company} Team`
      );
    })();
    return () => { alive = false; };
  }, [open, project, grandTotal]);

  // Recompute amount when percentage changes (unless user manually edited amount)
  useEffect(() => {
    if (!amountEdited) {
      setAmount(Number((Number(percentage || 0) / 100 * grandTotal).toFixed(2)));
    }
  }, [percentage, grandTotal, amountEdited]);

  const changeType = (t) => {
    setInvoiceType(t);
    const pctKey = TYPE_DEFAULTS[t];
    const pct = Number(tpl?.[pctKey] ?? (t === "deposit" ? 30 : t === "progress" ? 60 : 10));
    setPercentage(pct);
    setAmountEdited(false);
    setAmount(Number((pct / 100 * grandTotal).toFixed(2)));
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await base44.functions.invoke("generateInvoicePDF", {
        project_id: project.id,
        invoice_type: invoiceType,
        percentage,
        amount,
        invoice_number: invNum,
      });
      const link = document.createElement("a");
      link.href = res.data.file_url;
      link.download = res.data.file_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Invoice PDF generated");
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!toEmail || !toEmail.includes("@")) {
      toast.error("Please enter a valid recipient email");
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke("sendInvoice", {
        project_id: project.id,
        invoice_type: invoiceType,
        percentage,
        amount,
        invoice_number: invNum,
        invoice_number_int: invNumInt,
        to_email: toEmail,
        subject,
        body,
      });
      toast.success(`Invoice ${invNum} sent to ${toEmail}`);
      onSent?.(project, invNum);
      onClose();
    } catch (err) {
      toast.error("Failed to send invoice: " + (err.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Invoice — {project.project_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Invoice type selector */}
          <div>
            <Label>Invoice Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {["deposit", "progress", "final"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${invoiceType === t ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"}`}
                >
                  {t === "deposit" ? "Deposit" : t === "progress" ? "Progress" : "Final"}
                </button>
              ))}
            </div>
          </div>

          {/* Percentage + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Percentage of Total ({grandTotal ? `$${grandTotal.toLocaleString()}` : ""})</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={percentage} onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)} />
                <span className="text-slate-500">%</span>
              </div>
            </div>
            <div>
              <Label>Invoice Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input type="number" className="pl-7" value={amount} onChange={(e) => { setAmount(parseFloat(e.target.value) || 0); setAmountEdited(true); }} />
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <Label>Recipient Email {!project.client_email && <span className="text-red-500 text-xs">(no client email on file — enter manually)</span>}</Label>
            <Input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="client@example.com" />
          </div>

          {/* Subject */}
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Body */}
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="text-xs text-slate-500">
            Invoice <span className="font-semibold">{invNum}</span> will be attached as a PDF.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handlePreview} disabled={previewing}>
            {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Preview PDF
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? "Sending..." : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}