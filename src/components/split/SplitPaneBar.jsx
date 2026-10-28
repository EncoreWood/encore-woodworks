import { X } from "lucide-react";

/**
 * Slim bar above each split pane: which side it is, the page picker,
 * and (on the right) the button that leaves split screen.
 */
export default function SplitPaneBar({ side, page, groups, onChange, onClose }) {
  const allItems = groups.flatMap((g) => g.items);
  const known = allItems.some((it) => it.page === page);

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-400/60 bg-gradient-to-b from-slate-200 to-slate-300 px-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
        {side === "left" ? "Left" : "Right"}
      </span>
      <select
        value={known ? page : ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Page shown on the ${side}`}
        className="h-6 max-w-[230px] rounded-md border border-slate-400/70 bg-white/85 px-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-600/40"
      >
        {!known && <option value="">{page}</option>}
        {groups.map((g) => (
          <optgroup key={g.key} label={g.name}>
            {g.items.map((it) => (
              <option key={it.page} value={it.page}>
                {it.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {side === "right" && onClose && (
        <button
          type="button"
          onClick={onClose}
          title="Exit split screen"
          aria-label="Exit split screen"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-400/40 hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}