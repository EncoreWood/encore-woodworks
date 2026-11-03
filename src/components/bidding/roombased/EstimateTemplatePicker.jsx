import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Ruler, LayoutGrid } from "lucide-react";

/**
 * Asked once, when an estimate is created: which estimate template to use.
 * The item / linear-foot template is unchanged; room-based is the new one.
 */
export default function EstimateTemplatePicker({ open, onClose, onPick }) {
  const options = [
    {
      key: "item",
      icon: Ruler,
      title: "Item / Linear Foot",
      tagline: "Price from measured LF and your item catalog",
      detail: "Each room is broken into line items — base, upper and tall runs by the linear foot, plus catalog products and upgrades.",
    },
    {
      key: "room_based",
      icon: LayoutGrid,
      title: "Room-Based Proposal",
      tagline: "One price per room, plus options",
      detail: "A client-ready proposal: ROOM NAME / FINISH / ITEMS OF RECOGNITION / PRICE, a Standard Total, then optional rooms and upgrades.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <div className="pt-1">
          <h2 className="text-xl font-bold text-slate-900">New estimate</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">Choose how this estimate should be priced and presented.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {options.map((option) => (
              <Card
                key={option.key}
                onClick={() => onPick(option.key)}
                className="p-4 cursor-pointer border-2 border-slate-200 hover:border-amber-500 hover:shadow-md transition-all"
              >
                <option.icon className="w-7 h-7 text-amber-600 mb-2" />
                <p className="font-semibold text-slate-900">{option.title}</p>
                <p className="text-xs font-medium text-amber-700 mt-0.5">{option.tagline}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{option.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}