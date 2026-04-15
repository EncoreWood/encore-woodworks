import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronRight, Plus, Paperclip, FileText, Loader2 } from "lucide-react";
import PDFAnnotator from "../production/PDFAnnotator";

import { getCategoryStyle } from "./BidCatalogEditor";
import SketchPreviewGenerator from "./SketchPreviewGenerator";

export default function BidRoomSection({ room, catalogItems, categories, pricingConfigs, bidType, onChange, onDelete, sketchPaths = [], specs = {}, linkedProjectId = null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("all");

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ ...room, pdf_url: file_url, pdf_name: file.name });
    setUploadingPdf(false);
  };

  const handleAnnotationSave = (paths, notes) => {
    onChange({ ...room, pdf_annotations: paths, pdf_notes: notes });
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
    const isPercent = cat.measure_type === "percentage";
    const price = isPercent ? 0 : getPrice(cat.cabinet_category, cat.measure_type, cat);
    const newItem = {
      id: `item_${Date.now()}`,
      name: cat.name,
      cabinet_category: cat.cabinet_category || "misc",
      measure_type: cat.measure_type || "lf",
      quantity: isPercent ? 0 : 0,
      unit_price: price,
      percentage: cat.default_percentage || 0,
      upgrade_applies_to: cat.upgrade_applies_to || ["base", "upper", "tall"],
      notes: ""
    };
    onChange({ ...room, items: [...(room.items || []), newItem] });
  };

  const addSketchInserts = () => {
    const inserts = (sketchPaths || []).filter(p => p.type === "symbol" && p.symbolKey === "rollout");
    if (!inserts.length) return;
    inserts.forEach(insert => {
      const existingItem = (room.items || []).find(i => i.sketch_insert_id === insert.id);
      if (!existingItem) {
        const newItem = {
          id: `item_${Date.now()}`,
          name: insert.label || "Rollout Insert",
          cabinet_category: "roll_out_inserts",
          measure_type: "qty",
          quantity: 1,
          unit_price: 0,
          notes: "",
          sketch_insert_id: insert.id
        };
        const items = [...(room.items || []), newItem];
        onChange({ ...room, items });
      }
    });
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

  // Compute subtotal for a percentage item based on which categories it applies to
  const getPercentageSubtotal = (item) => {
    const appliesTo = item.upgrade_applies_to || ["base", "upper", "tall"];
    const baseTotal = (room.items || [])
      .filter(i => i.measure_type !== "percentage" && appliesTo.includes(i.cabinet_category))
      .reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
    return baseTotal * ((parseFloat(item.percentage) || 0) / 100);
  };

  const getItemSubtotal = (item) => {
    if (item.measure_type === "percentage") return getPercentageSubtotal(item);
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  };

  const roomTotal = (room.items || []).reduce((s, i) => s + getItemSubtotal(i), 0);
  const roomLf = (room.items || []).filter(i => i.measure_type === "lf").reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

  // Group catalog for dropdown by category
  const byCategory = {};
  (catalogItems || []).forEach(c => {
    const cat = c.cabinet_category || "misc";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  });

  const getCatLabel = (key) => (categories || []).find(c => c.key === key)?.label || key;
  const getCatClass = (key) => {
    const color = (categories || []).find(c => c.key === key)?.color;
    const style = getCategoryStyle(color || "slate");
    return `${style.bg} ${style.text}`;
  };

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
            onClick={e => { e.stopPropagation(); setAnnotating(true); }}
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
                    const isPercent = item.measure_type === "percentage";
                    const sub = getItemSubtotal(item);
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 ${isPercent ? "bg-green-50" : ""}`}>
                        <td className="py-1.5 pr-2">
                          <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm" placeholder="Item name" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Select value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                            <SelectTrigger className={`h-8 text-xs font-semibold ${getCatClass(item.cabinet_category)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(categories || []).map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
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
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                          {isPercent ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" value={item.percentage || ""} onChange={e => updateItem(item.id, "percentage", e.target.value)} className="h-8 text-sm text-center w-14" placeholder="%" />
                              <span className="text-xs text-slate-500">%</span>
                            </div>
                          ) : (
                            <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-8 text-sm text-center" />
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          {isPercent ? (
                            <div className="flex gap-1 flex-wrap">
                              {["base","upper","tall"].map(cat => (
                                <label key={cat} className="flex items-center gap-0.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(item.upgrade_applies_to || ["base","upper","tall"]).includes(cat)}
                                    onChange={e => {
                                      const current = item.upgrade_applies_to || ["base","upper","tall"];
                                      updateItem(item.id, "upgrade_applies_to", e.target.checked ? [...current, cat] : current.filter(c => c !== cat));
                                    }}
                                    className="w-3 h-3 accent-green-600"
                                  />
                                  <span className="text-xs capitalize text-slate-600">{cat}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} className="h-8 text-sm text-center" />
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-semibold text-slate-800">
                          {isPercent && <span className="text-xs text-green-700 font-normal mr-1">({item.percentage || 0}%)</span>}
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
              const isPercent = item.measure_type === "percentage";
              const sub = getItemSubtotal(item);
              return (
                <div key={item.id} className={`border rounded-lg p-3 space-y-2 ${isPercent ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex gap-2">
                    <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm flex-1" placeholder="Item name" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                      <SelectTrigger className={`h-8 text-xs ${getCatClass(item.cabinet_category)}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={item.measure_type} onValueChange={v => updateItem(item.id, "measure_type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lf">Linear Feet</SelectItem>
                        <SelectItem value="qty">Quantity</SelectItem>
                        <SelectItem value="sqft">Square Feet</SelectItem>
                        <SelectItem value="percentage">% Upgrade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isPercent ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Percentage</label>
                        <Input type="number" value={item.percentage || ""} onChange={e => updateItem(item.id, "percentage", e.target.value)} className="h-8 text-sm w-20" placeholder="%" />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">Applies to:</span>
                        {["base","upper","tall"].map(cat => (
                          <label key={cat} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(item.upgrade_applies_to || ["base","upper","tall"]).includes(cat)}
                              onChange={e => {
                                const current = item.upgrade_applies_to || ["base","upper","tall"];
                                updateItem(item.id, "upgrade_applies_to", e.target.checked ? [...current, cat] : current.filter(c => c !== cat));
                              }}
                              className="w-3.5 h-3.5 accent-green-600"
                            />
                            <span className="text-xs capitalize font-semibold text-slate-700">{cat}</span>
                          </label>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal">({item.percentage || 0}%)</span></p>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Sketch Inserts Button */}
          {(sketchPaths || []).some(p => p.type === "symbol" && p.symbolKey === "rollout") && (
            <div className="mb-3">
              <Button onClick={addSketchInserts} variant="outline" size="sm" className="text-xs text-orange-600 border-orange-300">
                + Add Sketch Rollout/Inserts to Pricing
              </Button>
            </div>
          )}

          {/* Add Item — Category Filter + Dropdown */}
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setCatalogFilter("all")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${catalogFilter === "all" ? "bg-slate-700 text-white border-transparent" : "text-slate-600 bg-slate-100 border-slate-200 hover:border-slate-300"}`}
              >
                All
              </button>
              {(categories || []).map(cat => {
                const style = getCategoryStyle(cat.color);
                const isActive = catalogFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCatalogFilter(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${isActive ? `${style.active} border-transparent` : `${style.text} ${style.bg} border-slate-200 hover:border-slate-300`}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <Select value="" onValueChange={addFromCatalog}>
              <SelectTrigger className="h-9 border-dashed text-slate-500 text-sm">
                <SelectValue placeholder="+ Add item from catalog..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">✏️ Custom Item</SelectItem>
                {Object.entries(byCategory)
                  .filter(([cat]) => catalogFilter === "all" || cat === catalogFilter)
                  .map(([cat, items]) => (
                    <SelectGroup key={cat}>
                      <SelectLabel className="text-xs text-slate-400">{getCatLabel(cat)}</SelectLabel>
                      {items.map(ci => (
                        <SelectItem key={ci.id} value={ci.id}>
                          {ci.name}
                          <span className="text-slate-400 text-xs ml-1">({ci.measure_type === "lf" ? "LF" : ci.measure_type === "sqft" ? "SqFt" : ci.measure_type === "percentage" ? "%" : "Qty"})</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {/* AI Sketch Preview */}
          <SketchPreviewGenerator
            room={room}
            specs={specs}
            linkedProjectId={linkedProjectId}
            onRoomChange={onChange}
          />
        </div>
      )}

      <PDFAnnotator
        open={annotating}
        onOpenChange={setAnnotating}
        pdfUrl={room.pdf_url}
        annotations={room.pdf_annotations || []}
        onSave={handleAnnotationSave}
        showNotesField={true}
        initialNotes={room.pdf_notes || ""}
        hideDownload={true}
      />
    </Card>
  );
}