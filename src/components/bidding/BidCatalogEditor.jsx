import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, Tag, List } from "lucide-react";

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

export const DEFAULT_CATEGORIES = [
  { label: "Base",  key: "base",  color: "amber",  sort_order: 1 },
  { label: "Upper", key: "upper", color: "blue",   sort_order: 2 },
  { label: "Tall",  key: "tall",  color: "purple", sort_order: 3 },
  { label: "Misc",  key: "misc",  color: "slate",  sort_order: 4 },
];

const COLOR_OPTIONS = ["amber", "blue", "purple", "slate", "green", "red", "indigo", "teal", "orange", "pink"];

const COLOR_CLASSES = {
  amber:  { text: "text-amber-700",  bg: "bg-amber-100",  active: "bg-amber-600 text-white" },
  blue:   { text: "text-blue-700",   bg: "bg-blue-100",   active: "bg-blue-600 text-white" },
  purple: { text: "text-purple-700", bg: "bg-purple-100", active: "bg-purple-600 text-white" },
  slate:  { text: "text-slate-600",  bg: "bg-slate-100",  active: "bg-slate-500 text-white" },
  green:  { text: "text-green-700",  bg: "bg-green-100",  active: "bg-green-600 text-white" },
  red:    { text: "text-red-700",    bg: "bg-red-100",    active: "bg-red-600 text-white" },
  indigo: { text: "text-indigo-700", bg: "bg-indigo-100", active: "bg-indigo-600 text-white" },
  teal:   { text: "text-teal-700",   bg: "bg-teal-100",   active: "bg-teal-600 text-white" },
  orange: { text: "text-orange-700", bg: "bg-orange-100", active: "bg-orange-600 text-white" },
  pink:   { text: "text-pink-700",   bg: "bg-pink-100",   active: "bg-pink-600 text-white" },
};

export function getCategoryStyle(color) {
  return COLOR_CLASSES[color] || COLOR_CLASSES.slate;
}

