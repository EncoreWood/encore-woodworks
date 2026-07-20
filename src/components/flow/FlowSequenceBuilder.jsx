import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { ZONE_COLORS } from "./flowConstants";

export default function FlowSequenceBuilder({ flow, zones, open, onOpenChange, onSave }) {
  const [sequence, setSequence] = useState([]);

  useEffect(() => {
    if (flow) {
      let ids = [];
      try {
        ids = JSON.parse(flow.sequence || "[]");
      } catch { ids = []; }
      // If empty, auto-build from flow_tags + flow_order
      if (ids.length === 0) {
        const tagged = zones.filter((z) => (z.flow_tags || []).includes(flow.name));
        tagged.sort((a, b) => (a.flow_order ?? 999) - (b.flow_order ?? 999));
        ids = tagged.map((z) => z.id);
      }
      setSequence(ids);
    }
  }, [flow, zones]);

  const inSeq = new Set(sequence);
  const available = zones.filter((z) => !inSeq.has(z.id));
  const sequencedZones = sequence.map((id) => zones.find((z) => z.id === id)).filter(Boolean);
  const flowHex = ZONE_COLORS[flow?.color]?.hex || "#6b7280";

  const add = (id) => setSequence([...sequence, id]);
  const remove = (id) => setSequence(sequence.filter((x) => x !== id));
  const move = (index, dir) => {
    const ni = index + dir;
    if (ni < 0 || ni >= sequence.length) return;
    const arr = [...sequence];
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    setSequence(arr);
  };

  const handleSave = () => {
    onSave(flow.id, JSON.stringify(sequence));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: flowHex }} />
            {flow?.name} — Sequence Builder
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-[300px]">
          {/* Available Zones */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Available Zones</p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {available.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between px-2 py-1.5 rounded border border-slate-200 text-sm hover:bg-slate-50">
                  <span className="truncate">{zone.icon} {zone.name}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => add(zone.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {available.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">All zones added to this flow.</p>}
            </div>
          </div>
          {/* Flow Sequence */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Flow Sequence ({sequencedZones.length})</p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {sequencedZones.map((zone, index) => (
                <div key={zone.id} className="flex items-center gap-1 px-2 py-1.5 rounded border-2 text-sm" style={{ borderColor: flowHex }}>
                  <span className="font-bold text-xs opacity-50 w-5">{index + 1}.</span>
                  <span className="flex-1 truncate">{zone.icon} {zone.name}</span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(index, 1)} disabled={index === sequencedZones.length - 1}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => remove(zone.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {sequencedZones.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No zones in this flow yet.<br />Click + on the left to add zones.</p>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave}>Save Sequence</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}