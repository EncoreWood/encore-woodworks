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
 * Loads custom dropdown options for the Selections tab and merges them with
 * the built-in defaults. addOption/removeOption persist to the database so
 * changes apply app-wide.
 */
export default function useSelectionOptions() {
  const [customOptions, setCustomOptions] = useState({});

  useEffect(() => {
    let cancelled = false;
    base44.entities.SelectionOption.list()
      .then(recs => {
        if (cancelled) return;
        const map = {};
        recs.forEach(r => {
          if (!r.field_key || !r.value) return;
          if (!map[r.field_key]) map[r.field_key] = [];
          map[r.field_key].push(r.value);
        });
        setCustomOptions(map);
      })
      .catch(err => console.error("Failed to load selection options:", err));
    return () => { cancelled = true; };
  }, []);

  const getOptions = useCallback((key) => {
    const defaults = SELECTION_DEFAULTS[key] || [];
    const custom = customOptions[key] || [];
    return [...defaults, ...custom.filter(c => !defaults.includes(c))];
  }, [customOptions]);

  const addOption = useCallback(async (key, value) => {
    const v = (value || "").trim();
    if (!v) return;
    const defaults = SELECTION_DEFAULTS[key] || [];
    if (defaults.includes(v) || (customOptions[key] || []).includes(v)) return;
    await base44.entities.SelectionOption.create({ field_key: key, value: v });
    setCustomOptions(prev => ({ ...prev, [key]: [...(prev[key] || []), v] }));
  }, [customOptions]);

  const removeOption = useCallback(async (key, value) => {
    if ((SELECTION_DEFAULTS[key] || []).includes(value)) return; // built-in options can't be removed
    await base44.entities.SelectionOption.deleteMany({ field_key: key, value });
    setCustomOptions(prev => ({ ...prev, [key]: (prev[key] || []).filter(v => v !== value) }));
  }, []);

  return { getOptions, addOption, removeOption };
}