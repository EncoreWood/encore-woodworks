import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Editor card for room selections that allow multiple entries
 * (wood species, finish). Each entry is a value + a note saying
 * which area/cabinets it applies to.
 */
export default function MultiSelectionCard({ label, options, entries, onChange, readOnly = false }) {
  const list = Array.isArray(entries) ? entries : [];

  const updateEntry = (idx, patch) =>
    onChange(list.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const addEntry = () => onChange([...list, { value: "", note: "" }]);
  const removeEntry = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div className={`rounded-lg p-3 border border-slate-200 ${readOnly ? "bg-slate-50" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
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
              + Add a selection
            </button>
          )}
        </p>
      )}

      <div className="space-y-2">
        {list.map((entry, idx) => {
          const isCustom = !options.includes(entry.value);
          return (
            <div key={idx} className={`rounded-md p-2 space-y-1.5 ${readOnly ? "bg-white border border-slate-200" : "border border-slate-200"}`}>
              <div className="flex items-center gap-1.5">
                {readOnly ? (
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{entry.value || "—"}</p>
                    {entry.note && <p className="text-xs text-slate-500">→ {entry.note}</p>}
                  </div>
                ) : (
                  <>
                    <select
                      value={isCustom ? "Custom" : entry.value}
                      onChange={e => updateEntry(idx, { value: e.target.value === "Custom" ? "" : e.target.value })}
                      className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">— Select —</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                      <option value="Custom">Custom</option>
                    </select>
                    {isCustom && (
                      <Input
                        className="flex-1 h-8 text-sm"
                        placeholder="Enter custom value..."
                        value={entry.value}
                        onChange={e => updateEntry(idx, { value: e.target.value })}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeEntry(idx)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              {!readOnly && (
                <Input
                  className="h-8 text-sm"
                  placeholder="Area / cabinets it applies to (e.g. Island only, perimeter uppers)"
                  value={entry.note || ""}
                  onChange={e => updateEntry(idx, { note: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}