import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "./flowConstants";
import ZoneSopEditor from "./ZoneSopEditor";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ZoneTypesManager({ open, onOpenChange, zoneTypes, zones, onSaveConfig, toast, sops }) {
  const [editing, setEditing] = useState(null);
  const [sopType, setSopType] = useState(null);

  useEffect(() => { if (!open) { setEditing(null); setSopType(null); } }, [open]);

  const countFor = (name) => zones.filter((z) => z.zone_type === name).length;
  const hasTypeSop = (name) => !!(sops || []).find((s) => !s.zone_id && s.zone_type === name);

  // Group types by category (first-appearance order); "Uncategorized" sinks to the end.
  const categoryOrder = [];
  const groups = {};
  zoneTypes.forEach((t) => {
    const c = (t.category || "").trim() || "Uncategorized";
    if (!groups[c]) { groups[c] = []; categoryOrder.push(c); }
    groups[c].push(t);
  });
  const orderedCategories = [...categoryOrder].sort((a, b) =>
    a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : 0
  );

  const startAdd = () => setEditing({ name: "", icon: "📦", default_color: "blue", category: "", isNew: true, originalName: "" });
  const startEdit = (t) => setEditing({ name: t.name, icon: t.icon, default_color: t.default_color, category: t.category || "", isNew: false, originalName: t.name });

  const handleSaveType = () => {
    if (!editing) return;
    const name = editing.name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast?.({ title: "Name required", variant: "destructive" }); return; }
    const category = (editing.category || "").trim() || "Uncategorized";
    if (editing.isNew) {
      if (zoneTypes.some((t) => t.name === name)) {
        toast?.({ title: "Type already exists", variant: "destructive" });
        return;
      }
      onSaveConfig([...zoneTypes, { name, icon: editing.icon, default_color: editing.default_color, category }], null, null);
    } else {
      const renamed = name !== editing.originalName;
      if (renamed && zoneTypes.some((t) => t.name === name && t.name !== editing.originalName)) {
        toast?.({ title: "Type already exists", variant: "destructive" });
        return;
      }
      const next = zoneTypes.map((t) =>
        t.name === editing.originalName ? { name, icon: editing.icon, default_color: editing.default_color, category } : t
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

  const typeSop = sopType ? (sops || []).find((s) => !s.zone_id && s.zone_type === sopType) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zone Types</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {orderedCategories.map((cat) => (
            <div key={cat} className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {groups[cat].map((t) => {
                  const count = countFor(t.name);
                  const hasSop = hasTypeSop(t.name);
                  return (
                    <div key={t.name} className="border rounded-lg p-3 flex flex-col gap-2 bg-slate-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0">{t.icon}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{cap(t.name)}</p>
                          <p className="text-xs text-slate-500">{count} zone{count !== 1 ? "s" : ""}{hasSop ? " · 📋 SOP" : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-auto">
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setSopType(t.name)} title="Edit type-level SOP">
                          📋 SOP{hasSop ? "" : " +"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => startEdit(t)}>Edit</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDelete(t)}>🗑</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
                <Label>Category</Label>
                <Input
                  list="zt-categories"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  placeholder="e.g. Machines"
                />
                <datalist id="zt-categories">
                  {categoryOrder.filter((c) => c !== "Uncategorized").map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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

      {/* Type-level SOP editor */}
      <ZoneSopEditor
        open={!!sopType}
        onOpenChange={(o) => !o && setSopType(null)}
        zoneType={sopType}
        zone={null}
        existingSop={typeSop}
      />
    </Dialog>
  );
}