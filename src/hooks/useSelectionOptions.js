import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { SPECIES_OPTIONS, FINISH_OPTIONS } from "@/components/projects/room-tabs/SpeciesFinishCard";

export const SELECTION_DEFAULTS = {
  cabinet_style: ["FF Inset - Shaker", "FF Inset - Flat", "Overlay - Shaker", "Overlay - Flat", "Euro - Frameless", "Custom"],
  door_style: ["Shaker", "Flat Panel", "Raised Panel", "Beadboard", "Glass Insert", "Slab", "Custom"],
  handles: ["TBD", "Bar Pull", "Cup Pull", "Knob", "No Hardware", "Custom"],
  drawer_glides: ["Soft Close", "Full Extension", "Standard", "Custom"],
  hinges: ["Soft Close", "Standard", "Concealed", "Custom"],
  molding: ["None", "Crown - Simple", "Crown - Build Up", "Light Rail", "Base Molding", "Custom"],
  cabs_to_height: ["Yes", "No", "Partial"],
  wood_species: SPECIES_OPTIONS,
  finish: FINISH_OPTIONS
};

/**
 * Dropdown options for the Selections tab. Built-in defaults can be hidden
 * (tracked as "removed" markers) and custom options can be added — all
 * persisted to the database so changes apply app-wide.
 */
export default function useSelectionOptions() {
  const [additions, setAdditions] = useState({}); // key -> [values added by team]
  const [hidden, setHidden] = useState({}); // key -> [default values hidden]

  useEffect(() => {
    let cancelled = false;
    base44.entities.SelectionOption.list()
      .then(recs => {
        if (cancelled) return;
        const adds = {};
        const hides = {};
        recs.forEach(r => {
          if (!r.field_key || !r.value) return;
          const target = r.removed ? hides : adds;
          if (!target[r.field_key]) target[r.field_key] = [];
          target[r.field_key].push(r.value);
        });
        setAdditions(adds);
        setHidden(hides);
      })
      .catch(err => console.error("Failed to load selection options:", err));
    return () => { cancelled = true; };
  }, []);

  const getOptions = useCallback((key) => {
    const defaults = SELECTION_DEFAULTS[key] || [];
    const hiddenVals = hidden[key] || [];
    const adds = additions[key] || [];
    const visibleDefaults = defaults.filter(d => !hiddenVals.includes(d));
    return [...visibleDefaults, ...adds.filter(c => !defaults.includes(c))];
  }, [additions, hidden]);

  const addOption = useCallback(async (key, value) => {
    const v = (value || "").trim();
    if (!v) return;
    const defaults = SELECTION_DEFAULTS[key] || [];
    if (defaults.includes(v)) {
      // Re-showing a hidden built-in option — remove its removal marker(s)
      const hiddenVals = hidden[key] || [];
      if (hiddenVals.includes(v)) {
        await base44.entities.SelectionOption.deleteMany({ field_key: key, value: v, removed: true });
        setHidden(prev => ({ ...prev, [key]: (prev[key] || []).filter(x => x !== v) }));
      }
      return;
    }
    if ((additions[key] || []).includes(v)) return;
    await base44.entities.SelectionOption.create({ field_key: key, value: v });
    setAdditions(prev => ({ ...prev, [key]: [...(prev[key] || []), v] }));
  }, [additions, hidden]);

  const removeOption = useCallback(async (key, value) => {
    const defaults = SELECTION_DEFAULTS[key] || [];
    if (defaults.includes(value)) {
      // Hide a built-in default via a removal marker
      const hiddenVals = hidden[key] || [];
      if (!hiddenVals.includes(value)) {
        await base44.entities.SelectionOption.create({ field_key: key, value, removed: true });
        setHidden(prev => ({ ...prev, [key]: [...(prev[key] || []), value] }));
      }
      return;
    }
    await base44.entities.SelectionOption.deleteMany({ field_key: key, value, removed: false });
    setAdditions(prev => ({ ...prev, [key]: (prev[key] || []).filter(v => v !== value) }));
  }, [hidden]);

  return { getOptions, addOption, removeOption };
}