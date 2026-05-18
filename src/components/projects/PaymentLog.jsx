import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Trash2, X, Check, PlusCircle, Pencil } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_TYPES = ["Deposit", "Progress Payment", "Final Payment", "Other"];
const PAYMENT_STATUSES = ["Received", "Pending", "Overdue"];

const statusColors = {
  Received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
};

const emptyEntry = { type: "Deposit", amount: "", date: "", status: "Pending", note: "" };
const emptyCO = { description: "", amount: "", date: new Date().toISOString().split("T")[0] };

function EditableTile({ label, value, onSave, colorClass = "text-slate-700", bgClass = "bg-slate-50" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => { setDraft(value || ""); setEditing(true); };
  const save = () => { onSave(parseFloat(draft) || 0); setEditing(false); };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className={`${bgClass} rounded-lg p-2 text-center`}>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <div className="flex items-center gap-1 justify-center">
          <span className="text-xs text-slate-400">$</span>
          <input
            type="number"
            className="w-24 text-center text-sm font-bold border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            autoFocus
          />
        </div>
        <div className="flex gap-1 justify-center mt-1">
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
          <button onClick={cancel} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgClass} rounded-lg p-3 text-center group cursor-pointer relative`} onClick={start}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>${(value || 0).toLocaleString()}</p>
      <Pencil className="w-2.5 h-2.5 text-slate-400 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function PaymentLog({ project, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState(emptyEntry);
  const [showCOForm, setShowCOForm] = useState(false);
  const [newCO, setNewCO] = useState(emptyCO);

  const payments = project.payments || [];
  const changeOrders = project.change_orders || [];
  const estimated = project.estimated_budget || 0;
  const baseTotal = project.base_amount || project.total_amount || estimated;
  const changeOrdersTotal = changeOrders.reduce((s, co) => s + (parseFloat(co.amount) || 0), 0);
  const currentTotal = baseTotal + changeOrdersTotal;
  const totalCollected = payments
    .filter(p => p.status === "Received")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = currentTotal - totalCollected;

  const handleAdd = () => {
    if (!newEntry.amount || !newEntry.date) return;
    const updated = [...payments, { ...newEntry, amount: parseFloat(newEntry.amount) }];
    onSave({ payments: updated });
    setNewEntry(emptyEntry);
    setShowForm(false);
  };

  const handleDelete = (idx) => {
    const updated = payments.filter((_, i) => i !== idx);
    onSave({ payments: updated });
  };

  const handleAddCO = () => {
    if (!newCO.description || !newCO.amount) return;
    const updated = [...changeOrders, { id: Date.now().toString(), description: newCO.description, amount: parseFloat(newCO.amount) || 0, date: newCO.date }];
    const newCOTotal = updated.reduce((s, co) => s + (parseFloat(co.amount) || 0), 0);
    onSave({ change_orders: updated, total_amount: baseTotal + newCOTotal, base_amount: baseTotal });
    setNewCO(emptyCO);
    setShowCOForm(false);
  };

  const handleDeleteCO = (idx) => {
    const updated = changeOrders.filter((_, i) => i !== idx);
    const newCOTotal = updated.reduce((s, co) => s + (parseFloat(co.amount) || 0), 0);
    onSave({ change_orders: updated, total_amount: baseTotal + newCOTotal, base_amount: baseTotal });
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Financials
        </h2>
        {!showForm && (
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8 gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </Button>
        )}
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <EditableTile label="Estimated" value={estimated} onSave={v => onSave({ estimated_budget: v })} colorClass="text-slate-700" bgClass="bg-slate-50" />
        <EditableTile label="Current Total" value={currentTotal} onSave={v => onSave({ base_amount: v })} colorClass="text-blue-800" bgClass="bg-blue-50" />
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">Collected</p>
          <p className="text-sm font-bold text-emerald-700">${totalCollected.toLocaleString()}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
          <p className="text-xs text-slate-500 mb-1">Remaining</p>
          <p className={`text-sm font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-500"}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Change Orders Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">
            Change Orders
            {changeOrdersTotal > 0 && <span className="ml-2 text-blue-600">+${changeOrdersTotal.toLocaleString()}</span>}
          </p>
          {!showCOForm && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCOForm(true)}>
              <PlusCircle className="w-3 h-3" /> Add
            </Button>
          )}
        </div>

        {changeOrders.length > 0 && (
          <div className="space-y-1 mb-2">
            {changeOrders.map((co, idx) => (
              <div key={co.id || idx} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-sm group">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800">{co.description}</span>
                  {co.date && <span className="text-xs text-slate-400 ml-2">{co.date}</span>}
                </div>
                <span className="font-semibold text-blue-700 mr-2">+${(co.amount || 0).toLocaleString()}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteCO(idx)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showCOForm && (
          <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50">
            <Input placeholder="Description" value={newCO.description} onChange={e => setNewCO(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm" />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input type="number" className="pl-5 h-8 text-sm" placeholder="Amount" value={newCO.amount} onChange={e => setNewCO(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <Input type="date" className="w-36 h-8 text-sm" value={newCO.date} onChange={e => setNewCO(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 gap-1" onClick={handleAddCO} disabled={!newCO.description || !newCO.amount}>
                <Check className="w-3 h-3" /> Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => { setShowCOForm(false); setNewCO(emptyCO); }}>
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {changeOrders.length === 0 && !showCOForm && (
          <p className="text-xs text-slate-400">No change orders yet.</p>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Payments</p>

        {/* Add Payment Form */}
        {showForm && (
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Type</Label>
                <Select value={newEntry.type} onValueChange={v => setNewEntry(e => ({ ...e, type: v }))}>
                  <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
                <Select value={newEntry.status} onValueChange={v => setNewEntry(e => ({ ...e, status: v }))}>
                  <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Amount ($)</Label>
                <Input type="number" value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))} className="h-8 text-sm bg-white" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Date</Label>
                <Input type="date" value={newEntry.date} onChange={e => setNewEntry(p => ({ ...p, date: e.target.value }))} className="h-8 text-sm bg-white" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Note (optional)</Label>
              <Input value={newEntry.note} onChange={e => setNewEntry(p => ({ ...p, note: e.target.value }))} className="h-8 text-sm bg-white" placeholder="Optional note..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={handleAdd} disabled={!newEntry.amount || !newEntry.date}>
                <Check className="w-3 h-3" /> Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => { setShowForm(false); setNewEntry(emptyEntry); }}>
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Payment List */}
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">No payments logged yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{p.type}</span>
                    <Badge className={`text-xs border ${statusColors[p.status] || statusColors.Pending}`}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-bold text-slate-700">${parseFloat(p.amount || 0).toLocaleString()}</span>
                    {p.date && <span className="text-xs text-slate-400">{format(new Date(p.date), "MMM d, yyyy")}</span>}
                    {p.note && <span className="text-xs text-slate-500 italic truncate">{p.note}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}