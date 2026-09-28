import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export const SPECIES_OPTIONS = ["Painted", "Maple", "Cherry", "White Oak", "Walnut", "Alder", "MDF"];
export const FINISH_OPTIONS = ["TBD", "Painted White", "Painted Gray", "Painted Custom", "Natural", "Stain - Light", "Stain - Medium", "Stain - Dark", "Two-Tone"];

/**
 * Seeds combined species+finish pairs from the legacy separate lists
 * (paired by index) so existing data carries over into the new editor.
 */
export function zipLegacySelections(room) {
  room = room || {};
  const species = Array.isArray(room.wood_species_selections) ? room.wood_species_selections : [];
  const finishes = Array.isArray(room.finish_selections) ? room.finish_selections : [];
  const out = [];
  for (let i = 0; i < Math.max(species.length, finishes.length); i++) {
    const wood_species = species[i]?.value || "";
    const finish = finishes[i]?.value || "";
    const note = species[i]?.note || finishes[i]?.note || "";
    if (wood_species || finish) out.push({ wood_species, finish, note });
  }
  return out;
}

function PairSelect({ label, options, value, onChange }) {
  const isCustom = !options.includes(value);
  return (
    <div>
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <select
        value={isCustom ? "Custom" : value}
        onChange={e => onChange(e.target.value === "Custom" ? "" : e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="Custom">Custom</option>
      </select>
      {isCustom && (
        <Input
          className="h-8 text-sm mt-1"
          placeholder={`Custom ${label.toLowerCase()}...`}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Editor card for paired wood species + finish selections. Each entry is
 * a species, the finish that goes with it, and an optional note for the
 * area/cabinets it applies to.
 */
export default function SpeciesFinishCard({ entries, onChange, readOnly = false }) {
  const list = Array.isArray(entries) ? entries : [];

  const updateEntry = (idx, patch) =>
    onChange(list.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const addEntry = () => onChange([...list, { wood_species: "", finish: "", note: "" }]);
  const removeEntry = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div className={`rounded-lg p-3 border border-slate-200 ${readOnly ? "bg-slate-50" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-slate-500 font-medium">Wood Species & Finish</p>
        {!readOnly && (
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {list.length === 0 && (
        <p className="text-sm text-slate-400">
          {readOnly ? "—" : (
            <button type="button" onClick={addEntry} className="hover:text-amber-600">
              + Add a species / finish pair
            </button>
          )}
        </p>
      )}

      <div className="space-y-2">
        {list.map((entry, idx) => (
          readOnly ? (
            <div key={idx} className="bg-white border border-slate-200 rounded-md p-2">
              <p className="text-sm font-semibold text-slate-800">
                {[entry.wood_species, entry.finish].filter(Boolean).join(" — ") || "—"}
              </p>
              {entry.note && <p className="text-xs text-slate-500">→ {entry.note}</p>}
            </div>
          ) : (
            <div key={idx} className="border border-slate-200 rounded-md p-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <PairSelect
                  label="Wood Species"
                  options={SPECIES_OPTIONS}
                  value={entry.wood_species}
                  onChange={v => updateEntry(idx, { wood_species: v })}
                />
                <PairSelect
                  label="Finish"
                  options={FINISH_OPTIONS}
                  value={entry.finish}
                  onChange={v => updateEntry(idx, { finish: v })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-8 text-sm"
                  placeholder="Area / cabinets (e.g. Island only, perimeter uppers)"
                  value={entry.note || ""}
                  onChange={e => updateEntry(idx, { note: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}