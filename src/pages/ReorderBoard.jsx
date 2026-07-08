import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Download, Package, ShoppingCart, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const getItemSuppliers = (item) => {
  if (Array.isArray(item.suppliers) && item.suppliers.length) return item.suppliers;
  if (item.supplier) return [{ name: item.supplier, link: item.supplier_link || "" }];
  return [];
};

const isWurthSupplier = (item) => {
  const sups = getItemSuppliers(item);
  return sups.some(s => s.name && s.name.toLowerCase().includes("wurth"));
};

export default function ReorderBoard() {
  const [orderQtys, setOrderQtys] = useState({});
  const [poName, setPoName] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  // Filter: status = reorder AND has a Wurth supplier
  const reorderWurthItems = useMemo(() => {
    return items.filter(i => i.status === "reorder" && isWurthSupplier(i));
  }, [items]);

  // Initialize/suggest order quantities: enough to reach 2x min_quantity, or 10 if no min
  const suggestedQty = (item) => {
    const min = item.min_quantity || 0;
    const current = item.quantity || 0;
    if (min > current) return (min - current) + min; // bring to min + order another batch
    return 10;
  };

  const getQty = (itemId, item) => {
    if (orderQtys[itemId] != null) return orderQtys[itemId];
    return suggestedQty(item);
  };

  const handleQtyChange = (itemId, value) => {
    setOrderQtys(prev => ({ ...prev, [itemId]: parseInt(value) || 0 }));
  };

  const downloadWurthCSV = () => {
    const rows = reorderWurthItems
      .filter(item => {
        const qty = getQty(item.id, item);
        return qty > 0 && item.item_sku;
      })
      .map(item => {
        const sku = item.item_sku;
        const qty = getQty(item.id, item);
        const po = poName || "";
        // Escape CSV fields
        const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
        return `${esc(sku)},${esc(qty)},${esc(po)}`;
      });

    // Wurth template: BOM header + rows
    const csv = "\uFEFFSKU, QTY, PO or Job Name\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wurth-order-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const itemsWithSku = reorderWurthItems.filter(i => i.item_sku);
  const itemsWithoutSku = reorderWurthItems.filter(i => !i.item_sku);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Wurth Reorder Board</h1>
            <p className="text-sm text-slate-500">{reorderWurthItems.length} items need reorder from Wurth</p>
          </div>
          <div className="flex gap-2">
            <a href="https://www.wurthlac.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="bg-white gap-1.5">
                <ExternalLink className="w-4 h-4" /> Wurth Site
              </Button>
            </a>
            <Button
              onClick={downloadWurthCSV}
              disabled={itemsWithSku.length === 0}
              className="bg-black hover:bg-slate-800 gap-1.5"
            >
              <Download className="w-4 h-4" /> Download Wurth CSV
            </Button>
          </div>
        </div>

        {/* Wurth Quick Order Info */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold text-slate-900">Wurth Quick Order</h2>
            </div>
            <p className="text-sm text-slate-600">
              Download the CSV file and upload it to Wurth's Quick Order page under <strong>Quick Order → Add items by uploading an Excel or a CSV file</strong>.
              The file matches Wurth's template format (SKU, QTY, PO or Job Name).
            </p>

            {/* PO / Job Name input */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">PO # / Job Name:</label>
              <Input
                value={poName}
                onChange={e => setPoName(e.target.value)}
                placeholder="e.g. HUDU-8923"
                className="max-w-xs bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        {reorderWurthItems.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-12 pb-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No Wurth items need reordering right now.
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-4">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">SKU</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Name</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Current Qty</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Min Qty</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Order Qty</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-900 bg-slate-100">Supplier Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithSku.map(item => {
                      const sups = getItemSuppliers(item);
                      const wurthSup = sups.find(s => s.name && s.name.toLowerCase().includes("wurth"));
                      return (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-amber-50">
                          <td className="py-2.5 px-3 text-sm font-mono text-slate-700 whitespace-nowrap">{item.item_sku}</td>
                          <td className="py-2.5 px-3 text-sm font-medium text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-3 text-sm text-center font-mono font-semibold text-red-600">{item.quantity || 0}</td>
                          <td className="py-2.5 px-3 text-sm text-center font-mono text-slate-600">{item.min_quantity || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-center">
                            <Input
                              type="number"
                              min="0"
                              value={getQty(item.id, item)}
                              onChange={e => handleQtyChange(item.id, e.target.value)}
                              className="w-20 text-center font-mono mx-auto bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-sm text-slate-600">
                            {wurthSup?.link
                              ? <a href={wurthSup.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View item</a>
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {itemsWithSku.map(item => {
                  const sups = getItemSuppliers(item);
                  const wurthSup = sups.find(s => s.name && s.name.toLowerCase().includes("wurth"));
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-white space-y-1">
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs font-mono text-slate-600">SKU: {item.item_sku}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          Qty: <span className="text-red-600 font-semibold">{item.quantity || 0}</span> / Min: {item.min_quantity || "—"}
                        </div>
                        {wurthSup?.link && (
                          <a href={wurthSup.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-xs text-slate-600">Order:</label>
                        <Input
                          type="number"
                          min="0"
                          value={getQty(item.id, item)}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          className="w-20 text-center font-mono bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items without SKU */}
        {itemsWithoutSku.length > 0 && (
          <Card className="bg-amber-50 border-amber-200 shadow-sm">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠ Items missing SKU (cannot be included in CSV)</h3>
              <ul className="space-y-1">
                {itemsWithoutSku.map(item => (
                  <li key={item.id} className="text-sm text-amber-700">
                    {item.name} — current qty: {item.quantity || 0}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">Add an Item ID/SKU in the Inventory page to include these in the Wurth order.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}