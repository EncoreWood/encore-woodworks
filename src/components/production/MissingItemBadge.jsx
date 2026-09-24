import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";
import { STATUS_CONFIG, STATUS_FLOW, DONE_STATUSES } from "./missingItemStatusConfig";
import { getSizeBreakdown } from "./missingItemSizes";

export default function MissingItemBadge({ itemId, currentUser, onSendBackToProduction }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(null); // id of item being updated
  const queryClient = useQueryClient();
  const dotRef = useRef(null);
  const [popupPos, setPopupPos] = useState(null);

  const POPUP_W = 320; // w-80

  const [sendStage, setSendStage] = useState("cut");
  const SEND_STAGES = [
    { id: "cut", label: "1. Cut" },
    { id: "face_frame", label: "2. Face Frame" },
    { id: "spray", label: "3. Spray" },
    { id: "build", label: "4. Build" },
  ];

  const openPopup = () => {
    // Position in the viewport (fixed) so scrollable containers can't clip it,
    // clamped so it never runs off the left or right edge of the screen
    const rect = dotRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_W - 8));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 100);
      setPopupPos({ left, top });
    }
    setOpen(true);
  };

  const { data: allMissing = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
    staleTime: 30_000,
  });

  const cardReports = allMissing.filter(m => m.production_item_id === itemId && !m.archived);
  const activeReports = cardReports.filter(m => !DONE_STATUSES.includes(m.status));

  if (activeReports.length === 0) return null;

  const hasOpen = activeReports.some(m => m.status === "Open");
  const dotColor = hasOpen ? "bg-red-500 border-red-600" : "bg-yellow-400 border-yellow-500";
  const isAdmin = currentUser?.role === "admin";

  const callUpdateStatus = async (reportId, status) => {
    setUpdating(reportId);
    try {
      const { data } = await base44.functions.invoke("updateMissingItemStatus", {
        missing_item_id: reportId,
        status,
      });
      if (data?.result === "updated") {
        toast.success(`Marked as ${status} ✓`);
        queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      } else {
        toast.error(data?.error || "Update failed");
      }
    } catch (err) {
      console.error("Failed to update missing item status:", err);
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        ref={dotRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openPopup(); }}
        className={`w-4 h-4 rounded-full border-2 ${dotColor} shadow-sm flex-shrink-0`}
        title={`${activeReports.length} missing item report${activeReports.length !== 1 ? "s" : ""}`}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={popupPos ? { left: popupPos.left, top: popupPos.top } : { left: 8, top: 60 }}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">⚠️ Missing Items ({activeReports.length})</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
            {onSendBackToProduction && (
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Select value={sendStage} onValueChange={setSendStage}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEND_STAGES.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => { onSendBackToProduction(sendStage); setOpen(false); }}
                  className="text-xs font-semibold px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                >
                  ↩ Send back
                </button>
              </div>
            )}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {activeReports.map(report => {
                const confirmed = JSON.parse(report.confirmed_by || "[]");
                return (
                  <div key={report.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(STATUS_CONFIG[report.status] || STATUS_CONFIG.Open).color}`}>
                        {(STATUS_CONFIG[report.status] || STATUS_CONFIG.Open).label}
                      </span>
                      {report.room_name && <span className="text-xs text-slate-500">{report.room_name}</span>}
                      {report.cabinet_name && <span className="text-xs text-slate-400">· {report.cabinet_name}</span>}
                      {!getSizeBreakdown(report) && (report.width || report.length) && (
                        <span className="text-xs text-slate-500">· {[report.width, report.length].filter(Boolean).join(" × ")}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {report.item_description}
                      {/* Per-size records already carry sizes inside item_description (e.g. "1@ 20 x 5 13/16 & 2@ 20 x 8 13/16") */}
                      {!getSizeBreakdown(report) && (
                        <>
                          {report.quantity != null && (
                            <span className="font-semibold text-slate-600"> ×{report.quantity}</span>
                          )}
                          {(report.width || report.length) && (
                            <span className="text-slate-500">
                              {" - "}
                              {[report.width, report.length].filter(Boolean).map(d => `${d}"`).join(" x ")}
                            </span>
                          )}
                        </>
                      )}
                    </p>
                    {report.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Reported by <span className="font-medium text-slate-600">{report.reported_by}</span>
                      {report.reported_at && ` on ${format(new Date(report.reported_at), "MMM d")}`}
                    </p>
                    {confirmed.length > 0 && (
                      <p className="text-xs text-blue-600 mt-0.5">✓ Also noticed: {confirmed.join(", ")}</p>
                    )}
                    {report.ordered_by && (
                      <p className="text-xs text-yellow-700 mt-0.5">Ordered by {report.ordered_by} on {report.ordered_date}</p>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 mt-2 flex-wrap items-center">
                        <Select value={report.status} onValueChange={(v) => callUpdateStatus(report.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-32" disabled={updating === report.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_FLOW.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          disabled={updating === report.id}
                          onClick={() => callUpdateStatus(report.id, "Completed")}
                          className="text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          ✅ Complete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}