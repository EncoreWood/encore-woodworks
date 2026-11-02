import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Inline quantity control for an inventory row: −/+ buttons plus a field you can
 * type a new count into (committed on blur or Enter).
 */
export default function QuantityStepper({ value, unit, low = false, onChange }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value ?? 0));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = parseFloat(draft);
    if (Number.isNaN(parsed)) {
      setDraft(String(value ?? 0));
      return;
    }
    const next = Math.max(parsed, 0);
    setDraft(String(next));
    if (next !== (value ?? 0)) onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max((value ?? 0) - 1, 0))}
        className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center active:bg-slate-100 touch-manipulation"
        title="Take one out"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-baseline justify-center gap-0.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(String(value ?? 0));
              e.currentTarget.blur();
            }
          }}
          inputMode="decimal"
          className={`w-12 h-7 text-center text-xs font-bold font-mono rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 ${
            low ? "text-red-600 border-red-200" : "text-slate-800 border-slate-200"
          }`}
          title="Type a new quantity"
        />
        {unit ? <span className="text-[10px] font-normal text-slate-400">{unit}</span> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange((value ?? 0) + 1)}
        className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center active:bg-slate-100 touch-manipulation"
        title="Add one"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}