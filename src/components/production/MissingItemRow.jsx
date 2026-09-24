import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { STATUS_CONFIG, STATUS_FLOW, DONE_STATUSES } from "./missingItemStatusConfig";
import { getSizeBreakdown, sizeSummary } from "./missingItemSizes";

const STAGE_LABELS = { cut: "Cut", face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete", on_hold: "On Hold" };

const PRODUCTION_STAGES = [
  { id: "cut", label: "Cut" },
  { id: "face_frame", label: "Face Frame" },
  { id: "spray", label: "Spray" },
  { id: "build", label: "Build" },
];

export default function MissingItemRow({ item, card, isAdmin, updating, onStatus, onSendToProduction, sending, onViewCard }) {
  const [sendStage, setSendStage] = useState("cut");
  const confirmed = JSON.parse(item.confirmed_by || "[]");
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
  const isDone = DONE_STATUSES.includes(item.status);
  return (
    <div className={`px-5 py-3 flex items-start gap-4 ${isDone ? "opacity-50" : ""}`}>
      <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800">{item.item_description}</span>
          <Badge className={`text-xs border-0 ${cfg.color}`}>{cfg.label}</Badge>
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 mb-1">
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
            card.stage ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2 py-0">🏭 In Production: {STAGE_LABELS[card.stage] || card.stage.replace(/_/g, " ")}</Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-2 py-0">In Job Packet</Badge>
            )
          )}
          {item.cabinet_name && <span>· {item.cabinet_name}</span>}
          {getSizeBreakdown(item)
            ? <span className="text-slate-600">· {sizeSummary(item)}</span>
            : (item.width || item.length) && <span className="text-slate-600">· {[item.width, item.length].filter(Boolean).join(" × ")}</span>}
        </div>
        {item.description && (
          <p className="text-xs text-slate-400 mb-1">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
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
        <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 mt-0.5">
          <Select value={item.status} onValueChange={(v) => onStatus(item.id, v)}>
            <SelectTrigger className="h-7 w-[136px] text-xs" disabled={updating === item.id}>
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FLOW.map(s => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.production_item_id && (
            <>
              <Select value={sendStage} onValueChange={setSendStage}>
                <SelectTrigger className="h-7 w-[110px] text-xs" disabled={sending === item.id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STAGES.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                disabled={sending === item.id}
                onClick={() => onSendToProduction(item, sendStage)}
                className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Send this item's production card back into the selected production stage"
              >
                🏭 To Production
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}