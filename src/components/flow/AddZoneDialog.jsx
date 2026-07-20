import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_TYPES, ZONE_ICONS } from "./flowConstants";

export default function AddZoneDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState("workstation");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("📦");
  const [orderStr, setOrderStr] = useState("");

  const reset = () => { setName(""); setZoneType("workstation"); setColor("blue"); setIcon("📦"); setOrderStr(""); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const flow_order = orderStr.trim() === "" ? null : parseInt(orderStr, 10);
    onCreate({ name: name.trim(), zone_type: zoneType, color, icon, flow_order: isNaN(flow_order) ? null : flow_order, flow_direction: "right" });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Zone</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Zone Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Assembly Area" autoFocus onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="space-y-1">
            <Label>Zone Type</Label>
            <Select value={zoneType} onValueChange={setZoneType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Flow Order (blank = not in sequence)</Label>
            <Input type="number" value={orderStr} onChange={e => setOrderStr(e.target.value)} placeholder="e.g. 3" />
          </div>
          <div className="space-y-1">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ZONE_COLORS).map(([key, val]) => (
                <button key={key} onClick={() => setColor(key)}
                  className={cn("w-8 h-8 rounded-lg border-2 transition", val.zone, color === key ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "opacity-70 hover:opacity-100")} />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1">
              {ZONE_ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={cn("w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition",
                    icon === ic ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:bg-slate-50")}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()} className="bg-amber-600 hover:bg-amber-700">Create Zone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}