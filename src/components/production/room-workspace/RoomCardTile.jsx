import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, ArrowRight, FileText } from "lucide-react";
import ProductionCard from "@/components/production/ProductionCard";
import PdfFileDialog from "@/components/production/PdfFileDialog";
import { cardPts } from "@/lib/roomPts";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  cabinet: "Cabinet",
  cut: "Cut",
  misc: "Misc",
  pickup: "Pick up",
  end_panel: "End Panel",
};

const STAGE_LABELS = {
  cut: "Cut",
  face_frame: "Face Frame",
  spray: "Spray",
  build: "Build",
  complete: "Complete",
  on_hold: "On Hold",
};

/**
 * One card in the Room Workspace left pane. Collapsed (default) is a compact
 * tile — checkbox, cabinet ID, type label, PTS / stage pills and the PDF link —
 * so many cards fit on screen at once. Expanded swaps in the full ProductionCard
 * (compact variant) so every per-card action keeps working.
 */
export default function RoomCardTile({ item, expanded, onToggleExpand, checked, onToggleCheck, onSend, cardProps }) {
  const [viewingPdf, setViewingPdf] = useState(null);

  const staged = !item.stage;
  const pts = cardPts(item);
  const firstFile = (item.files || []).find(f => f.url);
  const isPdf = /\.pdf($|\?)/i.test(firstFile?.url || "");
  const cardSpec = [item.wood_type, item.finish].filter(Boolean).join(" · ");

  return (
    <div className={cn("min-w-0", expanded && "col-span-2")}>
      {/* Tile header — always visible */}
      <div className={cn(
        "flex items-center gap-1.5 px-1.5 py-1 bg-slate-50 border border-slate-200",
        expanded ? "rounded-t-lg" : "rounded-t-lg"
      )}>
        {staged && (
          <Checkbox
            checked={!!checked}
            onCheckedChange={onToggleCheck}
            className="h-3.5 w-3.5 bg-white shadow-sm flex-shrink-0"
            aria-label={`Select ${item.name}`}
          />
        )}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 flex items-center gap-1 text-left"
          title={expanded ? "Collapse card" : "Expand card"}
        >
          <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{TYPE_LABELS[item.type] || "Cabinet"}</span>
        </button>
        {staged && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSend(); }}
            className="flex items-center justify-center w-5 h-5 rounded border border-green-200 bg-white text-green-700 hover:bg-green-50 flex-shrink-0"
            title="Send to Production"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center justify-center w-5 h-5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
          title={expanded ? "Collapse card" : "Expand card"}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded ? (
        <div className="rounded-b-lg ring-1 ring-amber-300">
          <ProductionCard item={item} compact isDragging={false} {...cardProps} />
        </div>
      ) : (
        <div
          onClick={onToggleExpand}
          className="rounded-b-lg border border-t-0 border-slate-200 bg-white px-1.5 py-1 space-y-1 cursor-pointer hover:bg-amber-50/50 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {pts || 0} PTS
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
              staged
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {staged ? (item.completed_date ? "Complete" : "Staged") : STAGE_LABELS[item.stage] || item.stage}
            </span>
            {item.is_urgent && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                Urgent
              </span>
            )}
          </div>

          {firstFile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPdf) setViewingPdf(firstFile);
                else window.open(firstFile.url, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1 w-full min-w-0 text-amber-700 hover:text-amber-800 hover:underline"
              title={firstFile.name}
            >
              <FileText className="w-3 h-3 flex-shrink-0 text-red-500" />
              <span className="text-[10px] truncate">{firstFile.name}</span>
            </button>
          )}

          {cardSpec && (
            <p className="text-[10px] text-slate-400 truncate" title={cardSpec}>{cardSpec}</p>
          )}
        </div>
      )}

      {viewingPdf && <PdfFileDialog file={viewingPdf} onClose={() => setViewingPdf(null)} />}
    </div>
  );
}