import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { STATUS_CONFIG } from "./missingItemStatusConfig";

export default function MissingItemRow({ item, isAdmin, updating, onStatus }) {
  const confirmed = JSON.parse(item.confirmed_by || "[]");
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
  return (
    <div className={`px-5 py-3 flex items-start gap-4 ${item.status === "Resolved" ? "opacity-50" : ""}`}>
      <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800">{item.item_description}</span>
          <Badge className={`text-xs border-0 ${cfg.color}`}>{cfg.label}</Badge>
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 mb-1">
          {item.production_item_name && <span className="font-medium text-slate-700">{item.production_item_name}</span>}
          {item.cabinet_name && <span>· {item.cabinet_name}</span>}
          {(item.width || item.length) && <span className="text-slate-600">· {[item.width, item.length].filter(Boolean).join(" × ")}</span>}
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
            <span className="text-green-700">✅ Resolved {item.resolved_date}</span>
          )}
        </div>
      </div>

      {isAdmin && item.status !== "Resolved" && (
        <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
          {item.status === "Open" && (
            <button
              disabled={updating === item.id}
              onClick={() => onStatus(item.id, "Ordered")}
              className="text-xs px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              📦 Ordered
            </button>
          )}
          <button
            disabled={updating === item.id}
            onClick={() => onStatus(item.id, "Resolved")}
            className="text-xs px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            ✅ Resolve
          </button>
        </div>
      )}
    </div>
  );
}