import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function MissingItemBadge({ itemId, currentUser }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allMissing = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
    staleTime: 30_000,
  });

  const cardReports = allMissing.filter(m => m.production_item_id === itemId && !m.archived);
  const openReports = cardReports.filter(m => m.status === "open");
  const orderedReports = cardReports.filter(m => m.status === "ordered");
  const activeReports = [...openReports, ...orderedReports];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MissingItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missingItems"] }),
  });

  if (activeReports.length === 0) return null;

  const isAllOrdered = openReports.length === 0 && orderedReports.length > 0;
  const dotColor = isAllOrdered ? "bg-yellow-400 border-yellow-500" : "bg-red-500 border-red-600";

  const handleConfirm = (report) => {
    const existing = JSON.parse(report.confirmed_by || "[]");
    const name = currentUser?.full_name || currentUser?.email || "Unknown";
    if (existing.includes(name)) return;
    updateMutation.mutate({ id: report.id, data: { confirmed_by: JSON.stringify([...existing, name]) } });
  };

  const handleSetOrdered = (report) => {
    updateMutation.mutate({
      id: report.id,
      data: {
        status: "ordered",
        ordered_by: currentUser?.full_name || currentUser?.email,
        ordered_date: format(new Date(), "yyyy-MM-dd"),
      }
    });
  };

  const handleSetResolved = (report) => {
    updateMutation.mutate({
      id: report.id,
      data: {
        status: "resolved",
        resolved_date: format(new Date(), "yyyy-MM-dd"),
      }
    });
  };

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`w-4 h-4 rounded-full border-2 ${dotColor} shadow-sm flex-shrink-0`}
        title={`${activeReports.length} missing item report${activeReports.length !== 1 ? "s" : ""}`}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-5 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">⚠️ Missing Items ({activeReports.length})</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {activeReports.map(report => {
                const confirmed = JSON.parse(report.confirmed_by || "[]");
                const myName = currentUser?.full_name || currentUser?.email || "";
                const alreadyConfirmed = confirmed.includes(myName);
                const isAdmin = currentUser?.role === "admin";
                return (
                  <div key={report.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${report.status === "ordered" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                        {report.status === "ordered" ? "🟡 Ordered" : "🔴 Open"}
                      </span>
                      {report.room_name && <span className="text-xs text-slate-500">{report.room_name}</span>}
                      {report.cabinet_name && <span className="text-xs text-slate-400">· {report.cabinet_name}</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{report.item_description || report.description}</p>
                    {report.description && report.item_description && (
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
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {!alreadyConfirmed && report.reported_by !== myName && (
                        <button
                          onClick={() => handleConfirm(report)}
                          className="text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          👁 I also noticed this
                        </button>
                      )}
                      {isAdmin && report.status === "open" && (
                        <button
                          onClick={() => handleSetOrdered(report)}
                          className="text-xs px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                        >
                          📦 Mark Ordered
                        </button>
                      )}
                      {isAdmin && report.status !== "resolved" && (
                        <button
                          onClick={() => handleSetResolved(report)}
                          className="text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          ✅ Resolve
                        </button>
                      )}
                    </div>
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