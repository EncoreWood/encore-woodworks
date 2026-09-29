import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

/**
 * Inline editor for a dropdown's option list. Built-in options are locked;
 * options added by the team can be removed.
 */
export default function OptionsEditor({ label, options, lockedCount = 0, onAdd, onRemove }) {
  const [newVal, setNewVal] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const v = newVal.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await onAdd(v);
      setNewVal("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">{label} options</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {options.map((o, i) => {
          const locked = i < lockedCount;
          return (
            <span
              key={o}
              className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${locked ? "bg-white border-slate-200 text-slate-500" : "bg-white border-amber-300 text-slate-700"}`}
            >
              {o}
              {!locked && (
                <button type="button" onClick={() => onRemove(o)} className="text-red-400 hover:text-red-600" title="Remove option">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs"
          placeholder={`Add ${label.toLowerCase()} option...`}
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        />
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" disabled={busy || !newVal.trim()} onClick={handleAdd}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Gray chips are built-in defaults; amber ones were added by your team and can be removed.</p>
    </div>
  );
}