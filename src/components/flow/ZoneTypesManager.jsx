import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "./flowConstants";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ZoneTypesManager({ open, onOpenChange, zoneTypes, zones, onSaveConfig, toast }) {
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (!open) setEditing(null); }, [open]);

  const countFor = (name) => zones.filter((z) => z.zone_type === name).length;

  const startAdd = () => setEditing({ name: "", icon: "📦", default_color: "blue", isNew: true, originalName: "" });
  const startEdit = (t) => setEditing({ name: t.name, icon: t.icon, default_color: t.default_color, isNew: false, originalName: t.name });

  const handleSaveType = () => {
    if (!editing) return;
    const name = editing.name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast?.({ title: "Name required", variant: "destructive" }); return; }
    if (editing.isNew) {
      if (zoneTypes.some((t) => t.name === name)) {
        toast?.({ title: "Type already exists", variant: "destructive" });
        return;
      }
      onSaveConfig([...zoneTypes, { name, icon: editing.icon, default_color: editing.default_color }], null, null);
    } else {
      const renamed = name !== editing.originalName;
      if (renamed && zoneTypes.some((t) => t.name === name && t.name !== editing.originalName)) {
        toast?.({ title: "Type already exists", variant: "destructive" });
        return;
      }
      const next = zoneTypes.map((t) =>
        t.name === editing.originalName ? { name, icon: editing.icon, default_color: editing.default_color } : t
      );
      onSaveConfig(next, renamed ? editing.originalName : null, renamed ? name : null);
    }
    setEditing(null);
  };

  const handleDelete = (t) => {
    const count = countFor(t.name);
    if (count > 0) {
      toast?.({
        title: "Cannot delete",
        description: `${count} zone${count > 1 ? "s" : ""} are using this type. Reassign them first.`,
        variant: "destructive",
      });
      return;
    }
    onSaveConfig(zoneTypes.filter((x) => x.name !== t.name));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zone Types</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {zoneTypes.map((t) => {
            const count = countFor(t.name);
            return (
              <div key={t.name} className="border rounded-lg p-3 flex flex-col gap-2 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl flex-shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{cap(t.name)}</p>
                    <p className="text-xs text-slate-500">{count} zone{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-auto">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => startEdit(t)}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDelete(t)}>🗑</Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2">
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={startAdd}>+ Add New Zone Type</Button>
        </div>
      </DialogContent>

      {/* Edit / Add sub-dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing?.isNew ? "New Zone Type" : "Edit Zone Type"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
              </div>
              <div className="space-y-1">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1">
                  {ZONE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setEditing({ ...editing, icon: ic })}
                      className={cn(
                        "w-9 h-9 rounded-lg border text-lg flex items-center justify-center",
                        editing.icon === ic ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Default Color</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ZONE_COLORS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setEditing({ ...editing, default_color: key })}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2",
                        val.zone,
                        editing.default_color === key ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveType}>{editing?.isNew ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}