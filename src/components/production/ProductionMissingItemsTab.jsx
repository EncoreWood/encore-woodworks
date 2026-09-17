import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { appParams } from "@/lib/app-params";
import MissingItemsGroupedList from "./MissingItemsGroupedList";

const UPDATE_API = "https://vivica-d92c9f97.base44.app/functions/updateMissingItemStatus";

export default function ProductionMissingItemsTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Open");
  const [filterProject, setFilterProject] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState(() => new Set());
  const [expandedRooms, setExpandedRooms] = useState(() => new Set());

  const toggleJob = (job) => setExpandedJobs(prev => {
    const next = new Set(prev);
    next.has(job) ? next.delete(job) : next.add(job);
    return next;
  });
  const toggleRoom = (job, room) => setExpandedRooms(prev => {
    const key = `${job}||${room}`;
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const collapseAll = () => { setExpandedJobs(new Set()); setExpandedRooms(new Set()); };
  const expandAll = () => {
    setExpandedJobs(new Set([...new Set(filtered.map(i => i.project_name || "No Job"))]));
    setExpandedRooms(new Set());
  };

  const { data: missingItems = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 60_000,
  });

  const isAdmin = currentUser?.role === "admin";

  const callUpdateStatus = async (itemId, status) => {
    setUpdating(itemId);
    const token = appParams.token;
    const res = await fetch(UPDATE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ missing_item_id: itemId, status }),
    });
    const data = await res.json();
    setUpdating(null);
    if (data.result === "updated") {
      toast.success(`Marked as ${status} ✓`);
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
    } else {
      toast.error(data.error || "Update failed");
    }
  };

  const visible = missingItems.filter(i => {
    if (i.archived) return false;
    if (!showResolved && i.status === "Resolved") return false;
    return true;
  });

  const filtered = visible.filter(item => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterProject !== "all" && item.project_id !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.item_description || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.production_item_name || "").toLowerCase().includes(q) ||
        (item.project_name || "").toLowerCase().includes(q) ||
        (item.room_name || "").toLowerCase().includes(q) ||
        (item.cabinet_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = missingItems.filter(i => !i.archived && i.status === "Open").length;
  const orderedCount = missingItems.filter(i => !i.archived && i.status === "Ordered").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
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
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
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

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No missing items</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2">
            <button onClick={expandAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">Expand All</button>
            <button onClick={collapseAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1">
              <ChevronsUpDown className="w-3 h-3" /> Collapse All
            </button>
          </div>
          <MissingItemsGroupedList
            items={filtered}
            isAdmin={isAdmin}
            updating={updating}
            onStatus={callUpdateStatus}
            expandedJobs={expandedJobs}
            expandedRooms={expandedRooms}
            onToggleJob={toggleJob}
            onToggleRoom={toggleRoom}
          />
        </>
      )}
    </div>
  );
}