import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Check, Pencil, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DEFAULT_PRICING = [
  { style_key: "basic_euro",          style_label: "Tier 1 Euro",         bases_lf: 350, uppers_lf: 250, tall_lf: 400,  wood_species: "Maple",  door_style: "Slab",         handles: "Bar Pull",   drawerbox: "Dovetail", drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "high_end_euro",       style_label: "Tier 3 Euro",         bases_lf: 550, uppers_lf: 400, tall_lf: 650,  wood_species: "Walnut", door_style: "Slab",         handles: "Integrated", drawerbox: "Dovetail", drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "basic_face_frame",    style_label: "Tier 1 Face Frame",   bases_lf: 400, uppers_lf: 300, tall_lf: 450,  wood_species: "Maple",  door_style: "Shaker",       handles: "Bar Pull",   drawerbox: "Dovetail", drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "mid_face_frame",      style_label: "Tier 2 Face Frame",   bases_lf: 600, uppers_lf: 450, tall_lf: 700,  wood_species: "Cherry", door_style: "Raised Panel", handles: "Cup Pull",   drawerbox: "Dovetail", drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "high_end_face_frame", style_label: "Tier 3 Face Frame",   bases_lf: 900, uppers_lf: 700, tall_lf: 1100, wood_species: "Walnut", door_style: "Inset Shaker", handles: "Custom",     drawerbox: "Dovetail", drawer_glides: "Soft-Close", hinges: "Inset Concealed" },
];

const DEFAULT_CATALOG = [
  { name: "Base Cabinets",          cabinet_category: "base",  measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 1 },
  { name: "Wall/Upper Cabinets",    cabinet_category: "upper", measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 2 },
  { name: "Tall Cabinets",          cabinet_category: "tall",  measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 3 },
  { name: "Island",                 cabinet_category: "base",  measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 4 },
  { name: "Pantry Tower",           cabinet_category: "tall",  measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 5 },
  { name: "Vanity Base",            cabinet_category: "base",  measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 6 },
  { name: "Vanity Upper",           cabinet_category: "upper", measure_type: "lf",  default_price: 0,   is_active: true, sort_order: 7 },
  { name: "Appliance Panel",        cabinet_category: "misc",  measure_type: "qty", default_price: 150, is_active: true, sort_order: 8 },
  { name: "Lazy Susan",             cabinet_category: "misc",  measure_type: "qty", default_price: 300, is_active: true, sort_order: 9 },
  { name: "Pull-out Trash",         cabinet_category: "misc",  measure_type: "qty", default_price: 250, is_active: true, sort_order: 10 },
  { name: "Rollout Shelf",          cabinet_category: "misc",  measure_type: "qty", default_price: 150, is_active: true, sort_order: 11 },
  { name: "Crown Molding",          cabinet_category: "misc",  measure_type: "lf",  default_price: 25,  is_active: true, sort_order: 12 },
  { name: "Light Rail",             cabinet_category: "misc",  measure_type: "lf",  default_price: 15,  is_active: true, sort_order: 13 },
  { name: "Blind Corner Optimizer", cabinet_category: "misc",  measure_type: "qty", default_price: 200, is_active: true, sort_order: 14 },
  { name: "Filler Panel",           cabinet_category: "misc",  measure_type: "qty", default_price: 75,  is_active: true, sort_order: 15 },
];

const CATALOG_CATEGORIES = [
  { key: "all",              label: "All" },
  { key: "base",             label: "Base" },
  { key: "upper",            label: "Upper" },
  { key: "tall",             label: "Tall" },
  { key: "misc",             label: "Misc" },
  { key: "roll_out_inserts", label: "Roll Out/Inserts" },
  { key: "custom",           label: "Custom" },
];

// ── Inline editable price cell ────────────────────────────────────
function PriceCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(parseFloat(draft) || 0); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(parseFloat(draft) || 0); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="w-20 text-center text-sm border border-amber-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="font-semibold text-slate-800 hover:text-amber-700 hover:underline text-sm cursor-pointer px-1"
      title="Click to edit"
    >
      ${value}
    </button>
  );
}

