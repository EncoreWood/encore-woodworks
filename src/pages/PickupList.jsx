import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CheckCircle2, AlertCircle, RefreshCw, Search, ExternalLink, Archive, Factory } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PickupItemForm from "../components/pickup/PickupItemForm";
import { cn } from "@/lib/utils";

const typeConfig = {
  missing: { label: "Missing", color: "bg-red-100 text-red-700", icon: AlertCircle },
  reorder: { label: "Reorder", color: "bg-amber-100 text-amber-700", icon: RefreshCw },
  task: { label: "Task", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 }
};

const statusConfig = {
  open: { label: "Open", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700" }
};

const productionStageColors = {
  face_frame: { label: "Face Frame", color: "bg-blue-100 text-blue-700 border-blue-300" },
  spray: { label: "Spray", color: "bg-purple-100 text-purple-700 border-purple-300" },
  build: { label: "Build", color: "bg-amber-100 text-amber-700 border-amber-300" },
  complete: { label: "Complete", color: "bg-green-100 text-green-700 border-green-300" },
  on_hold: { label: "On Hold", color: "bg-red-100 text-red-700 border-red-300" },
  job_info: { label: "Job Info", color: "bg-slate-100 text-slate-600 border-slate-300" }
};

const priorityConfig = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700"
};

export default function PickupList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterProjectId, setFilterProjectId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const { data: allPickupItems = [] } = useQuery({
    queryKey: ["pickupItems"],
    queryFn: () => base44.entities.PickupItem.list("-created_date")
  });

  const [showArchived, setShowArchived] = useState(false);
  const pickupItems = allPickupItems.filter(i => showArchived ? i.archived : !i.archived);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { linkToProduction, productionStage, ...itemData } = data;
      const created = await base44.entities.PickupItem.create(itemData);
      if (linkToProduction) {
        const prodItem = await base44.entities.ProductionItem.create({
          name: itemData.title,
          type: "pickup",
          stage: productionStage || "face_frame",
          project_id: itemData.project_id,
          project_name: itemData.project_name,
          room_name: itemData.room_name || "",
          notes: itemData.notes || "",
          files: [],
          pickup_item_id: created.id
        });
        // Link back: store production_item_id and initial stage on pickup item
        await base44.entities.PickupItem.update(created.id, {
          production_item_id: prodItem.id,
          production_stage: productionStage || "face_frame"
        });
        queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PickupItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
      setShowForm(false);
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PickupItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupItems"] })
  });

  const handleStatusCycle = (item) => {
    const order = ["open", "in_progress", "resolved"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    updateMutation.mutate({ id: item.id, data: { status: next } });
  };

  const filtered = pickupItems.filter(item => {
    if (filterProjectId !== "all" && item.project_id !== filterProjectId) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterType !== "all" && item.type !== filterType) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
        !item.project_name?.toLowerCase().includes(search.toLowerCase()) &&
        !item.room_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by project
  const grouped = filtered.reduce((acc, item) => {
    const key = item.project_id || "unassigned";
    if (!acc[key]) acc[key] = { projectName: item.project_name || "Unassigned", items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  const openCount = pickupItems.filter(i => i.status === "open").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pick Up List</h1>
            <p className="text-slate-500 mt-1">
              Track missing items, reorders, and tasks per project
              {openCount > 0 && <span className="ml-2 text-amber-600 font-medium">• {openCount} open</span>}
            </p>
          </div>
          <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="reorder">Reorder</SelectItem>
              <SelectItem value="task">Task</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grouped by Project */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No pickup items found</p>
            <p className="text-sm mt-1">Add items from here, project cards, or the production board</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([projectId, group]) => {
              const project = projects.find(p => p.id === projectId);
              const cardColor = project?.card_color;
              return (
                <div key={projectId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
                    style={cardColor ? { borderLeft: `4px solid ${cardColor}`, backgroundColor: cardColor + "15" } : { borderLeft: "4px solid #94a3b8" }}
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-slate-900">{group.projectName}</h2>
                      <Badge variant="outline" className="text-xs">
                        {group.items.filter(i => i.status !== "resolved").length} open
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-amber-600 hover:text-amber-700 h-7"
                      onClick={() => {
                        setEditingItem({ project_id: projectId, project_name: group.projectName, source: "manual" });
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                  </div>

                  {/* Group by room */}
                  {(() => {
                    const byRoom = group.items.reduce((acc, item) => {
                      const room = item.room_name || "General";
                      if (!acc[room]) acc[room] = [];
                      acc[room].push(item);
                      return acc;
                    }, {});
                    return Object.entries(byRoom).map(([room, roomItems]) => (
                      <div key={room}>
                        <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{room}</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {roomItems.map(item => {
                            const TypeIcon = typeConfig[item.type]?.icon || AlertCircle;
                            return (
                              <div
                                key={item.id}
                                className={cn("px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors", item.status === "resolved" && "opacity-50")}
                              >
                                <button onClick={() => handleStatusCycle(item)} title="Click to advance status">
                                  <TypeIcon className={cn("w-5 h-5 flex-shrink-0", item.status === "resolved" ? "text-emerald-500" : "text-slate-400")} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm font-medium text-slate-900", item.status === "resolved" && "line-through")}>{item.title}</p>
                                  {item.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{item.notes}</p>}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge className={cn("text-xs border-0", typeConfig[item.type]?.color)}>{typeConfig[item.type]?.label}</Badge>
                                  <Badge className={cn("text-xs border-0", priorityConfig[item.priority])}>{item.priority}</Badge>
                                  <Badge className={cn("text-xs border-0", statusConfig[item.status]?.color)}>
                                    {statusConfig[item.status]?.label}
                                  </Badge>
                                  {item.production_item_id && (
                                    <Link
                                      to={createPageUrl("ShopProduction")}
                                      title="View in Production"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 gap-1 cursor-pointer">
                                        <ExternalLink className="w-2.5 h-2.5" />Production
                                      </Badge>
                                    </Link>
                                  )}
                                  {item.source && item.source !== "manual" && !item.production_item_id && (
                                    <Badge variant="outline" className="text-xs text-slate-400">{item.source}</Badge>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingItem(item); setShowForm(true); }}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                    if (confirm("Delete this item?")) deleteMutation.mutate(item.id);
                                  }}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PickupItemForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingItem(null); }}
        onSubmit={(data) => {
          if (editingItem?.id) {
            updateMutation.mutate({ id: editingItem.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={editingItem}
        projectId={editingItem?.project_id || (filterProjectId !== "all" ? filterProjectId : null)}
        projectName={editingItem?.project_name || projects.find(p => p.id === filterProjectId)?.project_name}
        rooms={editingItem?.project_id ? (projects.find(p => p.id === editingItem.project_id)?.rooms || []) : []}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}