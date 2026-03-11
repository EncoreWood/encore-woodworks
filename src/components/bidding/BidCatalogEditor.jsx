import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save } from "lucide-react";

export const DEFAULT_CATALOG = [
  { name: "Base Cabinets",           cabinet_category: "base",  measure_type: "lf",  default_price: 0,   sort_order: 1 },
  { name: "Wall/Upper Cabinets",     cabinet_category: "upper", measure_type: "lf",  default_price: 0,   sort_order: 2 },
  { name: "Tall Cabinets",           cabinet_category: "tall",  measure_type: "lf",  default_price: 0,   sort_order: 3 },
  { name: "Island",                  cabinet_category: "base",  measure_type: "lf",  default_price: 0,   sort_order: 4 },
  { name: "Pantry Tower",            cabinet_category: "tall",  measure_type: "lf",  default_price: 0,   sort_order: 5 },
  { name: "Vanity Base",             cabinet_category: "base",  measure_type: "lf",  default_price: 0,   sort_order: 6 },
  { name: "Vanity Upper",            cabinet_category: "upper", measure_type: "lf",  default_price: 0,   sort_order: 7 },
  { name: "Appliance Panel",         cabinet_category: "misc",  measure_type: "qty", default_price: 150, sort_order: 8 },
  { name: "Lazy Susan",              cabinet_category: "misc",  measure_type: "qty", default_price: 300, sort_order: 9 },
  { name: "Pull-out Trash",          cabinet_category: "misc",  measure_type: "qty", default_price: 250, sort_order: 10 },
  { name: "Rollout Shelf",           cabinet_category: "misc",  measure_type: "qty", default_price: 150, sort_order: 11 },
  { name: "Crown Molding",           cabinet_category: "misc",  measure_type: "lf",  default_price: 25,  sort_order: 12 },
  { name: "Light Rail",              cabinet_category: "misc",  measure_type: "lf",  default_price: 15,  sort_order: 13 },
  { name: "Blind Corner Optimizer",  cabinet_category: "misc",  measure_type: "qty", default_price: 200, sort_order: 14 },
  { name: "Filler Panel",            cabinet_category: "misc",  measure_type: "qty", default_price: 75,  sort_order: 15 },
];

const CAT_COLORS = { base: "text-amber-700", upper: "text-blue-700", tall: "text-purple-700", misc: "text-slate-600" };

export default function BidCatalogEditor({ open, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  const loadItems = async () => {
    const existing = await base44.entities.BidItemCatalog.list("sort_order");
    if (existing.length === 0) {
      const created = await Promise.all(DEFAULT_CATALOG.map(d => base44.entities.BidItemCatalog.create(d)));
      setItems(created);
    } else {
      setItems(existing);
    }
  };

  const addNew = () => {
    setItems(prev => [...prev, { _isNew: true, id: `new_${Date.now()}`, name: "", cabinet_category: "misc", measure_type: "lf", default_price: 0, sort_order: prev.length + 1 }]);
  };

  const updateLocal = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = async (item) => {
    if (!item._isNew) await base44.entities.BidItemCatalog.delete(item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(items.map(({ _isNew, ...data }) =>
      _isNew
        ? base44.entities.BidItemCatalog.create(data)
        : base44.entities.BidItemCatalog.update(data.id, { name: data.name, cabinet_category: data.cabinet_category, measure_type: data.measure_type, default_price: data.default_price })
    ));
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Catalog</DialogTitle>
          <p className="text-sm text-slate-500">Manage items available in the "Add item" dropdown for each room.</p>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-[1fr_100px_60px_90px_36px] gap-2 text-xs font-semibold text-slate-500 px-1">
            <div>Item Name</div>
            <div>Category</div>
            <div className="text-center">Type</div>
            <div className="text-center">Default $</div>
            <div></div>
          </div>

          {items.map(item => (
            <div key={item.id} className="grid grid-cols-[1fr_100px_60px_90px_36px] gap-2 items-center">
              <Input value={item.name} onChange={e => updateLocal(item.id, "name", e.target.value)} className="h-9 text-sm" placeholder="Item name" />
              <Select value={item.cabinet_category} onValueChange={v => updateLocal(item.id, "cabinet_category", v)}>
                <SelectTrigger className={`h-9 text-xs font-semibold ${CAT_COLORS[item.cabinet_category]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="upper">Upper</SelectItem>
                  <SelectItem value="tall">Tall</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                </SelectContent>
              </Select>
              <Select value={item.measure_type} onValueChange={v => updateLocal(item.id, "measure_type", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lf">LF</SelectItem>
                  <SelectItem value="qty">Qty</SelectItem>
                  <SelectItem value="sqft">SqFt</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={item.default_price} onChange={e => updateLocal(item.id, "default_price", parseFloat(e.target.value) || 0)} className="h-9 text-sm text-center" placeholder="0" />
              <Button variant="ghost" size="icon" onClick={() => deleteItem(item)} className="h-9 w-9 text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={addNew} variant="outline" className="w-full border-dashed mt-2 h-9">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Catalog"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}