import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, PencilLine, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function EditRequestsReviewCard({ requests, onReview, onFixTime }) {
  const [showResolved, setShowResolved] = useState(false);
  if (!requests.length) return null;

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending")
    .sort((a, b) => (b.reviewed_at || "").localeCompare(a.reviewed_at || ""))
    .slice(0, 10);

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PencilLine className="w-4 h-4 text-amber-600" /> Time Edit Requests
          {pending.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.length === 0 && <p className="text-sm text-slate-400">No pending requests</p>}
        {pending.map(req => (
          <div key={req.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {req.employee_name} · {format(new Date(req.date + "T00:00:00"), "EEE, MMM d")}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{req.reason}</p>
                {req.requested_at && (
                  <p className="text-xs text-slate-400 mt-1">
                    Requested {format(new Date(req.requested_at), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => onFixTime(req)}>
                  <PencilLine className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => onReview(req, "approved")}>
                  <Check className="w-3.5 h-3.5" /> Accept
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-100"
                  onClick={() => onReview(req, "rejected")}>
                  <X className="w-3.5 h-3.5" /> Decline
                </Button>
              </div>
            </div>
          </div>
        ))}
        {resolved.length > 0 && (
          <div>
            <button onClick={() => setShowResolved(s => !s)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mt-2">
              {showResolved ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Reviewed ({resolved.length})
            </button>
            {showResolved && (
              <div className="mt-2 space-y-1.5">
                {resolved.map(req => (
                  <div key={req.id} className="flex items-start justify-between gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">{req.employee_name}</span>
                      <span className="text-slate-400"> · {format(new Date(req.date + "T00:00:00"), "MMM d")}</span>
                      <p className="text-xs text-slate-500">{req.reason}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      req.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {req.status === "approved" ? "Accepted" : "Declined"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}