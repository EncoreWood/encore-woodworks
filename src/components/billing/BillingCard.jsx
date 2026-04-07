import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Zap, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";

const STATUS_STYLES = {
  Current: "bg-green-100 text-green-800",
  Behind: "bg-red-100 text-red-800",
  "On Hold": "bg-gray-100 text-gray-700",
  "Paid Off": "bg-blue-100 text-blue-800",
};

const PRIORITY_STYLES = {
  Normal: "bg-slate-100 text-slate-600",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

function fmt(n) {
  if (n == null || n === "") return "—";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BillingCard({ item, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const showProgress = item.category === "Supplier Debt" || item.category === "Loan";
  const pct = showProgress && item.original_amount > 0
    ? Math.min(100, Math.round((item.amount_paid / item.original_amount) * 100))
    : null;

  const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && item.status !== "Paid Off";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.Current}`}>
              {item.status}
            </span>
            {item.priority !== "Normal" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[item.priority]}`}>
                {item.priority}
              </span>
            )}
            {item.auto_pay && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                <Zap className="w-3 h-3" /> Auto-Pay
              </span>
            )}
          </div>

          {/* Due date */}
          {item.due_date && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              Due {format(parseISO(item.due_date), "MMM d, yyyy")}
              {isOverdue && " — Overdue"}
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="shrink-0 h-7 w-7 p-0">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Amounts */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-slate-500 text-xs">Monthly</span>
          <div className="font-semibold text-slate-800">{fmt(item.monthly_amount)}</div>
        </div>
        <div>
          <span className="text-slate-500 text-xs">Total Owed</span>
          <div className="font-semibold text-slate-800">{fmt(item.total_owed)}</div>
        </div>
        {showProgress && item.original_amount > 0 && (
          <div>
            <span className="text-slate-500 text-xs">Original</span>
            <div className="font-semibold text-slate-800">{fmt(item.original_amount)}</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Paid off</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      {/* Expandable plan/notes */}
      {showProgress && (item.plan_notes || item.vendor_contact) && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:text-amber-900 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Plan / Notes
          </button>
          {expanded && (
            <div className="mt-2 text-xs text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
              {item.vendor_contact && (
                <div><span className="font-medium text-slate-700">Contact: </span>{item.vendor_contact}</div>
              )}
              {item.plan_notes && <div className="whitespace-pre-wrap">{item.plan_notes}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}