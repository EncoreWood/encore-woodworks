import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronRight, Plus, Paperclip, FileText, Loader2 } from "lucide-react";
import PdfViewerModal from "./PdfViewerModal";

const CAT_COLORS = {
  base:  "bg-amber-100 text-amber-700",
  upper: "bg-blue-100 text-blue-700",
  tall:  "bg-purple-100 text-purple-700",
  misc:  "bg-slate-100 text-slate-600",
};

const CAT_LABELS = { base: "Base Cabinets", upper: "Upper/Wall Cabinets", tall: "Tall Cabinets", misc: "Misc / Add-ons" };

export default function BidRoomSection({ room, catalogItems, pricingConfigs, bidType, onChange, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ ...room, pdf_url: file_url, pdf_name: file.name });
    setUploadingPdf(false);
  };

  const getPrice = (category, measureType, catalogItem) => {
    if (measureType === "lf" && ["base", "upper", "tall"].includes(category)) {
      const cfg = pricingConfigs.find(c => c.style_key === bidType);
      if (cfg) {
        if (category === "base") return cfg.bases_lf || 0;
        if (category === "upper") return cfg.uppers_lf || 0;
        if (category === "tall") return cfg.tall_lf || 0;
      }
    }
    return catalogItem?.default_price || 0;
  };

  const addFromCatalog = (catalogId) => {
    if (!catalogId || catalogId === "__custom__") {
      const blank = { id: `item_${Date.now()}`, name: "", cabinet_category: "misc", measure_type: "lf", quantity: 0, unit_price: 0, notes: "" };
      onChange({ ...room, items: [...(room.items || []), blank] });
      return;
    }
    const cat = catalogItems.find(c => c.id === catalogId);
    if (!cat) return;
    const price = getPrice(cat.cabinet_category, cat.measure_type, cat);
    const newItem = {
      id: `item_${Date.now()}`,
      name: cat.name,
      cabinet_category: cat.cabinet_category || "misc",
      measure_type: cat.measure_type || "lf",
      quantity: 0,
      unit_price: price,
      notes: ""
    };
    onChange({ ...room, items: [...(room.items || []), newItem] });
  };

  const updateItem = (itemId, field, value) => {
    const updated = (room.items || []).map(item => {
      if (item.id !== itemId) return item;
      const u = { ...item, [field]: value };
      if (field === "cabinet_category") {
        u.unit_price = getPrice(value, item.measure_type, null);
      }
      return u;
    });
    onChange({ ...room, items: updated });
  };

  const removeItem = (itemId) => onChange({ ...room, items: (room.items || []).filter(i => i.id !== itemId) });

  const roomTotal = (room.items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const roomLf = (room.items || []).filter(i => i.measure_type === "lf").reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

  // Group catalog for dropdown
  const byCategory = {};
  (catalogItems || []).forEach(c => {
    const cat = c.cabinet_category || "misc";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  });

  return (
    <Card className="overflow-hidden border border-slate-200">
      {/* Room Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-slate-800 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        <Input
          value={room.room_name}
          onChange={e => { e.stopPropagation(); onChange({ ...room, room_name: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          className="flex-1 font-bold text-white bg-transparent border-none shadow-none h-auto p-0 focus-visible:ring-0 placeholder:text-slate-500 text-base"
          placeholder="Room Name"
        />
        {/* PDF Attach */}
        {room.pdf_url ? (
          <Button
            variant="ghost" size="sm"
            onClick={e => { e.stopPropagation(); setViewingPdf(true); }}
            className="h-7 px-2 text-xs text-blue-300 hover:text-blue-100 hover:bg-slate-700 gap-1 flex-shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline max-w-[80px] truncate">{room.pdf_name || "Plan"}</span>
          </Button>
        ) : (
          <label onClick={e => e.stopPropagation()} className="flex-shrink-0 cursor-pointer">
            {uploadingPdf
              ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              : <Paperclip className="w-4 h-4 text-slate-400 hover:text-slate-200 transition-colors" />
            }
            <input type="file" accept=".pdf,image/*" onChange={handlePdfUpload} className="hidden" disabled={uploadingPdf} />
          </label>
        )}
        <div className="text-xs text-slate-400 whitespace-nowrap">{roomLf > 0 ? `${roomLf.toFixed(1)} LF` : ""}</div>
        <div className="text-amber-400 font-bold text-sm mr-1 whitespace-nowrap">${roomTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <Button
          variant="ghost" size="icon"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-transparent flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {!collapsed && (
        <div className="p-4">
          {/* Desktop Table */}
          {(room.items || []).length > 0 && (
            <div className="hidden sm:block overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="text-left py-2 pr-2 font-semibold">Item</th>
                    <th className="py-2 pr-2 font-semibold w-24 text-center">Category</th>
                    <th className="py-2 pr-2 font-semibold w-16 text-center">Type</th>
                    <th className="py-2 pr-2 font-semibold w-24 text-center">Qty/LF/SqFt</th>
                    <th className="py-2 pr-2 font-semibold w-24 text-center">Unit Price</th>
                    <th className="py-2 pr-2 font-semibold w-24 text-right">Subtotal</th>
                    <th className="py-2 font-semibold">Notes</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(room.items || []).map(item => {
                    const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-1.5 pr-2">
                          <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm" placeholder="Item name" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Select value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                            <SelectTrigger className={`h-8 text-xs font-semibold ${CAT_COLORS[item.cabinet_category] || CAT_COLORS.misc}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="base">Base</SelectItem>
                              <SelectItem value="upper">Upper</SelectItem>
                              <SelectItem value="tall">Tall</SelectItem>
                              <SelectItem value="misc">Misc</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                         <Select value={item.measure_type} onValueChange={v => updateItem(item.id, "measure_type", v)}>
                           <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="lf">LF</SelectItem>
                             <SelectItem value="qty">Qty</SelectItem>
                             <SelectItem value="sqft">SqFt</SelectItem>
                           </SelectContent>
                         </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-1.5 pr-2 text-right font-semibold text-slate-800">
                          ${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-1.5">
                          <Input value={item.notes} onChange={e => updateItem(item.id, "notes", e.target.value)} className="h-8 text-sm" placeholder="Notes" />
                        </td>
                        <td className="py-1.5 pl-1">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-7 w-7 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2 mb-3">
            {(room.items || []).map(item => {
              const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
              return (
                <div key={item.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex gap-2">
                    <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm flex-1" placeholder="Item name" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                      <SelectTrigger className={`h-8 text-xs ${CAT_COLORS[item.cabinet_category] || CAT_COLORS.misc}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">Base</SelectItem>
                        <SelectItem value="upper">Upper</SelectItem>
                        <SelectItem value="tall">Tall</SelectItem>
                        <SelectItem value="misc">Misc</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={item.measure_type} onValueChange={v => updateItem(item.id, "measure_type", v)}>
                     <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="lf">Linear Feet</SelectItem>
                       <SelectItem value="qty">Quantity</SelectItem>
                       <SelectItem value="sqft">Square Feet</SelectItem>
                     </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-xs text-slate-500">{item.measure_type === "lf" ? "Lin. Feet" : item.measure_type === "sqft" ? "Sq. Feet" : "Qty"}</label>
                      <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-8 text-sm mt-0.5" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Unit Price</label>
                      <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} className="h-8 text-sm mt-0.5" />
                    </div>
                    <div className="text-right">
                      <label className="text-xs text-slate-500">Subtotal</label>
                      <p className="font-bold text-amber-700 mt-1">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Item Dropdown */}
          <Select value="" onValueChange={addFromCatalog}>
            <SelectTrigger className="h-9 border-dashed text-slate-500 text-sm">
              <SelectValue placeholder="+ Add item from catalog..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__custom__">✏️ Custom Item</SelectItem>
              {Object.entries(byCategory).map(([cat, items]) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-xs text-slate-400">{CAT_LABELS[cat] || cat}</SelectLabel>
                  {items.map(ci => (
                    <SelectItem key={ci.id} value={ci.id}>
                      {ci.name}
                      <span className="text-slate-400 text-xs ml-1">({ci.measure_type === "lf" ? "LF" : "Qty"})</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <PdfViewerModal
        open={viewingPdf}
        onClose={() => setViewingPdf(false)}
        url={room.pdf_url}
        name={room.pdf_name}
      />
    </Card>
  );
}