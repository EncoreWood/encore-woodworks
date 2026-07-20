import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_TYPES, FLOW_DIRECTIONS, FLOW_COLORS } from "./flowConstants";

export default function ZoneEditor({ zone, flows, onUpdate, onDelete, onClose }) {
  const [name, setName] = useState(zone.name);
  const [notes, setNotes] = useState(zone.notes || "");
  const [orderStr, setOrderStr] = useState(zone.flow_order != null ? String(zone.flow_order) : "");
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setName(zone.name);
    setNotes(zone.notes || "");
    setOrderStr(zone.flow_order != null ? String(zone.flow_order) : "");
  }, [zone.id, zone.name, zone.notes, zone.flow_order]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2.5 mb-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Name */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{zone.icon} {name}</span>
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        {/* Type */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 whitespace-nowrap">Type:</span>
          <Select value={zone.zone_type} onValueChange={(v) => onUpdate({ zone_type: v })}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{ZONE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("w-7 h-7 rounded-full border-2", ZONE_COLORS[zone.color]?.zone || ZONE_COLORS.blue.zone)} title="Color" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(ZONE_COLORS).map(([key, val]) => (
                <button key={key} onClick={() => onUpdate({ color: key })}
                  className={cn("w-7 h-7 rounded-full border-2", val.zone, zone.color === key ? "ring-2 ring-offset-1 ring-slate-700" : "")} />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Flow Order */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 whitespace-nowrap">Order:</span>
          <Input type="number" value={orderStr} onChange={(e) => setOrderStr(e.target.value)} onBlur={() => {
            const num = orderStr.trim() === "" ? null : parseInt(orderStr, 10);
            if (num !== zone.flow_order) onUpdate({ flow_order: isNaN(num) ? null : num });
          }} className="h-8 w-14 text-xs" />
        </div>

        {/* Flow Direction */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 whitespace-nowrap">→</span>
          <Select value={zone.flow_direction || "none"} onValueChange={(v) => onUpdate({ flow_direction: v })}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{FLOW_DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Flows */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              Flows ({(zone.flow_tags || []).length}) <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              {flows.length === 0 && <p className="text-xs text-slate-400">No flows created yet.</p>}
              {flows.map((flow) => {
                const checked = (zone.flow_tags || []).includes(flow.name);
                return (
                  <label key={flow.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const tags = val
                          ? [...(zone.flow_tags || []), flow.name]
                          : (zone.flow_tags || []).filter((f) => f !== flow.name);
                        onUpdate({ flow_tags: tags });
                      }}
                    />
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLOW_COLORS[flow.color] || "#6b7280" }} />
                      {flow.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Notes toggle */}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowNotes((s) => !s)}>Notes</Button>

        {/* Actions */}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => { if (confirm(`Delete zone "${zone.name}"?`)) onDelete(); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Name edit (inline, shown when editing) */}
      {showNotes && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Label className="text-xs whitespace-nowrap pt-1.5">Name:</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== zone.name && onUpdate({ name })} className="h-8 text-sm flex-1" />
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (zone.notes || "") && onUpdate({ notes })} rows={2} className="text-sm" placeholder="Zone notes..." />
        </div>
      )}
    </div>
  );
}