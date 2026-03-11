import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Trash2, X, Check } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_TYPES = ["Deposit", "Progress Payment", "Final Payment", "Other"];
const PAYMENT_STATUSES = ["Received", "Pending", "Overdue"];

const statusColors = {
  Received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
};

const emptyEntry = { type: "Deposit", amount: "", date: "", status: "Pending", note: "" };

export default function PaymentLog({ project, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState(emptyEntry);

  const payments = project.payments || [];
  const contractValue = project.estimated_budget || 0;
  const totalCollected = payments
    .filter(p => p.status === "Received")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = contractValue - totalCollected;

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

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Payment Log
        </h2>
        {!showForm && (
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8 gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Contract Value</p>
          <p className="text-base font-bold text-slate-800">${contractValue.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">Collected</p>
          <p className="text-base font-bold text-emerald-700">${totalCollected.toLocaleString()}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
          <p className="text-xs text-slate-500 mb-1">Remaining</p>
          <p className={`text-base font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-500"}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Type</Label>
              <Select value={newEntry.type} onValueChange={v => setNewEntry(e => ({ ...e, type: v }))}>
                <SelectTrigger className="h-8 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
              <Select value={newEntry.status} onValueChange={v => setNewEntry(e => ({ ...e, status: v }))}>
                <SelectTrigger className="h-8 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
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
        <p className="text-sm text-slate-400 text-center py-4">No payments logged yet.</p>
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
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                onClick={() => handleDelete(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}