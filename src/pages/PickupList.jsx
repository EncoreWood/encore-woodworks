import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, CheckCircle2, AlertCircle, RefreshCw, Search, Archive, Factory, FileText, ChevronDown, ChevronUp, PenLine, PackageX } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PickupItemForm from "../components/pickup/PickupItemForm";
import MissingItemsTab from "../components/pickup/MissingItemsTab";
import { cn } from "@/lib/utils";
import { getPickupCardStyle } from "@/lib/pickupCardStyle";

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

const stageConfig = {
  open:         { label: "Open",          color: "bg-slate-100 text-slate-600 border-slate-300" },
  in_progress:  { label: "In Progress",   color: "bg-amber-100 text-amber-700 border-amber-300" },
  ready_at_shop:{ label: "Ready at Shop", color: "bg-blue-100 text-blue-700 border-blue-300" },
  installers:   { label: "Installers",    color: "bg-purple-100 text-purple-700 border-purple-300" },
  resolved:     { label: "Resolved",      color: "bg-emerald-100 text-emerald-700 border-emerald-300" }
};

const STAGE_ORDER = ["open", "in_progress", "ready_at_shop", "installers", "resolved"];

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
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-700"
};

export default function PickupList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const toggleExpanded = (id) => setExpandedItems(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
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
          pts: itemData.pts || undefined,
          priority: itemData.priority || "medium",
          files: itemData.files || [],
          sketch_url: itemData.sketch_url || null,
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
    mutationFn: async ({ id, data }) => {
      await base44.entities.PickupItem.update(id, data);
      // Sync priority to linked production item if it changed
      if (data.priority !== undefined) {
        const item = allPickupItems.find(i => i.id === id);
        if (item?.production_item_id) {
          await base44.entities.ProductionItem.update(item.production_item_id, { priority: data.priority });
        }
      }
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["pickupItems"] });
      const prev = queryClient.getQueryData(["pickupItems"]);
      queryClient.setQueryData(["pickupItems"], (old = []) =>
        old.map(item => item.id === id ? { ...item, ...data } : item)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["pickupItems"], ctx.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
      setShowForm(false);
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PickupItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["pickupItems"] });
      const prev = queryClient.getQueryData(["pickupItems"]);
      queryClient.setQueryData(["pickupItems"], (old = []) => old.filter(item => item.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["pickupItems"], ctx.prev);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupItems"] })
  });

  const handleStageCycle = (item) => {
    const currentStage = item.stage || "open";
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const nextStage = STAGE_ORDER[(currentIdx + 1) % STAGE_ORDER.length];
    // Sync status field: resolved when stage=resolved, otherwise open/in_progress
    const newStatus = nextStage === "resolved" ? "resolved" : nextStage === "open" ? "open" : "in_progress";
    updateMutation.mutate({ id: item.id, data: { stage: nextStage, status: newStatus } });
  };

  const handleStatusCycle = (item) => {
    const order = ["open", "in_progress", "resolved"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    updateMutation.mutate({ id: item.id, data: { status: next } });
  };

  const filtered = pickupItems.filter(item => {
    if (filterProjectId !== "all" && item.project_id !== filterProjectId) return false;
    if (filterStatus !== "all") {
      const itemStage = item.stage || item.status || "open";
      if (itemStage !== filterStatus) return false;
    }
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

  const archiveMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.PickupItem.update(item.id, { archived: true, status: "resolved" });
      if (item.production_item_id) {
        await base44.entities.ProductionItem.delete(item.production_item_id);
        queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupItems"] })
  });

  const openCount = allPickupItems.filter(i => !i.archived && (i.stage || i.status) !== "resolved").length;

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(v => !v)}
              className="gap-2"
            >
              <Archive className="w-4 h-4" />
              {showArchived ? "Show Active" : "View Archived"}
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pickup">
          <TabsList className="mb-5">
            <TabsTrigger value="pickup" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Pickup List
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex items-center gap-2">
              <PackageX className="w-4 h-4" /> Missing Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="mt-0">

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
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready_at_shop">Ready at Shop</SelectItem>
              <SelectItem value="installers">Installers</SelectItem>
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
                            const hasAttachments = (item.files && item.files.length > 0) || item.sketch_url;
                            const isExpanded = expandedItems.has(item.id);
                            return (
                              <div key={item.id} className={cn("border-b border-slate-50 last:border-0", item.status === "resolved" && "opacity-50")}>
                                <div
                                  className="px-5 py-3 flex items-center gap-3 transition-colors"
                                  style={{ borderLeft: getPickupCardStyle(item.priority).borderLeft || "4px solid transparent", backgroundColor: getPickupCardStyle(item.priority).backgroundColor || undefined }}
                                >
                                  <button onClick={() => handleStageCycle(item)} title="Click to advance stage">
                                   <TypeIcon className={cn("w-5 h-5 flex-shrink-0", (item.stage || item.status) === "resolved" ? "text-emerald-500" : "text-slate-400")} />
                                  </button>
                                  <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={cn("text-sm font-medium text-slate-900", item.status === "resolved" && "line-through")}>{item.title}</p>
                                    {item.pts > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">{item.pts} PTS</span>}
                                  </div>
                                  {item.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{item.notes}</p>}
                                  {hasAttachments && (
                                      <div className="flex items-center gap-2 mt-1">
                                        {item.files?.length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" />{item.files.length} file{item.files.length !== 1 ? "s" : ""}</span>}
                                        {item.sketch_url && <span className="text-xs text-slate-400 flex items-center gap-1"><PenLine className="w-3 h-3" />Sketch</span>}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge className={cn("text-xs border-0", typeConfig[item.type]?.color)}>{typeConfig[item.type]?.label}</Badge>
                                    <Badge className={cn("text-xs font-semibold border-0",
                                      item.priority === "high" ? "bg-red-200 text-red-800" :
                                      item.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-slate-100 text-slate-600"
                                    )}>
                                      {item.priority === "high" ? "🔴 High" : item.priority === "medium" ? "🟡 Medium" : "Low"}
                                    </Badge>
                                    {(() => {
                                      const stg = item.stage || item.status || "open";
                                      const sc = stageConfig[stg] || stageConfig.open;
                                      return (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleStageCycle(item); }}
                                          title="Click to advance stage"
                                          className={cn("text-xs font-semibold border rounded-full px-2 py-0.5 transition-all hover:opacity-80", sc.color)}
                                        >
                                          {sc.label}
                                        </button>
                                      );
                                    })()}
                                    {item.production_item_id && (() => {
                                      const stageInfo = productionStageColors[item.production_stage] || productionStageColors.face_frame;
                                      return (
                                        <Link to={createPageUrl("ShopProduction")} title="View in Production" onClick={(e) => e.stopPropagation()}>
                                          <Badge variant="outline" className={`text-xs gap-1 cursor-pointer hover:opacity-80 ${stageInfo.color}`}>
                                            <Factory className="w-2.5 h-2.5" />
                                            {stageInfo.label}
                                          </Badge>
                                        </Link>
                                      );
                                    })()}
                                    {item.source && item.source !== "manual" && !item.production_item_id && (
                                      <Badge variant="outline" className="text-xs text-slate-400">{item.source}</Badge>
                                    )}
                                    {hasAttachments && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => toggleExpanded(item.id)}>
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </Button>
                                    )}
                                    {!item.archived && (item.stage === "resolved" || item.status === "resolved") && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Archive (resolved)"
                                        onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(item); }}>
                                        <Archive className="w-3 h-3" />
                                      </Button>
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
                                {/* Expanded attachments */}
                                {isExpanded && hasAttachments && (
                                  <div className="px-5 pb-4 space-y-3 bg-slate-50 border-t border-slate-100">
                                    {item.sketch_url && (
                                      <div className="pt-3">
                                        <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><PenLine className="w-3 h-3" /> Sketch</p>
                                        <img src={item.sketch_url} alt="Sketch" className="w-full max-w-xs rounded-lg border border-slate-200 max-h-48 object-contain bg-white" />
                                      </div>
                                    )}
                                    {item.files && item.files.length > 0 && (
                                      <div className="pt-3 space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Files</p>
                                        {item.files.map((file, idx) => {
                                          if (!file.url) return null;
                                          const isImg = file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                          const isPdf = file.url.match(/\.pdf$/i);
                                          if (isImg) return (
                                            <img key={idx} src={file.url} alt={file.name} className="w-full rounded-md border border-slate-200 max-h-48 object-contain bg-white" />
                                          );
                                          return (
                                            <button key={idx}
                                              onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}
                                              className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-800 underline">
                                              <FileText className="w-3 h-3 text-red-500 flex-shrink-0" />
                                              {file.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
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
          </TabsContent>

          <TabsContent value="missing" className="mt-0">
            <MissingItemsTab />
          </TabsContent>
        </Tabs>

      <PickupItemForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingItem(null); }}
        onSubmit={(data) => {
          if (editingItem?.id) {
            const { linkToProduction, productionStage, ...itemData } = data;
            if (editingItem.production_item_id) {
              base44.entities.ProductionItem.update(editingItem.production_item_id, {
                priority: itemData.priority,
                notes: itemData.notes,
                files: itemData.files,
                sketch_url: itemData.sketch_url,
                pts: itemData.pts,
              });
            }
            updateMutation.mutate({ id: editingItem.id, data: itemData });
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
    </div>
  );
}