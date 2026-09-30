import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import MissingItemsGroupedList from "./MissingItemsGroupedList";
import MissingItemCardViewerDialog from "./MissingItemCardViewerDialog";
import { STATUS_CONFIG, STATUS_FLOW, DONE_STATUSES } from "./missingItemStatusConfig";
import { format } from "date-fns";

export default function ProductionMissingItemsTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [sending, setSending] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState(() => new Set());
  const [expandedRooms, setExpandedRooms] = useState(() => new Set());
  const [viewCardId, setViewCardId] = useState(null);

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

  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
  });

  const cardById = useMemo(() => new Map(productionItems.map(p => [p.id, p])), [productionItems]);

  // Auto-sync: when a missing item's production card is actively in the shop
  // (cut / face frame / spray / build), its status should read "In Production"
  // rather than "Ordered"/"Received". When the card reaches the complete stage,
  // the missing item is marked "Completed". Synced once per record.
  const autoSyncedIds = useRef(new Set());
  useEffect(() => {
    const ACTIVE_STAGES = ["cut", "face_frame", "spray", "build"];
    const toSync = missingItems.filter(mi => {
      if (mi.archived || !mi.production_item_id || autoSyncedIds.current.has(mi.id)) return false;
      const cardStage = cardById.get(mi.production_item_id)?.stage;
      if (cardStage === "complete") return !DONE_STATUSES.includes(mi.status);
      return ["Ordered", "Received"].includes(mi.status) && ACTIVE_STAGES.includes(cardStage);
    });
    if (toSync.length === 0) return;
    toSync.forEach(mi => autoSyncedIds.current.add(mi.id));
    (async () => {
      let updated = 0;
      for (const mi of toSync) {
        const cardStage = cardById.get(mi.production_item_id)?.stage;
        const newStatus = cardStage === "complete" ? "Completed" : "In Production";
        try {
          await base44.entities.MissingItem.update(mi.id, {
            status: newStatus,
            ...(newStatus === "Completed" ? { resolved_date: format(new Date(), "yyyy-MM-dd") } : {}),
          });
          updated++;
        } catch (err) {
          console.error("Auto-sync missing item status failed:", err);
          autoSyncedIds.current.delete(mi.id);
        }
      }
      if (updated > 0) queryClient.invalidateQueries({ queryKey: ["missingItems"] });
    })();
  }, [missingItems, cardById, queryClient]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 60_000,
  });

  const isAdmin = currentUser?.role === "admin";

  const callUpdateStatus = async (itemId, status) => {
    setUpdating(itemId);
    try {
      const { data } = await base44.functions.invoke("updateMissingItemStatus", {
        missing_item_id: itemId,
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

  // Status select handler: picking "Open" pulls the card out of production (On Hold)
  const handleStatus = (itemId, status) => {
    if (status === "Open") {
      const item = missingItems.find(i => i.id === itemId);
      if (item) { sendBackToOpen(item); return; }
    }
    callUpdateStatus(itemId, status);
  };

  // Send a card out of production: card goes to On Hold, item goes back to Open
  const sendBackToOpen = async (item) => {
    setUpdating(item.id);
    try {
      await base44.entities.MissingItem.update(item.id, { status: "Open", resolved_date: "" });
      if (item.production_item_id) {
        try {
          await base44.entities.ProductionItem.update(item.production_item_id, { stage: "on_hold" });
          queryClient.invalidateQueries({ queryKey: ["productionItems"] });
        } catch (err) {
          console.error("Failed to move card out of production:", err);
        }
      }
      toast.success("Sent back to Open ✓");
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
    } catch (err) {
      console.error("Failed to send item back to Open:", err);
      toast.error("Failed to send back to Open");
    } finally {
      setUpdating(null);
    }
  };

  // Send this item's linked production card back into the production flow (Cut stage)
  const sendCardToProduction = async (item, stage) => {
    if (!item.production_item_id) {
      toast.error("This item has no linked production card");
      return;
    }
    const targetStage = stage || "cut";
    setSending(item.id);
    try {
      await base44.entities.ProductionItem.update(item.production_item_id, {
        stage: targetStage,
        sent_back_for_missing: true,
      });
      toast.success(`Card sent to production (${targetStage.replace(/_/g, " ")}) ✓`);
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    } catch (err) {
      console.error("Failed to send card to production:", err);
      toast.error("Failed to send card to production");
    } finally {
      setSending(null);
    }
  };

  // Completed items stay visible so per-room progress reflects them
  const visible = missingItems.filter(i => !i.archived);

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

  const statusCounts = STATUS_FLOW.map(s => ({
    status: s,
    count: missingItems.filter(i => !i.archived && i.status === s).length,
    cfg: STATUS_CONFIG[s],
  }));

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {statusCounts.map(({ status, count, cfg }) => (
          <div key={status} className={`border border-black/5 rounded-lg px-3 py-2 flex items-center gap-2 ${cfg.color}`}>
            <span className="text-sm font-bold">{count}</span>
            <span className="text-xs">{cfg.label}</span>
          </div>
        ))}
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
            {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            cardById={cardById}
            projects={projects}
            isAdmin={isAdmin}
            updating={updating}
            onStatus={handleStatus}
            onSendToProduction={sendCardToProduction}
            onBackToOpen={sendBackToOpen}
            sending={sending}
            onViewCard={setViewCardId}
            expandedJobs={expandedJobs}
            expandedRooms={expandedRooms}
            onToggleJob={toggleJob}
            onToggleRoom={toggleRoom}
          />
        </>
      )}

      <MissingItemCardViewerDialog cardId={viewCardId} onClose={() => setViewCardId(null)} />
    </div>
  );
}