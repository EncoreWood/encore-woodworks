import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save } from "lucide-react";

const DEFAULT_INVOICES = [
  { id: "deposit", label: "Deposit" },
  { id: "ninety", label: "90%" },
  { id: "final", label: "Final" },
];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// Converts legacy fixed-field project data into custom_invoices array
export function getEffectiveInvoices(project) {
  if (project.custom_invoices && project.custom_invoices.length > 0) {
    return project.custom_invoices;
  }
  // Fall back to legacy fields
  const legacy = [];
  if (project.deposit_invoice_amount || project.deposit_invoice_sent_date || project.deposit_invoice_received_date) {
    legacy.push({
      id: "deposit",
      label: "Deposit",
      amount: project.deposit_invoice_amount || 0,
      sent_date: project.deposit_invoice_sent_date || "",
      received_date: project.deposit_invoice_received_date || "",
      expected_date: project.deposit_expected_date || "",
    });
  }
  if (project.ninety_percent_invoice_amount || project.ninety_percent_invoice_sent_date || project.ninety_percent_invoice_received_date) {
    legacy.push({
      id: "ninety",
      label: "90%",
      amount: project.ninety_percent_invoice_amount || 0,
      sent_date: project.ninety_percent_invoice_sent_date || "",
      received_date: project.ninety_percent_invoice_received_date || "",
      expected_date: project.ninety_percent_expected_date || "",
    });
  }
  if (project.final_invoice_amount || project.final_invoice_sent_date || project.final_invoice_received_date) {
    legacy.push({
      id: "final",
      label: "Final",
      amount: project.final_invoice_amount || 0,
      sent_date: project.final_invoice_sent_date || "",
      received_date: project.final_invoice_received_date || "",
      expected_date: project.final_expected_date || "",
    });
  }
  // If nothing exists yet, start with default template
  if (legacy.length === 0) {
    return DEFAULT_INVOICES.map(d => ({ ...d, amount: 0, sent_date: "", received_date: "", expected_date: "" }));
  }
  return legacy;
}

export function calcCollected(invoices) {
  return (invoices || []).reduce((sum, inv) => sum + (inv.received_date ? (parseFloat(inv.amount) || 0) : 0), 0);
}

export default function CustomInvoicesEditor({ project, onSave }) {
  const initial = getEffectiveInvoices(project);
  const [invoices, setInvoices] = useState(initial.map(inv => ({ ...inv, id: inv.id || makeId() })));
  const [dirty, setDirty] = useState(false);

  const update = (id, field, value) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, [field]: value } : inv));
    setDirty(true);
  };

  const addInvoice = () => {
    setInvoices(prev => [...prev, { id: makeId(), label: "New Invoice", amount: 0, sent_date: "", received_date: "", expected_date: "" }]);
    setDirty(true);
  };

  const removeInvoice = (id) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setDirty(true);
  };

  const handleSave = () => {
    const cleaned = invoices.map(inv => ({
      ...inv,
      amount: parseFloat(inv.amount) || 0,
    }));
    onSave(cleaned);
    setDirty(false);
  };

  const collected = calcCollected(invoices);
  const budget = project.estimated_budget || 0;
  const remaining = budget - collected;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Est. Budget</p>
          <p className="text-lg font-bold text-slate-900">${budget.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Collected</p>
          <p className="text-lg font-bold text-green-700">${collected.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Remaining</p>
          <p className="text-lg font-bold text-amber-700">${remaining.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoice rows */}
      <div className="space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className={`border rounded-lg p-4 ${inv.received_date ? "border-green-200 bg-green-50/30" : inv.sent_date ? "border-blue-200 bg-blue-50/30" : "border-slate-200 bg-slate-50/30"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Input
                className="h-7 text-sm font-semibold w-36"
                value={inv.label}
                onChange={(e) => update(inv.id, "label", e.target.value)}
                placeholder="Invoice name"
              />
              {inv.received_date && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Received</span>}
              {inv.sent_date && !inv.received_date && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Sent — Pending</span>}
              <button
                onClick={() => removeInvoice(inv.id)}
                className="ml-auto text-red-400 hover:text-red-600 p-1 rounded"
                title="Remove invoice"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Invoice Amount</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    className="pl-6 h-8 text-sm"
                    placeholder="0.00"
                    value={inv.amount || ""}
                    onChange={(e) => update(inv.id, "amount", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Expected Date</label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={inv.expected_date || ""}
                  onChange={(e) => update(inv.id, "expected_date", e.target.value)}
                  disabled={!!inv.received_date}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sent Date</label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={inv.sent_date || ""}
                  onChange={(e) => update(inv.id, "sent_date", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Received Date</label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={inv.received_date || ""}
                  onChange={(e) => update(inv.id, "received_date", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addInvoice} className="gap-1">
          <Plus className="w-4 h-4" /> Add Invoice
        </Button>
        {dirty && (
          <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 gap-1">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}