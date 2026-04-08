import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, Archive, CheckCircle2, Clock, Wrench } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MISSING_ITEM_TYPE_LABELS = {
  door: "Door",
  drawer_front: "Drawer Front",
  hinges: "Hinges",
  glides: "Glides",
  hardware: "Hardware",
  drawer_box: "Drawer Box",
  other: "Other",
};

const STAGE_COLORS = {
  cut: "bg-orange-100 text-orange-700",
  face_frame: "bg-blue-100 text-blue-700",
  spray: "bg-purple-100 text-purple-700",
  build: "bg-amber-100 text-amber-700",
  complete: "bg-green-100 text-green-700",
  on_hold: "bg-red-100 text-red-700",
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Wrench },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

export default function MissingItemsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MissingItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missingItems"] }),
  });

  const cycleStatus = (item) => {
    const order = ["open", "in_progress", "resolved"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    updateMutation.mutate({ id: item.id, data: { status: next } });
  };

  const visible = missingItems.filter(i => showArchived ? i.archived : !i.archived);

  const filtered = visible.filter(item => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterProject !== "all" && item.project_id !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.production_item_name?.toLowerCase().includes(q) &&
          !item.project_name?.toLowerCase().includes(q) &&
          !item.room_name?.toLowerCase().includes(q) &&
          !item.cabinet_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = filtered.reduce((acc, item) => {
    const key = item.project_id || "unassigned";
    if (!acc[key]) acc[key] = { projectName: item.project_name || "Unassigned", items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  const openCount = missingItems.filter(i => !i.archived && i.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search missing items..." className="pl-9 h-9" />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowArchived(v => !v)} className="gap-2 h-9">
          <Archive className="w-4 h-4" />
          {showArchived ? "Active" : "Archived"}
        </Button>
        {openCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-red-200">{openCount} open</Badge>
        )}
      </div>

      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No missing items found</p>
          <p className="text-sm mt-1">Report missing items from the Production tab</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([projectId, group]) => {
            const proj = projects.find(p => p.id === projectId);
            const cardColor = proj?.card_color;
            return (
              <div key={projectId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="px-5 py-3 border-b border-slate-100 flex items-center gap-3"
                  style={cardColor ? { borderLeft: `4px solid ${cardColor}`, backgroundColor: cardColor + "15" } : { borderLeft: "4px solid #94a3b8" }}
                >
                  <h2 className="font-semibold text-slate-900">{group.projectName}</h2>
                  <Badge variant="outline" className="text-xs">{group.items.filter(i => i.status !== "resolved").length} open</Badge>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.items.map(item => {
                    const StatusIcon = STATUS_CONFIG[item.status]?.icon || AlertCircle;
                    return (
                      <div key={item.id} className={cn("px-5 py-3 flex items-start gap-3", item.status === "resolved" && "opacity-50")}>
                        <button onClick={() => cycleStatus(item)} title="Click to advance status" className="mt-0.5">
                          <StatusIcon className={cn("w-5 h-5 flex-shrink-0", STATUS_CONFIG[item.status]?.icon === CheckCircle2 ? "text-emerald-500" : "text-slate-400")} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-sm font-semibold", item.status === "resolved" && "line-through text-slate-500")}>
                              {item.production_item_name}
                            </span>
                            {item.cabinet_name && (
                              <span className="text-xs text-slate-500 font-medium">· {item.cabinet_name}</span>
                            )}
                            {item.room_name && (
                              <span className="text-xs text-slate-400">· {item.room_name}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {item.missing_item_type && (
                              <Badge className="bg-red-100 text-red-700 text-xs border-0">
                                {MISSING_ITEM_TYPE_LABELS[item.missing_item_type] || item.missing_item_type}
                              </Badge>
                            )}
                            {item.production_stage && (
                              <Badge className={cn("text-xs border-0", STAGE_COLORS[item.production_stage] || "bg-slate-100 text-slate-600")}>
                                {item.production_stage.replace(/_/g, " ")}
                              </Badge>
                            )}
                            <Badge className={cn("text-xs border-0", STATUS_CONFIG[item.status]?.color)}>
                              {STATUS_CONFIG[item.status]?.label}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.reported_at ? format(new Date(item.reported_at), "MMM d, yyyy h:mm a") : "—"}
                            </span>
                            <span>by <span className="font-medium text-slate-600">{item.reported_by}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          {!item.archived && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" title="Archive"
                              onClick={() => updateMutation.mutate({ id: item.id, data: { archived: true, status: "resolved" } })}>
                              <Archive className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => { if (confirm("Delete this missing item?")) deleteMutation.mutate(item.id); }}>
                            <span className="text-xs">✕</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}