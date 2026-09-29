import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

/**
 * Inline editor for a dropdown's option list. Every option can be removed
 * (built-in defaults come back if re-added later).
 */
export default function OptionsEditor({ label, options, onAdd, onRemove }) {
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
        {options.map(o => (
          <span key={o} className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border bg-white border-amber-300 text-slate-700">
            {o}
            <button type="button" onClick={() => onRemove(o)} className="text-red-400 hover:text-red-600" title="Remove option">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
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
      <p className="text-[10px] text-slate-400 mt-1">Removed a built-in option by mistake? Just re-add it by typing the same name.</p>
    </div>
  );
}