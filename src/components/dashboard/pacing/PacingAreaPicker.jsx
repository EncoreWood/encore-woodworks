import { AREA_OPTIONS } from "./pacingAreas";

// Area filter for the pacing chart: every stage at once, or one stage on its own.
// One line, horizontally scrollable on narrow screens so it never wraps the panel.
export default function PacingAreaPicker({ value, onChange }) {
  return (
    <div className="no-scrollbar -mx-1 mb-2 flex items-center gap-1 overflow-x-auto px-1">
      {AREA_OPTIONS.map(option => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: option.color }} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}