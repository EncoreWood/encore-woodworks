import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { getCategoryStyle } from "./BidCatalogEditor";

// Compact, editable room-pricing panel shown alongside the Annotate Plan viewer.
// Edits flow straight back into the parent's `rooms` state via onRoomsChange, so
// changes here persist exactly like the main Rooms Bidding section.
export default function BidRoomPricingPanel({ rooms, pricingConfigs, bidType, categories, onRoomsChange }) {
  const [openRooms, setOpenRooms] = useState(() => new Set(rooms.map(r => r.id)));

  const getPrice = (room, category, measureType) => {
    if (measureType === "lf" && ["base", "upper", "tall"].includes(category)) {
      const cfg = pricingConfigs.find(c => c.style_key === (room.cabinet_style || bidType));
      if (cfg) {
        if (category === "base") return cfg.bases_lf || 0;
        if (category === "upper") return cfg.uppers_lf || 0;
        if (category === "tall") return cfg.tall_lf || 0;
      }
    }
    return 0;
  };

  const getItemSubtotal = (room, item) => {
    if (item.measure_type === "percentage") {
      const appliesTo = item.upgrade_applies_to || ["base", "upper", "tall"];
      const base = (room.items || [])
        .filter(i => i.measure_type !== "percentage" && appliesTo.includes(i.cabinet_category))
        .reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
      return base * ((parseFloat(item.percentage) || 0) / 100);
    }
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  };

  const roomTotal = (room) => (room.items || []).reduce((s, i) => s + getItemSubtotal(room, i), 0);

  const updateRoom = (room, patch) => onRoomsChange(rooms.map(r => (r.id === room.id ? { ...r, ...patch } : r)));
  const updateItem = (room, itemId, field, value) => {
    let items = (room.items || []).map(it => (it.id === itemId ? { ...it, [field]: value } : it));
    if (field === "cabinet_category") {
      items = items.map(it => it.id === itemId ? { ...it, unit_price: getPrice(room, value, it.measure_type) } : it);
    }
    updateRoom(room, { items });
  };
  const removeItem = (room, itemId) => updateRoom(room, { items: (room.items || []).filter(i => i.id !== itemId) });
  const addCustomItem = (room) => updateRoom(room, { items: [...(room.items || []), { id: `item_${Date.now()}`, name: "", cabinet_category: "misc", measure_type: "qty", quantity: 1, unit_price: 0, notes: "" }] });

  const getCatClass = (key) => {
    const color = (categories || []).find(c => c.key === key)?.color || "slate";
    const style = getCategoryStyle(color);
    return `${style.bg} ${style.text}`;
  };
  const toggleRoom = (id) => setOpenRooms(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-amber-50 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-amber-800">Room Pricing</span>
        <span className="text-xs text-amber-600">({rooms.length})</span>
        <span className="text-[10px] text-amber-500 ml-auto">Edits save with the bid</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {rooms.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No rooms yet.</p>}
        {rooms.map(room => {
          const open = openRooms.has(room.id);
          const total = roomTotal(room);
          return (
            <div key={room.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => toggleRoom(room.id)} className="w-full flex items-center gap-1.5 px-2.5 py-2 bg-slate-800 text-left">
                {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                <span className="flex-1 text-xs font-bold text-white truncate">{room.room_name || "Room"}</span>
                <span className="text-xs font-bold text-amber-400 whitespace-nowrap">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </button>
              {open && (
                <div className="p-2 space-y-1.5 bg-white">
                  {(room.items || []).length === 0 && <p className="text-xs text-slate-400 text-center py-1">No items.</p>}
                  {(room.items || []).map(item => {
                    const isPercent = item.measure_type === "percentage";
                    const sub = getItemSubtotal(room, item);
                    return (
                      <div key={item.id} className="border border-slate-100 rounded p-1.5 space-y-1">
                        <div className="flex gap-1">
                          <Input value={item.name} onChange={e => updateItem(room, item.id, "name", e.target.value)} className="h-7 text-xs flex-1" placeholder="Item" />
                          <Button variant="ghost" size="icon" onClick={() => removeItem(room, item.id)} className="h-7 w-7 text-red-400 flex-shrink-0"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <Select value={item.cabinet_category} onValueChange={v => updateItem(room, item.id, "cabinet_category", v)}>
                            <SelectTrigger className={`h-7 text-[10px] ${getCatClass(item.cabinet_category)}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(categories || []).map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={item.measure_type} onValueChange={v => updateItem(room, item.id, "measure_type", v)}>
                            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lf">LF</SelectItem>
                              <SelectItem value="qty">Qty</SelectItem>
                              <SelectItem value="sqft">SqFt</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {isPercent ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={item.percentage || ""} onChange={e => updateItem(room, item.id, "percentage", e.target.value)} className="h-7 text-xs w-16" placeholder="%" />
                            <span className="text-[10px] text-slate-500">%</span>
                            <span className="ml-auto text-xs font-semibold text-green-700">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1 items-center">
                            <Input type="number" value={item.quantity} onChange={e => updateItem(room, item.id, "quantity", e.target.value)} className="h-7 text-xs text-center" placeholder="Qty" />
                            <Input type="number" value={item.unit_price} onChange={e => updateItem(room, item.id, "unit_price", e.target.value)} className="h-7 text-xs text-center" placeholder="$" />
                            <span className="text-xs font-semibold text-right text-slate-700">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button onClick={() => addCustomItem(room)} variant="outline" size="sm" className="w-full h-7 text-xs border-dashed mt-1">
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}