// ── Style Card ────────────────────────────────────────────────────
function StyleCard({ config, onPriceChange, onEditClick }) {
  return (
    <Card className="p-4 border-2 border-slate-200 hover:border-amber-300 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-slate-900 text-sm">{config.style_label}</p>
          {config.description && <p className="text-xs text-slate-500 italic mt-0.5">{config.description}</p>}
        </div>
        <button onClick={() => onEditClick(config)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex-shrink-0">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span>Base $/LF</span>
          <PriceCell value={config.bases_lf || 0} onChange={v => onPriceChange(config.id, "bases_lf", v)} />
        </div>
        <div className="flex items-center justify-between">
          <span>Upper $/LF</span>
          <PriceCell value={config.uppers_lf || 0} onChange={v => onPriceChange(config.id, "uppers_lf", v)} />
        </div>
        <div className="flex items-center justify-between">
          <span>Tall $/LF</span>
          <PriceCell value={config.tall_lf || 0} onChange={v => onPriceChange(config.id, "tall_lf", v)} />
        </div>
      </div>
    </Card>
  );
}

// ── Style Edit Drawer ──────────────────────────────────────────────
function StyleEditDrawer({ config, open, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (config) setDraft({ ...config });
  }, [config]);

  if (!draft) return null;

  const field = (f, label) => (
    <div key={f}>
      <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
      <Input value={draft[f] || ""} onChange={e => setDraft(p => ({ ...p, [f]: e.target.value }))} className="h-9 text-sm" placeholder={label} />
    </div>
  );
  const numField = (f, label) => (
    <div key={f}>
      <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
      <Input type="number" value={draft[f] || 0} onChange={e => setDraft(p => ({ ...p, [f]: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm" />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Style: {draft.style_label}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {field("style_label", "Style Name")}
          {field("description", "Short Description")}
          <div className="grid grid-cols-3 gap-3">
            {numField("bases_lf", "Base $/LF")}
            {numField("uppers_lf", "Upper $/LF")}
            {numField("tall_lf", "Tall $/LF")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("wood_species", "Wood Species")}
            {field("door_style", "Door Style")}
            {field("handles", "Handles")}
            {field("drawerbox", "Drawerbox")}
            {field("drawer_glides", "Drawer Glides")}
            {field("hinges", "Hinges")}
          </div>
          <Button onClick={() => onSave(draft)} className="w-full bg-amber-600 hover:bg-amber-700">
            <Save className="w-4 h-4 mr-1" /> Save Style
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Pricing Tab ──────────────────────────────────────────────
export default function BidPricingTab() {
  const [styles, setStyles] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catFilter, setCatFilter] = useState("all");
  const [editingStyle, setEditingStyle] = useState(null);
  const [savingStyleId, setSavingStyleId] = useState(null);
  const [savedStyleId, setSavedStyleId] = useState(null);

  useEffect(() => {
    loadStyles();
    loadCatalog();
  }, []);

  const loadStyles = async () => {
    const existing = await base44.entities.BidPricingConfig.list();
    if (existing.length === 0) {
      const created = await Promise.all(DEFAULT_PRICING.map(d => base44.entities.BidPricingConfig.create(d)));
      setStyles(created);
    } else {
      const merged = DEFAULT_PRICING.map(def => existing.find(e => e.style_key === def.style_key) || def);
      const missing = merged.filter(m => !m.id);
      if (missing.length > 0) {
        await Promise.all(missing.map(m => base44.entities.BidPricingConfig.create(m)));
        setStyles(await base44.entities.BidPricingConfig.list());
      } else {
        setStyles(merged);
      }
    }
  };

  const loadCatalog = async () => {
    const items = await base44.entities.BidItemCatalog.list("sort_order");
    if (items.length === 0) {
      const created = await Promise.all(DEFAULT_CATALOG.map(d => base44.entities.BidItemCatalog.create(d)));
      setCatalogItems(created);
    } else {
      setCatalogItems(items);
    }
  };

  // Inline price change for style card — saves immediately
  const handleStylePriceChange = async (id, field, value) => {
    setStyles(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setSavingStyleId(id);
    await base44.entities.BidPricingConfig.update(id, { [field]: value });
    setSavingStyleId(null);
    setSavedStyleId(id);
    setTimeout(() => setSavedStyleId(p => p === id ? null : p), 1500);
  };

  const handleStyleDrawerSave = async (draft) => {
    const { id, ...data } = draft;
    await base44.entities.BidPricingConfig.update(id, {
      style_label: data.style_label, description: data.description,
      bases_lf: data.bases_lf, uppers_lf: data.uppers_lf, tall_lf: data.tall_lf,
      wood_species: data.wood_species, door_style: data.door_style, handles: data.handles,
      drawerbox: data.drawerbox, drawer_glides: data.drawer_glides, hinges: data.hinges,
    });
    setStyles(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
    setEditingStyle(null);
  };

  // Catalog inline editing — saves immediately on blur/change
  const updateCatalogItem = async (id, field, value) => {
    setCatalogItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    const isNew = String(id).startsWith("new_");
    if (!isNew) {
      await base44.entities.BidItemCatalog.update(id, { [field]: value });
    }
  };

  const addCatalogItem = async () => {
    const cat = catFilter === "all" ? "base" : catFilter;
    const newItem = await base44.entities.BidItemCatalog.create({
      name: "", cabinet_category: cat, measure_type: "lf", default_price: 0, is_active: true,
      sort_order: catalogItems.length + 1,
    });
    setCatalogItems(prev => [...prev, newItem]);
  };

  const deleteCatalogItem = async (item) => {
    if (item._isNew || String(item.id).startsWith("new_")) {
      setCatalogItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      await base44.entities.BidItemCatalog.delete(item.id);
      setCatalogItems(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const visibleItems = catFilter === "all" ? catalogItems : catalogItems.filter(i => i.cabinet_category === catFilter);
  const countFor = (key) => key === "all" ? catalogItems.length : catalogItems.filter(i => i.cabinet_category === key).length;

  return (
    <div className="space-y-8">
      {/* ── Section 1: Cabinet Styles ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cabinet Styles</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any price to edit inline. Click the pencil icon for full edits.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {styles.map(cfg => (
            <div key={cfg.id || cfg.style_key} className="relative">
              <StyleCard
                config={cfg}
                onPriceChange={handleStylePriceChange}
                onEditClick={setEditingStyle}
              />
              {savingStyleId === cfg.id && (
                <div className="absolute top-2 right-8 text-xs text-amber-600 font-medium">Saving...</div>
              )}
              {savedStyleId === cfg.id && (
                <div className="absolute top-2 right-8 flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check className="w-3 h-3" /> Saved
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Item Catalog ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Item Catalog</h2>
            <p className="text-xs text-slate-500 mt-0.5">All items available when building bids. Edits save immediately.</p>
          </div>
          <Button onClick={addCatalogItem} size="sm" className="bg-amber-600 hover:bg-amber-700 h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
        </div>

        {/* Category Tab Filter */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {CATALOG_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCatFilter(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                catFilter === cat.key
                  ? "bg-slate-700 text-white border-transparent"
                  : "text-slate-600 bg-slate-100 border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat.label}
              {cat.key !== "all" && (
                <span className="ml-1 opacity-60">({countFor(cat.key)})</span>
              )}
              {cat.key === "all" && (
                <span className="ml-1 opacity-60">({countFor("all")})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Item Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2.5 w-36">Category</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5 w-24">Type</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5 w-28">Default $</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-2.5 w-20">Active</th>
                  <th className="w-10 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                      No items in this category.
                    </td>
                  </tr>
                )}
                {visibleItems.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-2">
                      <Input
                        value={item.name}
                        onChange={e => updateCatalogItem(item.id, "name", e.target.value)}
                        onBlur={e => updateCatalogItem(item.id, "name", e.target.value)}
                        className="h-8 text-sm border-transparent hover:border-slate-200 focus:border-slate-300 bg-transparent"
                        placeholder="Item name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={item.cabinet_category} onValueChange={v => updateCatalogItem(item.id, "cabinet_category", v)}>
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATALOG_CATEGORIES.filter(c => c.key !== "all").map(c => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={item.measure_type} onValueChange={v => updateCatalogItem(item.id, "measure_type", v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lf">LF</SelectItem>
                          <SelectItem value="qty">QTY</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number"
                        value={item.default_price || 0}
                        onChange={e => updateCatalogItem(item.id, "default_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm text-center w-24 mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={item.is_active !== false}
                        onCheckedChange={v => updateCatalogItem(item.id, "is_active", v)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => deleteCatalogItem(item)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Style Edit Drawer */}
      <StyleEditDrawer
        config={editingStyle}
        open={!!editingStyle}
        onClose={() => setEditingStyle(null)}
        onSave={handleStyleDrawerSave}
      />
    </div>
  );
}