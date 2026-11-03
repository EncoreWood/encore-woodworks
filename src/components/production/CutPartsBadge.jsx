import { useState } from "react";
import { Scissors, Check, ChevronDown } from "lucide-react";

// Parent-card badges for the cut cards split off it. One open cut → a link to that
// card; several → a count that expands to the list; all merged → "Cut parts complete".
export default function CutPartsBadge({ cutChildren = [], onOpenCard }) {
  const [expanded, setExpanded] = useState(false);
  const children = cutChildren || [];
  if (!children.length) return null;

  const open = children.filter(child => !child.is_merged);
  const done = children.filter(child => child.is_merged);

  const openList = (
    <div className="flex flex-col items-start gap-0.5 mt-0.5">
      {open.map(child => (
        <button
          key={child.id}
          onClick={(e) => { e.stopPropagation(); onOpenCard?.(child.id); }}
          className="text-[9px] font-semibold text-orange-700 hover:underline leading-tight truncate max-w-full"
          title="Open this cut card"
        >
          {child.name}{child.cut_details?.description ? ` — ${child.cut_details.description}` : ""}
        </button>
      ))}
    </div>
  );

  // Everything is cut and merged back into this card
  if (open.length === 0) {
    return (
      <div className="mb-1">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full bg-green-100 border border-green-300 text-green-700 text-[9px] font-bold leading-tight hover:bg-green-200 transition-colors"
          title="Cut parts are done and merged back into this card"
        >
          <Check className="w-2.5 h-2.5" /> Cut parts complete
          {done.length > 1 ? ` (${done.length})` : ""}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {expanded && (
          <div className="flex flex-col items-start gap-0.5 mt-0.5">
            {done.map(child => (
              <button
                key={child.id}
                onClick={(e) => { e.stopPropagation(); onOpenCard?.(child.id); }}
                className="text-[9px] text-green-800 leading-tight truncate max-w-full hover:underline"
                title="Open the merged cut card"
              >
                {child.name}{child.cut_details?.description ? ` — ${child.cut_details.description}` : ""}
                {child.cut_details?.qty ? ` (× ${child.cut_details.qty})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // A single open cut card — jump straight to it
  if (open.length === 1) {
    return (
      <div className="mb-1">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenCard?.(open[0].id); }}
          className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-[9px] font-bold leading-tight hover:bg-orange-200 transition-colors max-w-full"
          title="Cut work is happening on this linked card"
        >
          <Scissors className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">Cut parts → {open[0].name}</span>
        </button>
        {done.length > 0 && (
          <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-green-700">
            <Check className="w-2.5 h-2.5" /> {done.length} done
          </span>
        )}
      </div>
    );
  }

  // Several open cut cards — count, expands to the list
  return (
    <div className="mb-1">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
        className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-[9px] font-bold leading-tight hover:bg-orange-200 transition-colors"
        title="This card has several cut cards — tap to list them"
      >
        <Scissors className="w-2.5 h-2.5" /> Cut parts ({open.length})
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {done.length > 0 && (
        <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-green-700">
          <Check className="w-2.5 h-2.5" /> {done.length} done
        </span>
      )}
      {expanded && openList}
    </div>
  );
}