import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

const EMPTY = {
  name: "", category: "Monthly Bill", status: "Current", priority: "Normal",
  monthly_amount: "", total_owed: "", original_amount: "", amount_paid: "",
  due_date: "", auto_pay: false, plan_notes: "", vendor_contact: "", notes: ""
};

export default function BillingItemDrawer({ open, onOpenChange, item, defaultCategory, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({ ...EMPTY, ...item });
    } else {
      setForm({ ...EMPTY, category: defaultCategory || "Monthly Bill" });
    }
  }, [item, defaultCategory, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      monthly_amount: form.monthly_amount !== "" ? parseFloat(form.monthly_amount) : null,
      total_owed: form.total_owed !== "" ? parseFloat(form.total_owed) : null,
      original_amount: form.original_amount !== "" ? parseFloat(form.original_amount) : null,
      amount_paid: form.amount_paid !== "" ? parseFloat(form.amount_paid) : null,
    };
    if (item?.id) {
      await base44.entities.BillingItem.update(item.id, payload);
    } else {
      await base44.entities.BillingItem.create(payload);
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item ? "Edit Billing Item" : "Add Billing Item"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Loan - Equipment" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly Bill">Monthly Bill</SelectItem>
                  <SelectItem value="Supplier Debt">Supplier Debt</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Behind">Behind</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Paid Off">Paid Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly Amount ($)</Label>
              <Input type="number" value={form.monthly_amount} onChange={e => set("monthly_amount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Total Owed ($)</Label>
              <Input type="number" value={form.total_owed} onChange={e => set("total_owed", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {(form.category === "Supplier Debt" || form.category === "Loan") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Original Amount ($)</Label>
                <Input type="number" value={form.original_amount} onChange={e => set("original_amount", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Amount Paid ($)</Label>
                <Input type="number" value={form.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0.00" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={!!form.auto_pay} onCheckedChange={v => set("auto_pay", v)} id="auto-pay" />
            <Label htmlFor="auto-pay">Auto-Pay Enabled</Label>
          </div>

          {(form.category === "Supplier Debt" || form.category === "Loan") && (
            <div>
              <Label>Vendor / Lender Contact</Label>
              <Input value={form.vendor_contact || ""} onChange={e => set("vendor_contact", e.target.value)} placeholder="Phone, email, or name" />
            </div>
          )}

          {(form.category === "Supplier Debt" || form.category === "Loan") && (
            <div>
              <Label>Payoff Plan / Notes</Label>
              <Textarea value={form.plan_notes || ""} onChange={e => set("plan_notes", e.target.value)} rows={3} placeholder="Payment schedule, strategy..." />
            </div>
          )}

          <div>
            <Label>General Notes</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !form.name} className="flex-1 bg-amber-700 hover:bg-amber-800">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}