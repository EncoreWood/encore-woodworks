import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Check, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ZONE_COLORS } from "./flowConstants";

export default function FlowManager({ open, onOpenChange, flows, onCreate, onDelete, onRename, selectedFlow, onSelectFlow, onEditSequence, checkedFlows, onToggleFlowVisibility, onShowAllFlows, onShowSelectedOnly }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor("blue");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>🔀 Flows</DialogTitle></DialogHeader>

        {/* New Flow */}
        <div className="flex gap-2 items-center">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New flow name..." onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <div className="flex gap-1">
            {Object.entries(ZONE_COLORS).slice(0, 6).map(([key, val]) => (
              <button key={key} onClick={() => setNewColor(key)}
                className={cn("w-6 h-6 rounded-full border-2", val.zone, newColor === key ? "ring-2 ring-offset-1 ring-slate-700" : "")} />
            ))}
          </div>
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4" /></Button>
        </div>

        {/* Flow List */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {/* Visibility controls */}
          <div className="flex gap-2 px-1">
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onShowAllFlows}>Show All</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onShowSelectedOnly}>Show Selected Only</Button>
          </div>

          {flows.map((flow) => (
            <div key={flow.id} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition",
              selectedFlow === flow.name ? "bg-amber-50 border-amber-300" : "border-slate-200 hover:bg-slate-50")}>
              {editingId === flow.id ? (
                <div className="flex gap-2 flex-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm" autoFocus />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { onRename(flow.id, editName); setEditingId(null); }}>Save</Button>
                </div>
              ) : (
                <>
                  <Checkbox
                    checked={checkedFlows?.has(flow.name) ?? true}
                    onCheckedChange={() => onToggleFlowVisibility(flow.name)}
                  />
                  <button onClick={() => onSelectFlow(selectedFlow === flow.name ? null : flow.name)} className="flex items-center gap-2 flex-1">
                    <span className={cn("w-4 h-4 rounded-full border-2", ZONE_COLORS[flow.color]?.zone || ZONE_COLORS.gray.zone)} />
                    <span>{flow.name}</span>
                    {selectedFlow === flow.name && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                  <div className="flex gap-1">
                    <Button size="ghost" className="h-7 w-7 p-0" title="Edit Sequence" onClick={() => onEditSequence(flow)}><ListOrdered className="w-3.5 h-3.5" /></Button>
                    <Button size="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(flow.id); setEditName(flow.name); }}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => { if (confirm(`Delete flow "${flow.name}"?`)) onDelete(flow.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {flows.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No flows yet. Create one above.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}