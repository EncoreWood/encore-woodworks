import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  open:     { label: "Open",     color: "bg-red-100 text-red-700" },
  ordered:  { label: "Ordered",  color: "bg-yellow-100 text-yellow-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
};

export default function ProductionMissingItemsTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("open");
  const [filterProject, setFilterProject] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const { data: missingItems = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MissingItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missingItems"] }),
  });

  const isAdmin = currentUser?.role === "admin";

  const handleSetOrdered = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: {
        status: "ordered",
        ordered_by: currentUser?.full_name || currentUser?.email,
        ordered_date: format(new Date(), "yyyy-MM-dd"),
      }
    });
  };

  const handleSetResolved = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: {
        status: "resolved",
        resolved_date: format(new Date(), "yyyy-MM-dd"),
      }
    });
  };

  const visible = missingItems.filter(i => {
    if (!showResolved && i.status === "resolved") return false;
    if (i.archived) return false;
    return true;
  });

  const filtered = visible.filter(item => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterProject !== "all" && item.project_id !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(item.item_description || "").toLowerCase().includes(q) &&
          !(item.description || "").toLowerCase().includes(q) &&
          !(item.production_item_name || "").toLowerCase().includes(q) &&
          !(item.project_name || "").toLowerCase().includes(q) &&
          !(item.room_name || "").toLowerCase().includes(q) &&
          !(item.cabinet_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openCount = missingItems.filter(i => !i.archived && i.status === "open").length;
  const orderedCount = missingItems.filter(i => !i.archived && i.status === "ordered").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-bold text-red-700">{openCount}</span>
          <span className="text-xs text-red-600">Open</span>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-bold text-yellow-800">{orderedCount}</span>
          <span className="text-xs text-yellow-700">Ordered</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setShowResolved(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showResolved ? "bg-green-100 border-green-300 text-green-800" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
        >
          {showResolved ? "Hide Resolved" : "Show Resolved"}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No missing items</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(item => {
              const confirmed = JSON.parse(item.confirmed_by || "[]");
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
              return (
                <div key={item.id} className={`px-5 py-3.5 flex items-start gap-4 ${item.status === "resolved" ? "opacity-50" : ""}`}>
                  {/* Status dot */}
                  <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${item.status === "open" ? "bg-red-500" : item.status === "ordered" ? "bg-yellow-400" : "bg-green-500"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">{item.item_description || item.description}</span>
                      <Badge className={`text-xs border-0 ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-2 mb-1">
                      {item.production_item_name && <span className="font-medium text-slate-700">{item.production_item_name}</span>}
                      {item.room_name && <span>· {item.room_name}</span>}
                      {item.cabinet_name && <span>· {item.cabinet_name}</span>}
                      {item.project_name && <span className="text-slate-400">· {item.project_name}</span>}
                    </div>
                    {item.description && item.item_description && (
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

                  {isAdmin && item.status !== "resolved" && (
                    <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                      {item.status === "open" && (
                        <button
                          onClick={() => handleSetOrdered(item)}
                          className="text-xs px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                        >
                          📦 Ordered
                        </button>
                      )}
                      <button
                        onClick={() => handleSetResolved(item)}
                        className="text-xs px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        ✅ Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}