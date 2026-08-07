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
  const [selectedType, setSelectedType] = useState(null); // type name being viewed
  const [editing, setEditing] = useState(null); // new-type form
  const [sopOpen, setSopOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!open) { setSelectedType(null); setEditing(null); setSopOpen(false); setDraft(null); }
  }, [open]);

  const countFor = (name) => zones.filter((z) => z.zone_type === name).length;
  const placedFor = (name) => zones.filter((z) => z.zone_type === name);
  const typeSopFor = (name) => (sops || []).find((s) => !s.zone_id && s.zone_type === name);

  // Display list = configured types + any zone_type in use that isn't catalogued,
  // so the manager shows EVERY type in the system (placed or not).
  const configuredNames = zoneTypes.map((t) => t.name);
  const extras = [...new Set(zones.map((z) => z.zone_type).filter((n) => n && !configuredNames.includes(n)))]
    .map((n) => ({ name: n, icon: "⭐", default_color: "gray", category: "Uncategorized", isConfigured: false }));
  const displayTypes = [...zoneTypes.map((t) => ({ ...t, isConfigured: true })), ...extras];

  // Group by category (first-appearance order); "Uncategorized" sinks to the end.
  const categoryOrder = [];
  const groups = {};
  displayTypes.forEach((t) => {
    const c = (t.category || "").trim() || "Uncategorized";
    if (!groups[c]) { groups[c] = []; categoryOrder.push(c); }
    groups[c].push(t);
  });
  const orderedCategories = [...categoryOrder].sort((a, b) =>
    a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : 0
  );

  const openDetail = (t) => {
    setSelectedType(t.name);
    setDraft({
      name: t.name,
      icon: t.icon,
      default_color: t.default_color,
      category: t.category || "",
      originalName: t.name,
      isConfigured: !!t.isConfigured,
    });
  };

  const startAdd = () => setEditing({ name: "", icon: "📦", default_color: "blue", category: "", isNew: true, originalName: "" });

  const handleSaveNew = () => {
    if (!editing) return;
    const name = editing.name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast?.({ title: "Name required", variant: "destructive" }); return; }
    if (zoneTypes.some((t) => t.name === name)) { toast?.({ title: "Type already exists", variant: "destructive" }); return; }
    const category = (editing.category || "").trim() || "Uncategorized";
    onSaveConfig([...zoneTypes, { name, icon: editing.icon, default_color: editing.default_color, category }], null, null);
    setEditing(null);
    // Open the new type's detail so the user can immediately add its SOP
    openDetail({ name, icon: editing.icon, default_color: editing.default_color, category, isConfigured: true });
  };

  const saveGeneralInfo = () => {
    if (!draft) return;
    const name = draft.name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast?.({ title: "Name required", variant: "destructive" }); return; }
    const category = (draft.category || "").trim() || "Uncategorized";

    if (!draft.isConfigured) {
      // Promote an uncatalogued (in-use) type into the type catalog.
      if (zoneTypes.some((t) => t.name === name)) { toast?.({ title: "Type already exists", variant: "destructive" }); return; }
      onSaveConfig([...zoneTypes, { name, icon: draft.icon, default_color: draft.default_color, category }], null, null);
      setDraft((d) => ({ ...d, name, originalName: name, isConfigured: true }));
      setSelectedType(name);
      return;
    }

    const renamed = name !== draft.originalName;
    if (renamed && zoneTypes.some((t) => t.name === name && t.name !== draft.originalName)) {
      toast?.({ title: "Type already exists", variant: "destructive" }); return;
    }
    const next = zoneTypes.map((t) =>
      t.name === draft.originalName ? { name, icon: draft.icon, default_color: draft.default_color, category } : t
    );
    onSaveConfig(next, renamed ? draft.originalName : null, renamed ? name : null);
    setDraft((d) => ({ ...d, name, originalName: name }));
    setSelectedType(name);
  };

  const handleDelete = (name) => {
    const count = countFor(name);
    if (count > 0) {
      toast?.({ title: "Cannot delete", description: `${count} zone${count > 1 ? "s" : ""} use this type. Reassign them first.`, variant: "destructive" });
      return;
    }
    onSaveConfig(zoneTypes.filter((x) => x.name !== name));
    setSelectedType(null);
    setDraft(null);
  };

  const currentSop = selectedType ? typeSopFor(selectedType) : null;
  const currentPlaced = selectedType ? placedFor(selectedType) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zone Types</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">Every zone category in the system. Click a type to edit its info and SOP.</p>

          <div className="space-y-4">
            {orderedCategories.map((cat) => (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{cat}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {groups[cat].map((t) => {
                    const count = countFor(t.name);
                    const hasSop = !!typeSopFor(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => openDetail(t)}
                        className="border rounded-lg p-3 flex flex-col gap-2 bg-slate-50 hover:bg-slate-100 hover:border-amber-400 transition text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl flex-shrink-0">{t.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{cap(t.name)}</p>
                            <p className="text-xs text-slate-500">
                              {count} zone{count !== 1 ? "s" : ""}
                              {hasSop ? " · 📋 SOP" : ""}
                              {!t.isConfigured ? " · uncatalogued" : ""}
                            </p>
                          </div>
                        </div>
                      </button>
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
      </Dialog>

      {/* Add new type sub-dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Zone Type</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus placeholder="e.g. Pocket Machine" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input list="zt-categories" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Machines" />
                <datalist id="zt-categories">
                  {categoryOrder.filter((c) => c !== "Uncategorized").map((c) => <option key={c} value={c} />)}
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
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveNew}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type detail / edit view */}
      <Dialog open={!!selectedType} onOpenChange={(o) => !o && setSelectedType(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{draft?.icon}</span>
              {cap(draft?.name || selectedType || "")}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              {/* General info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">General Info</p>
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. pocket_machine"
                  />
                  {!draft.isConfigured && (
                    <p className="text-[11px] text-amber-700">This type is in use but isn't in your type catalog yet — add it to edit its details.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Input
                    list="zt-cat2"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    placeholder="e.g. Machines"
                  />
                  <datalist id="zt-cat2">
                    {categoryOrder.filter((c) => c !== "Uncategorized").map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Icon</Label>
                  <div className="flex flex-wrap gap-1">
                    {ZONE_ICONS.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => setDraft({ ...draft, icon: ic })}
                        className={cn(
                          "w-9 h-9 rounded-lg border text-lg flex items-center justify-center",
                          draft.icon === ic ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ZONE_COLORS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setDraft({ ...draft, default_color: key })}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2",
                          val.zone,
                          draft.default_color === key ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "opacity-70 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={saveGeneralInfo}>
                  {draft.isConfigured ? "Save Changes" : "Add to Catalog"}
                </Button>
              </div>

              {/* Placed zones */}
              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Placed Zones ({currentPlaced.length})</p>
                {currentPlaced.length === 0 ? (
                  <p className="text-xs text-slate-400">No zones of this type placed on the floor yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlaced.map((z) => (
                      <span key={z.id} className="text-xs bg-slate-100 px-2 py-1 rounded">{z.name}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Type-level SOP */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Type-Level SOP</p>
                {currentSop ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-amber-200 p-3 bg-amber-50/50">
                      <p className="font-semibold text-slate-900 text-sm">{currentSop.title}</p>
                      {currentSop.overview && <p className="text-xs text-slate-600 mt-1 line-clamp-3">{currentSop.overview}</p>}
                      <p className="text-xs text-slate-500 mt-1">
                        {(currentSop.steps || []).length} step{(currentSop.steps || []).length !== 1 ? "s" : ""}
                        {(currentSop.required_ppe || []).length > 0 ? ` · ${currentSop.required_ppe.length} PPE` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSopOpen(true)}>Edit SOP</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setSopOpen(true)}>+ Add SOP</Button>
                )}
                <p className="text-[11px] text-slate-400">Applies to every zone of this type that doesn't have its own zone-specific SOP.</p>
              </div>

              {/* Danger zone */}
              {draft.isConfigured && (
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{countFor(selectedType)} placed zone{countFor(selectedType) !== 1 ? "s" : ""}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(selectedType)}
                    disabled={countFor(selectedType) > 0}
                  >
                    Delete Type
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Type-level SOP editor (reuses the same rich editor as per-zone SOPs) */}
      <ZoneSopEditor
        open={sopOpen}
        onOpenChange={(o) => !o && setSopOpen(false)}
        zoneType={selectedType}
        zone={null}
        existingSop={currentSop}
      />
    </>
  );
}