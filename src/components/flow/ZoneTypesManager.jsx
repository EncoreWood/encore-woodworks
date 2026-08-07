import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_ICONS } from "./flowConstants";
import ZoneSopEditor from "./ZoneSopEditor";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ZoneTypesManager({ open, onOpenChange, zoneTypes, zones, toast, sops }) {
  const queryClient = useQueryClient();
  const [selectedName, setSelectedName] = useState(null);
  const [sopOpen, setSopOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!open) { setSelectedName(null); setSopOpen(false); setDraft(null); }
  }, [open]);

  // The catalog (zoneTypes) is keyed by zone_type and carries the section-header
  // category. We use it only to label each named type's category.
  const categoryForZoneType = (zt) => {
    const c = zoneTypes.find((t) => t.name === zt)?.category;
    return (c || "").trim() || "Other";
  };

  // Build one card per DISTINCT placed-zone name. Multiple placed zones that
  // share the same name collapse into one card (with a count); zones with
  // different names are never merged, even if they share a zone_type.
  const nameMap = {};
  zones.forEach((z) => {
    if (!z.name) return;
    if (!nameMap[z.name]) {
      nameMap[z.name] = { name: z.name, icon: z.icon, color: z.color, zone_type: z.zone_type, count: 0, zones: [] };
    }
    nameMap[z.name].count++;
    nameMap[z.name].zones.push(z);
  });
  const cards = Object.values(nameMap);

  // Group cards under category section headers (derived from zone_type).
  const categoryOrder = [];
  const groups = {};
  cards.forEach((c) => {
    const cat = categoryForZoneType(c.zone_type);
    if (!groups[cat]) { groups[cat] = []; categoryOrder.push(cat); }
    groups[cat].push(c);
  });
  const orderedCategories = [...categoryOrder].sort((a, b) =>
    a === "Other" ? 1 : b === "Other" ? -1 : 0
  );

  const nameSopFor = (name) => (sops || []).find((s) => !s.zone_id && s.zone_name === name);

  const openDetail = (card) => {
    setSelectedName(card.name);
    setDraft({ name: card.name, icon: card.icon, color: card.color, zone_type: card.zone_type, originalName: card.name });
  };

  const saveGeneralInfo = async () => {
    if (!draft || !selectedName) return;
    const newName = draft.name.trim();
    if (!newName) { toast?.({ title: "Name required", variant: "destructive" }); return; }
    const affected = zones.filter((z) => z.name === selectedName);
    if (affected.length === 0) return;

    const updates = affected.map((z) => {
      const u = { id: z.id };
      if (newName !== selectedName) u.name = newName;
      if (draft.icon !== z.icon) u.icon = draft.icon;
      if (draft.color !== z.color) u.color = draft.color;
      if (draft.zone_type !== z.zone_type) u.zone_type = draft.zone_type;
      return u;
    });
    const hasChanges = updates.some((u) => Object.keys(u).length > 1);
    if (!hasChanges) { setSelectedName(newName); return; }

    try {
      await base44.entities.ShopFlowArea.bulkUpdate(updates);
      queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] });
      toast?.({ title: "✅ Type updated" });
    } catch (e) {
      toast?.({ title: "Failed to update zones", description: e?.message, variant: "destructive" });
      return;
    }

    // Keep the name-level SOP attached if the type was renamed.
    if (newName !== selectedName) {
      const sop = nameSopFor(selectedName);
      if (sop) {
        try {
          await base44.entities.ShopZoneSOP.update(sop.id, { zone_name: newName });
          queryClient.invalidateQueries({ queryKey: ["shopZoneSops"] });
        } catch { /* non-fatal */ }
      }
      setSelectedName(newName);
      setDraft((d) => ({ ...d, name: newName, originalName: newName }));
    }
  };

  const currentCard = selectedName ? cards.find((c) => c.name === selectedName) : null;
  const currentSop = selectedName ? nameSopFor(selectedName) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Zone Types</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">Each named zone type is its own card. Click one to edit its info and SOP.</p>

          {cards.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No placed zones yet. Add a zone from the toolbar to create a type.</p>
          ) : (
            <div className="space-y-4">
              {orderedCategories.map((cat) => (
                <div key={cat} className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{cat}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {groups[cat].map((c) => {
                      const hasSop = !!nameSopFor(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => openDetail(c)}
                          className="border rounded-lg p-3 flex flex-col gap-2 bg-slate-50 hover:bg-slate-100 hover:border-amber-400 transition text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-2xl flex-shrink-0">{c.icon}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{c.name}</p>
                              <p className="text-xs text-slate-500">
                                {c.count} zone{c.count !== 1 ? "s" : ""}{hasSop ? " · 📋 SOP" : ""}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Type detail / edit view */}
      <Dialog open={!!selectedName} onOpenChange={(o) => !o && setSelectedName(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{draft?.icon}</span>
              {draft?.name || selectedName}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              {/* General info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">General Info</p>
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={draft.zone_type} onValueChange={(v) => setDraft({ ...draft, zone_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {zoneTypes.map((t) => (
                        <SelectItem key={t.name} value={t.name}>{t.category || cap(t.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label className="text-xs">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ZONE_COLORS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setDraft({ ...draft, color: key })}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2",
                          val.zone,
                          draft.color === key ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "opacity-70 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={saveGeneralInfo}>Save Changes</Button>
              </div>

              {/* Placed zones */}
              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Placed Zones ({currentCard?.count || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {(currentCard?.zones || []).map((z) => (
                    <span key={z.id} className="text-xs bg-slate-100 px-2 py-1 rounded">{z.name}</span>
                  ))}
                </div>
              </div>

              {/* Name-level SOP */}
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
                <p className="text-[11px] text-slate-400">Applies to every placed zone named "{selectedName}".</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Name-level SOP editor (reuses the same rich editor as per-zone SOPs) */}
      <ZoneSopEditor
        open={sopOpen}
        onOpenChange={(o) => !o && setSopOpen(false)}
        zoneName={selectedName}
        zoneType={currentCard?.zone_type}
        zone={null}
        existingSop={currentSop}
      />
    </>
  );
}