export default function BidCatalogEditor({ open, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("items"); // "items" | "categories"
  const [activeCatFilter, setActiveCatFilter] = useState("all");

  useEffect(() => {
    if (open) { loadCategories(); loadItems(); }
  }, [open]);

  const loadCategories = async () => {
    const existing = await base44.entities.BidCategory.list("sort_order");
    if (existing.length === 0) {
      const created = await Promise.all(DEFAULT_CATEGORIES.map(c => base44.entities.BidCategory.create(c)));
      setCategories(created);
    } else {
      setCategories(existing);
    }
  };

  const loadItems = async () => {
    const existing = await base44.entities.BidItemCatalog.list("sort_order");
    if (existing.length === 0) {
      const created = await Promise.all(DEFAULT_CATALOG.map(d => base44.entities.BidItemCatalog.create(d)));
      setItems(created);
    } else {
      setItems(existing);
    }
  };

  // ── CATEGORY MANAGEMENT ──────────────────────────────────────
  const addCategory = () => {
    setCategories(prev => [...prev, { _isNew: true, id: `newcat_${Date.now()}`, label: "", key: "", color: "slate", sort_order: prev.length + 1 }]);
  };

  const updateCat = (id, field, value) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      // Auto-generate key from label if key hasn't been manually set
      if (field === "label" && (c._isNew || !c._keyManuallySet)) {
        updated.key = value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      }
      if (field === "key") updated._keyManuallySet = true;
      return updated;
    }));
  };

  const deleteCategory = async (cat) => {
    if (!cat._isNew) await base44.entities.BidCategory.delete(cat.id);
    setCategories(prev => prev.filter(c => c.id !== cat.id));
  };

  const saveCategories = async () => {
    setSaving(true);
    await Promise.all(categories.map(({ _isNew, _keyManuallySet, ...data }) =>
      _isNew
        ? base44.entities.BidCategory.create(data)
        : base44.entities.BidCategory.update(data.id, { label: data.label, key: data.key, color: data.color, sort_order: data.sort_order })
    ));
    setSaving(false);
    await loadCategories();
    onSaved?.();
  };

  // ── ITEM MANAGEMENT ──────────────────────────────────────────
  const addItem = () => {
    const cat = activeCatFilter === "all" ? (categories[0]?.key || "misc") : activeCatFilter;
    setItems(prev => [...prev, { _isNew: true, id: `new_${Date.now()}`, name: "", cabinet_category: cat, measure_type: "lf", default_price: 0, sort_order: prev.length + 1 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = async (item) => {
    if (!item._isNew) await base44.entities.BidItemCatalog.delete(item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const saveItems = async () => {
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

  const visibleItems = activeCatFilter === "all" ? items : items.filter(i => i.cabinet_category === activeCatFilter);
  const countFor = (key) => key === "all" ? items.length : items.filter(i => i.cabinet_category === key).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Catalog</DialogTitle>
          <p className="text-sm text-slate-500">Manage catalog items and categories.</p>
        </DialogHeader>

        {/* Main Tabs */}
        <div className="flex gap-1 border-b border-slate-200 -mx-1 px-1">
          {[
            { key: "items", label: "Items", icon: List },
            { key: "categories", label: "Categories", icon: Tag },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CATEGORIES TAB ── */}
        {activeTab === "categories" && (
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-[1fr_120px_100px_36px] gap-2 text-xs font-semibold text-slate-500 px-1">
              <div>Label</div><div>Key (slug)</div><div>Color</div><div></div>
            </div>
            {categories.map(cat => (
              <div key={cat.id} className="grid grid-cols-[1fr_120px_100px_36px] gap-2 items-center">
                <Input value={cat.label} onChange={e => updateCat(cat.id, "label", e.target.value)} className="h-9 text-sm" placeholder="Label" />
                <Input value={cat.key} onChange={e => updateCat(cat.id, "key", e.target.value)} className="h-9 text-xs font-mono text-slate-600" placeholder="key_slug" />
                <Select value={cat.color || "slate"} onValueChange={v => updateCat(cat.id, "color", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(c => (
                      <SelectItem key={c} value={c}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 bg-${c}-500`} />
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat)} className="h-9 w-9 text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

            <Button onClick={addCategory} variant="outline" className="w-full border-dashed h-9">
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveCategories} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Categories"}
              </Button>
            </div>
          </div>
        )}

        {/* ── ITEMS TAB ── */}
        {activeTab === "items" && (
          <>
            {/* Category Filter Pills */}
            <div className="flex gap-1.5 flex-wrap mt-1">
              <button
                onClick={() => setActiveCatFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCatFilter === "all"
                    ? "bg-slate-700 text-white border-transparent"
                    : "text-slate-600 bg-slate-100 border-slate-200 hover:border-slate-300"
                }`}
              >
                All <span className="opacity-70">({countFor("all")})</span>
              </button>
              {categories.map(cat => {
                const style = getCategoryStyle(cat.color);
                const isActive = activeCatFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCatFilter(cat.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isActive ? `${style.active} border-transparent` : `${style.text} ${style.bg} border-slate-200 hover:border-slate-300`
                    }`}
                  >
                    {cat.label} <span className="opacity-70">({countFor(cat.key)})</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 mt-1">
              <div className="grid grid-cols-[1fr_110px_60px_90px_36px] gap-2 text-xs font-semibold text-slate-500 px-1">
                <div>Item Name</div><div>Category</div><div className="text-center">Type</div><div className="text-center">Default $</div><div></div>
              </div>

              {visibleItems.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">No items in this category yet.</div>
              )}

              {visibleItems.map(item => {
                const catObj = categories.find(c => c.key === item.cabinet_category);
                const catStyle = getCategoryStyle(catObj?.color || "slate");
                return (
                  <div key={item.id} className="grid grid-cols-[1fr_110px_60px_90px_36px] gap-2 items-center">
                    <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-9 text-sm" placeholder="Item name" />
                    <Select value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                      <SelectTrigger className={`h-9 text-xs font-semibold ${catStyle.text} ${catStyle.bg}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={item.measure_type} onValueChange={v => updateItem(item.id, "measure_type", v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lf">LF</SelectItem>
                        <SelectItem value="qty">Qty</SelectItem>
                        <SelectItem value="sqft">SqFt</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" value={item.default_price} onChange={e => updateItem(item.id, "default_price", parseFloat(e.target.value) || 0)} className="h-9 text-sm text-center" placeholder="0" />
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item)} className="h-9 w-9 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button onClick={addItem} variant="outline" className="w-full border-dashed mt-2 h-9">
              <Plus className="w-4 h-4 mr-1" /> Add Item {activeCatFilter !== "all" ? `to ${categories.find(c => c.key === activeCatFilter)?.label || ""}` : ""}
            </Button>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveItems} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                <Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save Catalog"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}