import { Loader2 } from "lucide-react";

/**
 * Compact collapsed section tile. Clicking it opens the section's full list.
 */
export default function SectionTile({ icon: Icon, label, count, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-3 flex flex-col items-start justify-between text-left hover:border-amber-300 hover:shadow transition-colors"
      title={`Open ${label}`}
    >
      <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber-700" />
      </span>
      <div className="min-w-0 w-full">
        <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            `${count} item${count === 1 ? "" : "s"}`
          )}
        </p>
      </div>
    </button>
  );
}