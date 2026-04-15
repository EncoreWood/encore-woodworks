import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const STATUS_COLORS = {
  Submitted: "bg-blue-100 text-blue-700",
  "In Review": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
};

export default function MistakeReportsTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selected, setSelected] = useState(null);

  const { data: reports = [] } = useQuery({
    queryKey: ["mistake_reports"],
    queryFn: () => base44.entities.MistakeReport.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MistakeReport.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mistake_reports"] });
      if (selected) setSelected(prev => ({ ...prev, status: selected._pendingStatus }));
    },
  });

  const filtered = reports.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterFrom && r.created_date < filterFrom) return false;
    if (filterTo && r.created_date > filterTo + "T23:59:59") return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="In Review">In Review</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">From</label>
          <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-9 w-36" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">To</label>
          <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-9 w-36" />
        </div>
        <span className="text-sm text-slate-500 self-end pb-1">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
              {["Date", "Submitted By", "Mistake Of", "Mistake Type", "Stem", "Followed SOP", "Pick Up", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No reports found.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-slate-100 hover:bg-amber-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">{r.created_date ? format(new Date(r.created_date), "MM/dd/yy") : "—"}</td>
                <td className="px-4 py-3 font-medium">{r.submitted_by}</td>
                <td className="px-4 py-3">{r.mistake_of}</td>
                <td className="px-4 py-3">{r.mistake_type}</td>
                <td className="px-4 py-3">{r.stem_of_mistake}</td>
                <td className="px-4 py-3">{r.followed_sop}</td>
                <td className="px-4 py-3">{r.pickup_required || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Mistake Report</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Status:</span>
                  <Select
                    value={selected.status || "Submitted"}
                    onValueChange={(val) => {
                      setSelected(prev => ({ ...prev, status: val, _pendingStatus: val }));
                      updateMutation.mutate({ id: selected.id, status: val });
                    }}
                  >
                    <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {[
                    ["Submitted By", selected.submitted_by],
                    ["Project", selected.project_name || "—"],
                    ["Date", selected.created_date ? format(new Date(selected.created_date), "MM/dd/yyyy h:mm a") : "—"],
                    ["Mistake Of", selected.mistake_of],
                    ["Mistake Type", selected.mistake_type],
                    ["Origin / Stem", selected.stem_of_mistake],
                    ["Followed SOP", selected.followed_sop],
                    ["SOP Task Created", selected.sop_task_created ? "Yes" : "No"],
                    ["Pick Up Required", selected.pickup_required || "—"],
                    ...(selected.pickup_required === "Yes" ? [
                      ["Row / Col", `${selected.pickup_row || "—"} / ${selected.pickup_col || "—"}`],
                      ["Size", selected.pickup_size || "—"],
                      ["Species", selected.pickup_species || "—"],
                      ["Finish", selected.pickup_finish || "—"],
                      ["Notes", selected.pickup_notes || "—"],
                    ] : []),
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-start gap-2 px-4 py-2.5">
                      <span className="text-xs font-semibold text-slate-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>

                {selected.photos?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`photo ${i+1}`} className="rounded-lg aspect-square object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}