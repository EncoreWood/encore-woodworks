import { Loader2 } from "lucide-react";
import { SECTION_TINTS } from "./shopAreaConfig";

/**
 * Compact collapsed section tile. Clicking it opens the section's full list.
 */
export default function SectionTile({ sectionKey, icon: Icon, label, count, countLabel, loading, onClick }) {
  const tint = SECTION_TINTS[sectionKey] || "bg-amber-50 text-amber-600 border-amber-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square rounded-2xl border border-slate-200 bg-white shadow-sm p-3 flex flex-col items-start justify-between text-left hover:border-slate-300 hover:shadow transition-colors"
      title={`Open ${label}`}
    >
      <span
        className={`w-full flex-1 rounded-xl border flex items-center justify-center ${tint}`}
      >
        <Icon className="w-1/2 h-1/2 max-w-12 max-h-12" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 w-full pt-2">
        <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">{label}</p>
        <p className="text-[10px] mt-0.5 flex items-center gap-1 text-slate-500">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            countLabel ?? `${count} item${count === 1 ? "" : "s"}`
          )}
        </p>
      </div>
    </button>
  );
}