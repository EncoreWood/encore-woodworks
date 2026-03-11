import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Check } from "lucide-react";

const DEFAULT_PRICING = [
  { style_key: "basic_euro",         style_label: "Basic Euro",           bases_lf: 350, uppers_lf: 250, tall_lf: 400 },
  { style_key: "high_end_euro",      style_label: "High End Euro",        bases_lf: 550, uppers_lf: 400, tall_lf: 650 },
  { style_key: "basic_face_frame",   style_label: "Basic Face Frame",     bases_lf: 400, uppers_lf: 300, tall_lf: 450 },
  { style_key: "mid_face_frame",     style_label: "Mid Face Frame",       bases_lf: 600, uppers_lf: 450, tall_lf: 700 },
  { style_key: "high_end_face_frame",style_label: "High End Face Frame",  bases_lf: 900, uppers_lf: 700, tall_lf: 1100 },
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
      prev.map((c) => c.style_key === styleKey ? { ...c, [field]: parseFloat(value) || 0 } : c)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      configs.map((c) =>
        c.id
          ? base44.entities.BidPricingConfig.update(c.id, { bases_lf: c.bases_lf, uppers_lf: c.uppers_lf, tall_lf: c.tall_lf })
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

        <div className="space-y-4 mt-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-3 text-xs font-semibold text-slate-500 px-1">
            <div>Style</div>
            <div className="text-center">Bases $/LF</div>
            <div className="text-center">Uppers $/LF</div>
            <div className="text-center">Tall $/LF</div>
          </div>

          {configs.map((c) => (
            <div key={c.style_key} className="grid grid-cols-[1fr_100px_100px_100px] gap-3 items-center bg-slate-50 rounded-lg px-3 py-3">
              <div className="font-semibold text-slate-800 text-sm">{c.style_label}</div>
              <Input
                type="number"
                value={c.bases_lf}
                onChange={(e) => update(c.style_key, "bases_lf", e.target.value)}
                className="h-9 text-sm text-center"
              />
              <Input
                type="number"
                value={c.uppers_lf}
                onChange={(e) => update(c.style_key, "uppers_lf", e.target.value)}
                className="h-9 text-sm text-center"
              />
              <Input
                type="number"
                value={c.tall_lf}
                onChange={(e) => update(c.style_key, "tall_lf", e.target.value)}
                className="h-9 text-sm text-center"
              />
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