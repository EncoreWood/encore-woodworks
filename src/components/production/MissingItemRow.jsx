import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Clock, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { STATUS_CONFIG, STATUS_FLOW, DONE_STATUSES } from "./missingItemStatusConfig";
import { getSizeBreakdown, legacySizeSummary, sizeSummary } from "./missingItemSizes";
import SendToProductionDialog from "./SendToProductionDialog";

const STAGE_LABELS = { cut: "Cut", face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete", on_hold: "On Hold" };

// The one obvious next action per status (~90% of updates are a single tap)
const PRIMARY_ACTION = {
  Open:            { label: "Mark Ordered",   status: "Ordered",   cls: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" },
  Ordered:         { label: "Mark Received",  status: "Received",  cls: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600" },
  "In Production": { label: "Mark Ready",     status: "Ready",     cls: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600" },
  Ready:           { label: "Mark Completed", status: "Completed", cls: "bg-green-600 hover:bg-green-700 text-white border-green-600" },
};

export default function MissingItemRow({ item, card, projects, isAdmin, updating, onStatus, onSendToProduction, onBackToOpen, sending, onViewCard, showProject }) {
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const confirmed = JSON.parse(item.confirmed_by || "[]");

  // Wood species / finish for this item's room, pulled from the project's room selections
  const room = projects?.find(p => p.id === item.project_id)?.rooms?.find(r => r.room_name === item.room_name);
  const joinVals = (list, key) => (Array.isArray(list) ? list.map(s => s?.[key]).filter(Boolean).join(", ") : "") || null;
  const species = joinVals(room?.species_finish_selections, "wood_species")
    || joinVals(room?.wood_species_selections, "value")
    || room?.wood_species || null;
  const finish = joinVals(room?.species_finish_selections, "finish")
    || joinVals(room?.finish_selections, "value")
    || room?.finish || null;
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
  const isDone = DONE_STATUSES.includes(item.status);

  // Stale flag: sitting in "Open" (not yet ordered) for more than 3 days
  const ageMs = item.reported_at ? Date.now() - new Date(item.reported_at).getTime() : 0;
  const isStale = item.status === "Open" && ageMs > 3 * 24 * 60 * 60 * 1000;

  const primary = PRIMARY_ACTION[item.status];
  // "Received" advances by sending the card into production (stage picker)
  const receivedPrimary = item.status === "Received" && item.production_item_id;

  return (
    <div className={`px-5 py-3 flex items-start gap-4 ${isDone ? "opacity-50" : ""}`}>
      <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800">{item.item_description}</span>
          <Badge className={`text-xs border-0 ${cfg.color}`}>{cfg.label}</Badge>
          {isStale && (
            <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] px-1.5 py-0">⏳ 3+ days</Badge>
          )}
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 mb-1">
          {showProject && (
            <span className="font-medium text-slate-700">
              {item.project_name || "No Job"}
              {item.room_name ? <span className="text-slate-400"> · {item.room_name}</span> : null}
            </span>
          )}
          {item.production_item_name && <span className="font-medium text-slate-700">{item.production_item_name}</span>}
          {item.production_item_id && (
            <button
              type="button"
              onClick={() => onViewCard?.(item.production_item_id)}
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
            >
              View Card
            </button>
          )}
          {item.production_item_id && card && (
            card.stage === "on_hold" ? (
              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-2 py-0">⏸ On Hold</Badge>
            ) : card.stage && card.stage !== "complete" ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2 py-0">🏭 In Production: {STAGE_LABELS[card.stage] || card.stage.replace(/_/g, " ")}</Badge>
            ) : !card.stage ? (
              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-2 py-0">In Job Packet</Badge>
            ) : null
          )}
          {item.cabinet_name && <span>· {item.cabinet_name}</span>}
          {getSizeBreakdown(item)
            ? <span className="text-slate-600">· {sizeSummary(item)}</span>
            : legacySizeSummary(item) && <span className="text-slate-600">· {item.quantity != null ? `Qty ${item.quantity}: ` : ""}{legacySizeSummary(item)}</span>}
        </div>
        {(species || finish) && (
          <div className="text-xs text-slate-500 mb-1">
            {species && <span>{species}{finish ? <span className="text-slate-400"> · </span> : null}</span>}
            {finish && <span>{finish}</span>}
          </div>
        )}
        {item.description && (
          <p className="text-xs text-slate-400 mb-1">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span className={`flex items-center gap-1 ${isStale ? "text-amber-600 font-medium" : ""}`}>
            <Clock className="w-3 h-3" />
            {item.reported_at ? format(new Date(item.reported_at), "MMM d, h:mm a") : "—"}
            {" "}by <span className="font-medium text-slate-600 ml-0.5">{item.reported_by}</span>
          </span>
          {confirmed.length > 0 && (
            <span className="text-blue-600">👁 {confirmed.length} confirmed</span>
          )}
          {item.ordered_by && (
            <span className="text-yellow-700">📦 Ordered by {item.ordered_by} on {item.ordered_date}</span>
          )}
          {item.resolved_date && (
            <span className="text-green-700">✅ Completed {item.resolved_date}</span>
          )}
        </div>
      </div>

      {isAdmin && !isDone && (
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {receivedPrimary ? (
            <>
              <button
                disabled={sending === item.id}
                onClick={() => setStageDialogOpen(true)}
                className="text-xs px-2.5 py-1 bg-blue-600 border border-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                title="Send this item's production card into a production stage"
              >
                🏭 To Production
              </button>
              <SendToProductionDialog
                open={stageDialogOpen}
                items={[item]}
                onConfirm={(stage) => { setStageDialogOpen(false); onSendToProduction(item, stage); }}
                onClose={() => setStageDialogOpen(false)}
              />
            </>
          ) : primary ? (
            <button
              disabled={updating === item.id}
              onClick={() => onStatus(item.id, primary.status)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 border ${primary.cls}`}
            >
              {primary.label}
            </button>
          ) : null}
          {/* Secondary: any-status dropdown for edge cases */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-xs px-1.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="Set any status">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_FLOW.map(s => (
                <DropdownMenuItem key={s} onClick={() => onStatus(item.id, s)} className={`text-xs ${s === item.status ? "font-bold" : ""}`}>
                  {s === item.status ? `✓ ${s}` : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {item.status !== "Open" && (
            <button
              disabled={updating === item.id}
              onClick={() => onBackToOpen?.(item)}
              className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Take the card out of production (On Hold) and set this item back to Open"
            >
              ↩ Open
            </button>
          )}
        </div>
      )}
    </div>
  );
}