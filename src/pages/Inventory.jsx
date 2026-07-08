import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, Plus, QrCode, Printer, Pencil, Trash2, Download, Package, Settings } from "lucide-react";
import { format } from "date-fns";
import InventoryForm from "@/components/inventory/InventoryForm";
import QRCodeDialog from "@/components/inventory/QRCodeDialog";
import PrintAllLabels from "@/components/inventory/PrintAllLabels";
import InventoryHistory from "@/components/inventory/InventoryHistory";
import CategoryManager from "@/components/inventory/CategoryManager";

function recalcStatus(quantity, min_quantity) {
  if (quantity <= 0) return "reorder";
  if (min_quantity && quantity < min_quantity) return "low_stock";
  return "in_stock";
}

const statusStyles = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-orange-100 text-orange-800",
  reorder: "bg-red-100 text-red-800",
  discontinued: "bg-gray-100 text-gray-800",
};
const statusLabel = {
  in_stock: "Full Stock",
  low_stock: "Low Stock",
  reorder: "Reorder",
  discontinued: "Discontinued",
};
const catLabel = (cat) => cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "";
const LOCATIONS = ["all", "Cut", "Face Frame", "Spray", "Build", "Install", "Office"];

export default function Inventory() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeLocation, setActiveLocation] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [qrItem, setQrItem] = useState(null);
  const [showPrintAll, setShowPrintAll] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const { data: categoryDefs = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("sort_order"),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const supplierMap = useMemo(() => {
    const m = {};
    for (const s of suppliers) m[s.name] = s;
    return m;
  }, [suppliers]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inventory.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inventory.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inventory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const handleSave = async (payload) => {
    const status = recalcStatus(payload.quantity, payload.min_quantity);
    const data = { ...payload, status };
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingItem(null);
  };

  const categories = useMemo(() => {
    const entityCats = (categoryDefs || []).map(c => c.name);
    const itemCats = items.map(i => i.category).filter(Boolean);
    const set = new Set([...entityCats, ...itemCats]);
    return ["all", ...Array.from(set)];
  }, [items, categoryDefs]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (activeCategory !== "all" && i.category !== activeCategory) return false;
      if (activeLocation !== "all" && i.location !== activeLocation) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return i.name?.toLowerCase().includes(s) || i.supplier?.toLowerCase().includes(s) || i.location?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [items, activeCategory, activeLocation, searchTerm]);

  const exportToCSV = () => {
    const headers = ["Name", "Item ID", "Category", "Quantity", "Unit", "Min Qty", "Price/Unit", "Supplier", "Location", "Status", "Notes"];
    const rows = filtered.map(i => [i.name, i.item_sku, i.category, i.quantity, i.unit, i.min_quantity, i.price_per_unit, i.supplier, i.location, statusLabel[i.status], i.notes]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inventory-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="text-sm text-slate-500">{items.length} items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="bg-white gap-1.5">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => setShowPrintAll(true)} className="bg-white gap-1.5">
              <Printer className="w-4 h-4" /> Print QR Labels
            </Button>
            <Button variant="outline" onClick={() => setShowCatManager(true)} className="bg-white gap-1.5">
              <Settings className="w-4 h-4" /> Categories
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700 gap-1.5">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
        </div>

        <Tabs defaultValue="items">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="items" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Items</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">History</TabsTrigger>
          </TabsList>

          {/* ITEMS TAB */}
          <TabsContent value="items" className="space-y-4">
            {/* Search + Category filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search inventory..." className="pl-9 bg-white" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat ? "bg-amber-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                  >
                    {cat === "all" ? "All" : catLabel(cat)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => setActiveLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeLocation === loc ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                >
                  {loc === "all" ? "All Locations" : loc}
                </button>
              ))}
            </div>

            {/* Desktop Table */}
            <Card className="bg-white shadow-sm hidden sm:block">
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Image</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Item ID</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Name</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Category</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Qty</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Price/Unit</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Supplier</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Location</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Status</th>
                        <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">QR</th>
                        <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(item => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-amber-50 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover inline-block" />
                              : <div className="w-10 h-10 rounded-lg bg-slate-100 inline-flex items-center justify-center"><Package className="w-4 h-4 text-slate-300" /></div>}
                          </td>
                          <td className="py-2.5 px-3 text-sm font-mono text-slate-700 whitespace-nowrap">{item.item_sku || "—"}</td>
                          <td className="py-2.5 px-3 text-sm font-medium text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-600">{catLabel(item.category)}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono font-semibold text-slate-700">{item.quantity} {item.unit}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono text-slate-700">{item.price_per_unit != null ? `$${Number(item.price_per_unit).toFixed(2)}` : "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-slate-600">
                            {(() => {
                              const sup = item.supplier ? supplierMap[item.supplier] : null;
                              const url = sup?.website_url || sup?.ordering_url;
                              if (url) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.supplier}</a>;
                              return item.supplier || "—";
                            })()}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-slate-600">{item.location || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[item.status]}`}>{statusLabel[item.status]}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button size="sm" variant="ghost" onClick={() => setQrItem(item)} className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600">
                              <QrCode className="w-4 h-4" />
                            </Button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setShowForm(true); }} className="h-8 w-8 p-0 text-blue-600">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id); }} className="h-8 w-8 p-0 text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {searchTerm ? "No items match your search" : "No items yet — click Add Item to get started"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {filtered.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                  <div className="flex items-start justify-between">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 mr-2" />
                      : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mr-2"><Package className="w-5 h-5 text-slate-300" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{catLabel(item.category)} · {item.location || "No location"}</p>
                      {item.item_sku && <p className="text-xs font-mono text-slate-600">Item ID: {item.item_sku}</p>}
                      {item.price_per_unit != null && <p className="text-xs text-slate-600">${Number(item.price_per_unit).toFixed(2)}/{item.unit || "ea"}</p>}
                      {item.supplier && (() => {
                        const sup = supplierMap[item.supplier];
                        const url = sup?.website_url || sup?.ordering_url;
                        return url
                          ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{item.supplier}</a>
                          : <p className="text-xs text-slate-500">{item.supplier}</p>;
                      })()}
                      </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusStyles[item.status]}`}>{statusLabel[item.status]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-mono text-slate-800">{item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span></span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setQrItem(item)} className="h-8 w-8 p-0"><QrCode className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setShowForm(true); }} className="h-8 w-8 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id); }} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  {searchTerm ? "No items match" : "No items yet"}
                </div>
              )}
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <InventoryHistory />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InventoryForm open={showForm} onOpenChange={setShowForm} editingItem={editingItem} onSave={handleSave} />
      <QRCodeDialog item={qrItem} open={!!qrItem} onOpenChange={(open) => { if (!open) setQrItem(null); }} />
      <PrintAllLabels items={items} open={showPrintAll} onOpenChange={setShowPrintAll} />
      <CategoryManager open={showCatManager} onOpenChange={setShowCatManager} />
    </div>
  );
}