import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2, X, Settings2 } from "lucide-react";
import CategoryManager from "@/components/inventory/CategoryManager";

export default function InventoryForm({ open, onOpenChange, editingItem, onSave }) {
  const [form, setForm] = useState({
    name: "", category: "", quantity: "", unit: "", min_quantity: "",
    price_per_unit: "", supplier: "", location: "", notes: "", status: "in_stock", image_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("sort_order"),
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, image_url: file_url }));
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploadingImage(false);
    }
  };

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
        image_url: editingItem.image_url || "",
      });
    } else {
      setForm({ name: "", category: categories[0]?.name || "", quantity: "", unit: "", min_quantity: "", price_per_unit: "", supplier: "", location: "", notes: "", status: "in_stock", image_url: "" });
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
              <div className="flex gap-1.5 mt-1">
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowCatManager(true)} title="Manage categories">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </div>
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
              <Select value={form.location || "none"} onValueChange={v => setForm(p => ({ ...p, location: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Cut">Cut</SelectItem>
                  <SelectItem value="Face Frame">Face Frame</SelectItem>
                  <SelectItem value="Spray">Spray</SelectItem>
                  <SelectItem value="Build">Build</SelectItem>
                  <SelectItem value="Install">Install</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                </SelectContent>
              </Select>
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
            <label className="text-sm font-medium text-slate-700">Item Image</label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Item" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, image_url: "" }))}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors ${uploadingImage ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingImage ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
                </label>
              )}
              <p className="text-xs text-slate-400">Shows on QR code labels</p>
            </div>
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
      <CategoryManager open={showCatManager} onOpenChange={setShowCatManager} />
    </Dialog>
  );
}