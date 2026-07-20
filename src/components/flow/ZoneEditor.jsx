import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_TYPES, ZONE_ICONS, FLOW_DIRECTIONS } from "./flowConstants";

export default function ZoneEditor({ zone, onUpdate, onDelete, onClose }) {
  const [name, setName] = useState(zone.name);
  const [notes, setNotes] = useState(zone.notes || "");
  const [orderStr, setOrderStr] = useState(zone.flow_order != null ? String(zone.flow_order) : "");

  useEffect(() => {
    setName(zone.name);
    setNotes(zone.notes || "");
    setOrderStr(zone.flow_order != null ? String(zone.flow_order) : "");
  }, [zone.id, zone.name, zone.notes, zone.flow_order]);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900">Edit Zone</h3>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} onBlur={() => name !== zone.name && onUpdate({ name })} />
        </div>

        {/* Type */}
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={zone.zone_type} onValueChange={v => onUpdate({ zone_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ZONE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <Label className="text-xs">Color</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ZONE_COLORS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => onUpdate({ color: key })}
                className={cn("w-8 h-8 rounded-lg border-2 transition", val.zone, zone.color === key ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "opacity-70 hover:opacity-100")}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div className="space-y-1">
          <Label className="text-xs">Icon</Label>
          <div className="flex flex-wrap gap-1">
            {ZONE_ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => onUpdate({ icon })}
                className={cn("w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition",
                  zone.icon === icon ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:bg-slate-50")}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Flow Order */}
        <div className="space-y-1">
          <Label className="text-xs">Flow Order (blank = not in sequence)</Label>
          <Input
            type="number"
            value={orderStr}
            onChange={e => setOrderStr(e.target.value)}
            onBlur={() => {
              const num = orderStr.trim() === "" ? null : parseInt(orderStr, 10);
              if (num !== zone.flow_order) onUpdate({ flow_order: isNaN(num) ? null : num });
            }}
          />
        </div>

        {/* Flow Direction */}
        <div className="space-y-1">
          <Label className="text-xs">Flow → Next direction</Label>
          <Select value={zone.flow_direction || "none"} onValueChange={v => onUpdate({ flow_direction: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLOW_DIRECTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (zone.notes || "") && onUpdate({ notes })} rows={3} />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => { if (confirm(`Delete zone "${zone.name}"?`)) onDelete(); }}
        >
          <Trash2 className="w-4 h-4 mr-2" />Delete Zone
        </Button>
      </div>
    </div>
  );
}