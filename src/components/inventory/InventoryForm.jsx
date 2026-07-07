import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function InventoryForm({ open, onOpenChange, editingItem, onSave }) {
  const [form, setForm] = useState({
    name: "", category: "other", quantity: "", unit: "", min_quantity: "",
    price_per_unit: "", supplier: "", location: "", notes: "", status: "in_stock",
  });
  const [saving, setSaving] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  useEffect(() => {
    if (editingItem) {
      setForm({
        name: editingItem.name || "",
        category: editingItem.category || "other",
        quantity: editingItem.quantity ?? "",
        unit: editingItem.unit || "",
        min_quantity: editingItem.min_quantity ?? "",
        price_per_unit: editingItem.price_per_unit ?? "",
        supplier: editingItem.supplier || "",
        location: editingItem.location || "",
        notes: editingItem.notes || "",
        status: editingItem.status || "in_stock",
      });
    } else {
      setForm({ name: "", category: "other", quantity: "", unit: "", min_quantity: "", price_per_unit: "", supplier: "", location: "", notes: "", status: "in_stock" });
    }
  }, [editingItem, open]);

  const handleSave = async () => {
    if (!form.name || !form.category || form.quantity === "") return;
    setSaving(true);
    const payload = {
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      min_quantity: form.min_quantity ? parseFloat(form.min_quantity) : null,
      price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
    };
    await onSave(payload);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Name *</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Category *</label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="finishes">Finishes</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">Full Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="reorder">Reorder</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Quantity *</label>
              <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="pcs, gal..." className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Min Qty</label>
              <Input type="number" value={form.min_quantity} onChange={e => setForm(p => ({ ...p, min_quantity: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Price/Unit</label>
              <Input type="number" step="0.01" value={form.price_per_unit} onChange={e => setForm(p => ({ ...p, price_per_unit: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Location</label>
              <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Supplier</label>
            <Select value={form.supplier} onValueChange={v => setForm(p => ({ ...p, supplier: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-amber-600 hover:bg-amber-700">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}