import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Check } from "lucide-react";

const DEFAULT_PRICING = [
  { style_key: "basic_euro",          style_label: "Basic Euro",          bases_lf: 350, uppers_lf: 250, tall_lf: 400,  wood_species: "Maple",  door_style: "Slab",          handles: "Bar Pull",     drawerbox: "Dovetail",       drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "high_end_euro",       style_label: "High End Euro",       bases_lf: 550, uppers_lf: 400, tall_lf: 650,  wood_species: "Walnut", door_style: "Slab",          handles: "Integrated",   drawerbox: "Dovetail",       drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "basic_face_frame",    style_label: "Basic Face Frame",    bases_lf: 400, uppers_lf: 300, tall_lf: 450,  wood_species: "Maple",  door_style: "Shaker",        handles: "Bar Pull",     drawerbox: "Dovetail",       drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "mid_face_frame",      style_label: "Mid Face Frame",      bases_lf: 600, uppers_lf: 450, tall_lf: 700,  wood_species: "Cherry", door_style: "Raised Panel",  handles: "Cup Pull",     drawerbox: "Dovetail",       drawer_glides: "Soft-Close", hinges: "Concealed" },
  { style_key: "high_end_face_frame", style_label: "High End Face Frame", bases_lf: 900, uppers_lf: 700, tall_lf: 1100, wood_species: "Walnut", door_style: "Inset Shaker",  handles: "Custom",       drawerbox: "Dovetail",       drawer_glides: "Soft-Close", hinges: "Inset Concealed" },
];

export default function BidPricingSettings({ open, onClose, onPricingUpdated }) {
  const [configs, setConfigs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadConfigs();
  }, [open]);

  const loadConfigs = async () => {
    const existing = await base44.entities.BidPricingConfig.list();
    if (existing.length === 0) {
      // Seed defaults
      const created = await Promise.all(
        DEFAULT_PRICING.map((d) => base44.entities.BidPricingConfig.create(d))
      );
      setConfigs(created);
    } else {
      // Ensure all 5 styles exist
      const merged = DEFAULT_PRICING.map((def) => {
        const found = existing.find((e) => e.style_key === def.style_key);
        return found || def;
      });
      // Create any missing
      const missing = merged.filter((m) => !m.id);
      if (missing.length > 0) {
        await Promise.all(missing.map((m) => base44.entities.BidPricingConfig.create(m)));
        const refreshed = await base44.entities.BidPricingConfig.list();
        setConfigs(refreshed);
      } else {
        setConfigs(merged);
      }
    }
  };

  const update = (styleKey, field, value) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.style_key !== styleKey) return c;
        const isNumber = ["bases_lf", "uppers_lf", "tall_lf"].includes(field);
        return { ...c, [field]: isNumber ? (parseFloat(value) || 0) : value };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      configs.map((c) =>
        c.id
          ? base44.entities.BidPricingConfig.update(c.id, { bases_lf: c.bases_lf, uppers_lf: c.uppers_lf, tall_lf: c.tall_lf, description: c.description, wood_species: c.wood_species, door_style: c.door_style, handles: c.handles, drawerbox: c.drawerbox, drawer_glides: c.drawer_glides, hinges: c.hinges })
          : base44.entities.BidPricingConfig.create(c)
      )
    );
    setSaving(false);
    setSaved(true);
    onPricingUpdated?.();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cabinet Style Pricing</DialogTitle>
          <p className="text-sm text-slate-500">Set the price per linear foot for each cabinet category and style. These rates are used by AI when generating bids.</p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {configs.map((c) => (
            <div key={c.style_key} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">{c.style_label}</div>
              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Bases $/LF</label>
                  <Input type="number" value={c.bases_lf} onChange={(e) => update(c.style_key, "bases_lf", e.target.value)} className="h-9 text-sm text-center" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Uppers $/LF</label>
                  <Input type="number" value={c.uppers_lf} onChange={(e) => update(c.style_key, "uppers_lf", e.target.value)} className="h-9 text-sm text-center" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tall $/LF</label>
                  <Input type="number" value={c.tall_lf} onChange={(e) => update(c.style_key, "tall_lf", e.target.value)} className="h-9 text-sm text-center" />
                </div>
              </div>
              {/* Description */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Short Description (shown on style card)</label>
                <Input value={c.description || ""} onChange={(e) => update(c.style_key, "description", e.target.value)} className="h-9 text-sm" placeholder="e.g. Full overlay, frameless construction" />
              </div>
              {/* Specs */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: "wood_species", label: "Wood Species" },
                  { field: "door_style", label: "Door Style" },
                  { field: "handles", label: "Handles" },
                  { field: "drawerbox", label: "Drawerbox" },
                  { field: "drawer_glides", label: "Drawer Glides" },
                  { field: "hinges", label: "Hinges" },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                    <Input value={c[field] || ""} onChange={(e) => update(c.style_key, field, e.target.value)} className="h-9 text-sm" placeholder={label} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saved ? <><Check className="w-4 h-4 mr-1" />Saved</> : saving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save Pricing</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}