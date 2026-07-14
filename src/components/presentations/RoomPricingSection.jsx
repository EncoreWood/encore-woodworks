import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseSpecs, parseCoverSpecs, isCoverSlide } from "./slideHelpers";

export default function RoomPricingSection({ slide, slides, onUpdate, onUpdateSlide }) {
  const specs = parseSpecs(slide);
  const roomPricingItems = Array.isArray(specs.room_pricing_items) ? specs.room_pricing_items : [];
  const roomTotal = roomPricingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const roomName = slide.room_name || "";

  const coverIdx = slides.findIndex(s => isCoverSlide(s));
  const coverSlide = coverIdx >= 0 ? slides[coverIdx] : null;
  const coverSpecs = coverSlide ? parseCoverSpecs(coverSlide) : null;
  const existsOnCover = coverSpecs?.pricing_items?.some(item => item.label === roomName) ?? false;

  const [justAdded, setJustAdded] = useState(false);

  const updateRoomPricing = (items) => {
    const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const newSpecs = { ...specs, room_pricing_items: items, room_total: total };
    onUpdate({ specs: JSON.stringify(newSpecs) });
  };

  const updateItem = (idx, field, value) => {
    const items = [...roomPricingItems];
    items[idx] = { ...items[idx], [field]: value };
    updateRoomPricing(items);
  };
  const addItem = () => updateRoomPricing([...roomPricingItems, { label: "", amount: 0 }]);
  const removeItem = (idx) => updateRoomPricing(roomPricingItems.filter((_, i) => i !== idx));

  const addToCover = () => {
    if (roomTotal === 0 || roomPricingItems.length === 0 || !coverSlide || !coverSpecs) return;

    const existingIdx = coverSpecs.pricing_items.findIndex(item => item.label === roomName);
    let newPricingItems;
    if (existingIdx >= 0) {
      newPricingItems = [...coverSpecs.pricing_items];
      newPricingItems[existingIdx] = { ...newPricingItems[existingIdx], amount: roomTotal };
    } else {
      newPricingItems = [...coverSpecs.pricing_items, { label: roomName, amount: roomTotal }];
    }

    const newCoverSpecs = { ...coverSpecs, pricing_items: newPricingItems };
    onUpdateSlide(coverIdx, { specs: JSON.stringify(newCoverSpecs) });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  };

  const hasItems = roomPricingItems.length > 0 && roomTotal > 0;

  return (
    <div className="border-t border-slate-200 pt-4">
      <Label className="text-xs">Room Pricing</Label>

      <div className="mt-2 space-y-1">
        {roomPricingItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1 group">
            <input
              className="flex-1 h-7 text-xs border border-slate-200 rounded px-2 outline-none focus:ring-1 focus:ring-amber-400"
              value={item.label}
              onChange={e => updateItem(idx, "label", e.target.value)}
              placeholder="Item"
            />
            <div className="flex items-center">
              <span className="text-xs text-slate-400">$</span>
              <input
                className="w-16 h-7 text-xs text-right border border-slate-200 rounded px-1 outline-none focus:ring-1 focus:ring-amber-400"
                type="number"
                value={item.amount}
                onChange={e => updateItem(idx, "amount", Number(e.target.value) || 0)}
              />
            </div>
            <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="text-xs text-amber-700 hover:text-amber-800 mt-1.5">+ Add Line Item</button>

      <div className="mt-3 pt-2 border-t border-slate-300 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">Room Total:</span>
        <span className="text-sm font-bold text-slate-900">${roomTotal.toLocaleString()}</span>
      </div>

      {!hasItems ? (
        <p className="text-xs text-amber-600 mt-2 text-center">Add pricing items first</p>
      ) : justAdded ? (
        <Button className="w-full mt-2 bg-green-600 hover:bg-green-700" size="sm">
          ✅ Added to Proposal
        </Button>
      ) : existsOnCover ? (
        <Button className="w-full mt-2 bg-amber-700 hover:bg-amber-800" size="sm" onClick={addToCover}>
          🔄 Update Proposal
        </Button>
      ) : (
        <Button className="w-full mt-2 bg-amber-700 hover:bg-amber-800" size="sm" onClick={addToCover}>
          Add to Proposal Cover
        </Button>
      )}
    </div>
  );
}