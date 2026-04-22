import { useState, useCallback, useEffect } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import usePullToRefresh from "@/components/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Factory, Briefcase, Link2, Unlink, Package, AlertTriangle, PackageX, Sunset, Clipboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReportStruggleDialog from "../components/production/ReportStruggleDialog";
import GiveComplimentDialog from "../components/production/GiveComplimentDialog";
import ReportMissingDialog from "../components/production/ReportMissingDialog";
import EndOfDayDialog from "../components/production/EndOfDayDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductionItemForm from "../components/production/ProductionItemForm";
import PDFAnnotator from "../components/production/PDFAnnotator";
import PickupItemForm from "../components/pickup/PickupItemForm";
import ProductionCard from "../components/production/ProductionCard";
import JobPacketsTab from "../components/production/JobPacketsTab";
import ProductionMissingItemsTab from "../components/production/ProductionMissingItemsTab";
import QuickReportMissingDialog from "../components/production/QuickReportMissingDialog";

const productionColumns = [
  { id: "cut", label: "1. Cut", color: "bg-orange-50" },
  { id: "face_frame", label: "2. Face Frame", color: "bg-blue-50" },
  { id: "spray", label: "3. Spray", color: "bg-purple-50" },
  { id: "build", label: "4. Build", color: "bg-amber-50" },
  { id: "complete", label: "5. Complete", color: "bg-green-50" },
  { id: "on_hold", label: "On Hold", color: "bg-red-100" }
];

const ACTIVE_PROJECT_STATUSES = ["in_production", "ready_for_install", "installing", "in_design", "approved"];


export default function ShopProduction() {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("production");
  const [showForm, setShowForm] = useState(false);
  const [jobInfoMode, setJobInfoMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [annotatingPdf, setAnnotatingPdf] = useState(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [currentAnnotations, setCurrentAnnotations] = useState([]);
  const [pickupItem, setPickupItem] = useState(null);
  const [editingPts, setEditingPts] = useState(null);
  const [linkingItem, setLinkingItem] = useState(null); // job info item being linked
  const [packetsFormContext, setPacketsFormContext] = useState(null); // { project, roomName } for Job Packets add
  const [openFolderContext, setOpenFolderContext] = useState(null); // { project, roomName } to auto-open a folder in Job Packets
  const [currentUser, setCurrentUser] = useState(null);
  const [reportingStruggle, setReportingStruggle] = useState(null);
  const [givingCompliment, setGivingCompliment] = useState(false);
  const [reportingMissing, setReportingMissing] = useState(null);
  const [quickReportItem, setQuickReportItem] = useState(null);
  const [showEndOfDay, setShowEndOfDay] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: columnMoveLogs = [] } = useQuery({
    queryKey: ["columnMoveLogs"],
    queryFn: () => base44.entities.ColumnMoveLog.list(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubItems = base44.entities.ProductionItem.subscribe((event) => {
      queryClient.setQueryData(["productionItems"], (old = []) => {
        if (event.type === "create") return [...old, event.data];
        if (event.type === "update") return old.map(i => i.id === event.id ? event.data : i);
        if (event.type === "delete") return old.filter(i => i.id !== event.id);
        return old;
      });
    });
    const unsubLogs = base44.entities.ColumnMoveLog.subscribe((event) => {
      queryClient.setQueryData(["columnMoveLogs"], (old = []) => {
        if (event.type === "create") return [...old, event.data];
        return old;
      });
    });
    return () => { unsubItems(); unsubLogs(); };
  }, [queryClient]);

  const activeProjects = projects.filter(p => ACTIVE_PROJECT_STATUSES.includes(p.status) && !p.archived);

  const getProjectColor = (projectId) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.card_color || null;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productionItems"] }); setShowForm(false); setEditingItem(null); }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, syncToProject }) => {
      const safeData = { ...data, files: (data.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations })) };
      await base44.entities.ProductionItem.update(id, safeData);
      if (syncToProject && safeData.files && syncToProject.project_id && syncToProject.room_name) {
        const projList = await base44.entities.Project.filter({ id: syncToProject.project_id });
        const proj = projList[0];
        if (proj?.rooms) {
          const updatedRooms = proj.rooms.map(room => {
            if (room.room_name !== syncToProject.room_name) return room;
            return { ...room, files: (room.files || []).map(rf => { const match = safeData.files.find(pf => pf.url === rf.url || pf.name === rf.name); return match ? { ...rf, pts: match.pts } : rf; }) };
          });
          await base44.entities.Project.update(syncToProject.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productionItems"] }); setShowForm(false); setEditingItem(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["productionItems"] })
  });

  const createPickupMutation = useMutation({
    mutationFn: (data) => base44.entities.PickupItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pickupItems"] }); setPickupItem(null); }
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId && result.destination.index === result.source.index) return;

    const itemId = result.draggableId;
    const newStage = result.destination.droppableId;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const oldStage = item.stage;

    // Admin-only: within-column reorder — update sort_order for all cards in that column
    if (oldStage === newStage && currentUser?.role === "admin") {
      const columnItems = items
        .filter(i => i.stage === oldStage && !i.is_job_info)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      // Apply the reorder
      const reordered = [...columnItems];
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      // Optimistic update
      queryClient.setQueryData(["productionItems"], (old = []) => {
        const orderMap = Object.fromEntries(reordered.map((it, idx) => [it.id, idx]));
        return old.map(i => orderMap[i.id] !== undefined ? { ...i, sort_order: orderMap[i.id] } : i);
      });
      // Persist all reordered items
      await Promise.all(reordered.map((it, idx) =>
        base44.entities.ProductionItem.update(it.id, { sort_order: idx })
      ));
      return;
    }

    if (oldStage === newStage) return;

    const safeFiles = (item.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts !== undefined ? Number(f.pts) : undefined, annotations: f.annotations }));

    const localDateStr = format(new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" })), "yyyy-MM-dd");

    // Calculate total pts for this item (file pts + card-level pts)
    const filePts = safeFiles.reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
    const cardPts = parseFloat(item.pts) || 0;
    const totalPts = filePts + cardPts;

    // Forward flow: points are earned when LEAVING a column along the forward path.
    // Valid forward exits: face_frame→(spray|build|complete), spray→(build|complete), build→complete, cut→(face_frame|complete)
    // Backward moves (e.g. complete→build, build→spray, anything→cut) earn zero points.
    // Points are only awarded when a card exits a column toward "complete".
    // Moving anything INTO build (without going to complete) does NOT award points.
    // Build's only valid point-earning exit is "complete".
    const FORWARD_EXITS = {
      cut:        ["face_frame", "complete"],
      face_frame: ["spray", "complete"],
      spray:      ["complete"],
      build:      ["complete"],
    };
    const isForwardMove = (FORWARD_EXITS[oldStage] || []).includes(newStage);

    // columns_visited tracks which source columns have already had their points counted.
    // Only grows; prevents double-counting if a card is moved forward, back, then forward again.
    const visited = JSON.parse(item.columns_visited || "[]");
    const alreadyExited = visited.includes(oldStage);
    const pointsToAdd = (isForwardMove && !alreadyExited) ? totalPts : 0;
    if (isForwardMove && !alreadyExited) visited.push(oldStage);

    // Set completed_date when moving INTO complete (once only)
    let completedDate = item.completed_date;
    if (newStage === "complete" && !completedDate) {
      completedDate = localDateStr;
    }

    // pts_logged / pts_logged_date — written ONCE on first completion
    const ptsLogged = newStage === "complete" && !item.pts_logged ? totalPts : item.pts_logged;
    const ptsLoggedDate = newStage === "complete" && !item.pts_logged_date ? localDateStr : item.pts_logged_date;

    // Stage move log — always record who moved it and when; prune entries older than 14 days
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const prunedLog = (item.stage_move_log || []).filter(e => e.timestamp && new Date(e.timestamp) >= cutoff);
    const stageMoveLog = [...prunedLog, {
      from_stage: oldStage || null,
      to_stage: newStage,
      moved_by: currentUser?.full_name || currentUser?.email || "Unknown",
      timestamp: new Date().toISOString(),
    }];

    const updatePayload = {
      name: item.name, type: item.type, stage: newStage,
      project_id: item.project_id, project_name: item.project_name, room_name: item.room_name,
      notes: item.notes, files: safeFiles, pts: item.pts,
      columns_visited: JSON.stringify(visited),
      total_points: (item.total_points || 0) + pointsToAdd,
      pts_logged: ptsLogged,
      pts_logged_date: ptsLoggedDate,
      completed_date: completedDate,
      stage_move_log: stageMoveLog,
    };

    // Optimistic update immediately so UI feels instant
    queryClient.setQueryData(["productionItems"], (old = []) =>
      old.map(i => i.id === itemId ? { ...i, ...updatePayload } : i)
    );

    // Persist item update and create move log entry in parallel
    await Promise.all([
      base44.entities.ProductionItem.update(itemId, updatePayload),
      base44.entities.ColumnMoveLog.create({
        item_id: itemId,
        item_name: item.name,
        project_name: item.project_name || null,
        from_column: oldStage || null,
        to_column: newStage,
        points_awarded: pointsToAdd,
        moved_by: currentUser?.full_name || currentUser?.email || "Unknown",
        moved_at: new Date().toISOString(),
      }),
    ]);

    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    queryClient.invalidateQueries({ queryKey: ["columnMoveLogs"] });

    if (item?.pickup_item_id) {
      try { await base44.entities.PickupItem.update(item.pickup_item_id, { production_stage: newStage }); queryClient.invalidateQueries({ queryKey: ["pickupItems"] }); } catch (e) {}
    }

    if (item?.project_id) {
      try {
        // Use locally-cached project data — avoids extra network round-trip
        const project = projects.find(p => p.id === item.project_id);
        if (project?.rooms) {
          const updatedRooms = project.rooms.map(room => {
            if (room.room_name === item.room_name && room.files) {
              return { ...room, files: room.files.map(file => { const isMatch = item.files?.some(f => f.url === file.url || f.name === file.name); return isMatch ? { ...file, in_production: true, production_stage: newStage } : file; }) };
            }
            return room;
          });
          await base44.entities.Project.update(item.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      } catch (error) {}
    }
  };

  const handleInlinePtsChange = async (item, fileIndex, newPts) => {
    const updatedFiles = (item.files || []).map((f, i) => i === fileIndex ? { ...f, pts: newPts === "" ? undefined : Number(newPts) } : f);
    queryClient.setQueryData(["productionItems"], (old = []) => old.map(i => i.id === item.id ? { ...i, files: updatedFiles } : i));
    await base44.entities.ProductionItem.update(item.id, { files: updatedFiles });
    if (item.project_id && item.room_name) {
      const projList = await base44.entities.Project.filter({ id: item.project_id });
      const proj = projList[0];
      if (proj?.rooms) {
        const updatedRooms = proj.rooms.map(room => {
          if (room.room_name !== item.room_name) return room;
          return { ...room, files: (room.files || []).map(rf => { const match = updatedFiles.find(pf => pf.url === rf.url || pf.name === rf.name); return match !== undefined ? { ...rf, pts: match.pts } : rf; }) };
        });
        await base44.entities.Project.update(item.project_id, { rooms: updatedRooms });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
    }
  };

  const handleAnnotatePdf = (item, fileIndex) => {
    const file = item.files[fileIndex];
    setAnnotatingPdf({ item, fileIndex });
    setCurrentPdfUrl(file.url);
    setCurrentAnnotations(file.annotations || []);
  };

  const handleSaveAnnotations = (annotations) => {
    const { item, fileIndex } = annotatingPdf;
    const updatedFiles = [...item.files];
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], annotations };
    updateMutation.mutate({ id: item.id, data: { files: updatedFiles }, syncToProject: item.project_id ? { project_id: item.project_id, room_name: item.room_name } : null });
    setAnnotatingPdf(null); setCurrentPdfUrl(null); setCurrentAnnotations([]);
  };

  // PTS stats — read from ColumnMoveLog, summing points_awarded by to_column within time windows
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const todayStr = format(nowLocal, "yyyy-MM-dd");
  const weekStart = startOfWeek(nowLocal, { weekStartsOn: 1 });
  const monthStart = startOfMonth(nowLocal);

  const STAT_STAGES = ["face_frame", "spray", "build", "complete"];
  const STAT_LABELS = { face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete" };

  const getColStats = (stage) => {
    let day = 0, week = 0, month = 0;
    for (const log of columnMoveLogs) {
      // Points are earned when leaving a column (from_column), not when arriving.
      // "complete" is the final destination so we count arrivals there (to_column).
      const matchCol = stage === "complete" ? log.to_column : log.from_column;
      if (matchCol !== stage) continue;
      const pts = parseFloat(log.points_awarded) || 0;
      if (pts === 0) continue;
      const movedAt = new Date(log.moved_at);
      const movedLocal = new Date(movedAt.toLocaleString("en-US", { timeZone: "America/Denver" }));
      const dateStr = format(movedLocal, "yyyy-MM-dd");
      if (dateStr === todayStr) day += pts;
      if (movedLocal >= weekStart) week += pts;
      if (movedLocal >= monthStart) month += pts;
    }
    return { day, week, month };
  };

  const colStats = Object.fromEntries(STAT_STAGES.map(s => [s, getColStats(s)]));

  const returnToFolder = async (item) => {
    const files = (item.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations }));
    await base44.entities.ProductionItem.update(item.id, { ...item, files, is_job_info: false, stage: null });
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    // NOTE: intentionally NOT switching tabs — admin stays on production
  };

  const returnToFolderFromJobInfo = async (item) => {
    const files = (item.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations }));
    await base44.entities.ProductionItem.update(item.id, { ...item, files, is_job_info: false, stage: null });
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    // NOTE: intentionally NOT switching tabs
  };

  const sendToJobInfo = async (item) => {
    // Create a linked Job Info copy — keeps item in Production AND creates a mirrored Job Info card
    const files = (item.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations }));
    const newJobInfoItem = await base44.entities.ProductionItem.create({
      name: item.name,
      type: item.type,
      stage: item.stage,
      project_id: item.project_id,
      project_name: item.project_name,
      room_name: item.room_name,
      notes: item.notes,
      files,
      sketch_url: item.sketch_url,
      glb_url: item.glb_url,
      glb_name: item.glb_name,
      is_job_info: true,
      linked_production_item_id: item.id,
    });
    // Update the production item to reference the new job info card
    await base44.entities.ProductionItem.update(item.id, { ...item, files, linked_production_item_id: newJobInfoItem.id });
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    setActiveTab("job_info");
  };

  const returnToJobInfoFromProduction = async (item) => {
    await base44.entities.ProductionItem.update(item.id, { ...item, is_job_info: true });
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    setActiveTab("job_info");
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["productionItems"] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  const handleGlbUpdate = (id, fields) => {
    queryClient.setQueryData(["productionItems"], (old = []) => old.map(i => i.id === id ? { ...i, ...fields } : i));
  };

  // Get CAD files from the project tagged to a specific room
  const getRoomCadFiles = (projectId, roomName) => {
    if (!projectId || !roomName) return [];
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.files) return [];
    const isCad = (f) => {
      const ext = (f.name || "").toLowerCase().split('.').pop();
      return f.tag === "cad_dxf" || f.tag === "cad_file" || ext === "dxf" || ext === "glb" || ext === "gltf";
    };
    return proj.files.filter(f => isCad(f) && f.room_name === roomName);
  };

  // Move a card to a different stage via dropdown (same logic as drag-end)
  const handleMoveStage = async (item, newStage) => {
    if (item.stage === newStage) return;
    await handleDragEnd({
      draggableId: item.id,
      source: { droppableId: item.stage, index: 0 },
      destination: { droppableId: newStage, index: 0 },
    });
  };

  const sharedCardProps = {
    editingPts,
    setEditingPts,
    currentUser,
    onInlinePtsChange: handleInlinePtsChange,
    onAnnotate: handleAnnotatePdf,
    getProjectColor,
    getRoomCadFiles,
    onMoveStage: handleMoveStage,
    onPickup: (item) => setPickupItem({ project_id: item.project_id, project_name: item.project_name, room_name: item.room_name, production_item_id: item.id }),
    onReportMissing: (item) => setReportingMissing(item),
    onQuickReportMissing: (item) => setQuickReportItem(item),

    onEdit: (item) => { setEditingItem(item); setShowForm(true); },
    onDelete: (id) => deleteMutation.mutate(id),
    onUpdate: handleGlbUpdate,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shop Production</h1>
            <p className="text-slate-500 mt-1">Track projects through production stages</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowEndOfDay(true)}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Sunset className="w-4 h-4 mr-2" /> End of Day
            </Button>
            <Button
              onClick={() => setReportingMissing(true)}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <PackageX className="w-4 h-4 mr-2" /> Report Missing
            </Button>
            <Button
              onClick={() => setReportingStruggle(true)}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Report Struggle
            </Button>
            <Button
              onClick={() => setGivingCompliment(true)}
              variant="outline"
              className="border-amber-300 text-amber-600 hover:bg-amber-50"
            >
              🎉 Well Done
            </Button>
            <Button
              onClick={() => navigate("/MistakeReport")}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Report Mistake
            </Button>
            <Button onClick={() => { setJobInfoMode(false); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>

        {/* Per-column PTS stats */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_STAGES.map(stage => {
            const s = colStats[stage];
            return (
              <div key={stage} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{STAT_LABELS[stage]}</p>
                <div className="flex gap-3">
                  {[{ label: "Day", val: s.day }, { label: "Week", val: s.week }, { label: "Month", val: s.month }].map(({ label, val }) => (
                    <div key={label} className="text-center flex-1">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-base font-bold text-green-700">{val}<span className="text-xs font-medium opacity-60 ml-0.5">p</span></p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Factory className="w-4 h-4" /> Production
            </TabsTrigger>
            <TabsTrigger value="job_info" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Job Info
            </TabsTrigger>
            <TabsTrigger value="job_packets" className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Job Packets
            </TabsTrigger>
            <TabsTrigger value="missing_items" className="flex items-center gap-2">
              <PackageX className="w-4 h-4" /> Missing Items
            </TabsTrigger>
          </TabsList>

          {/* ── PRODUCTION TAB ── */}
          <TabsContent value="production" className="mt-0">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {productionColumns.map((column, colIdx) => {
                  const columnItems = items
                    .filter(i => i.stage === column.id && !i.is_job_info)
                    .sort((a, b) => {
                      // If any item has a sort_order set, use it; otherwise fall back to created_date
                      const aHasOrder = a.sort_order !== undefined && a.sort_order !== null;
                      const bHasOrder = b.sort_order !== undefined && b.sort_order !== null;
                      if (aHasOrder || bHasOrder) return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
                      return new Date(a.created_date) - new Date(b.created_date);
                    });
                  const colPts = columnItems.reduce((sum, item) => {
                    const filePts = (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
                    const cardPts = parseFloat(item.pts) || 0;
                    return sum + filePts + cardPts;
                  }, 0);

                  return (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-slate-700">{column.label}</h2>
                          {colPts > 0 && (
                            <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">{colPts} PTS</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">{columnItems.length}</Badge>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`rounded-lg p-3 transition-colors overflow-y-auto ${snapshot.isDraggingOver ? "bg-slate-200" : column.color}`}
                            style={{ maxHeight: "calc(100vh - 280px)", minHeight: 200 }}
                          >
                            <div className="space-y-3">
                              {columnItems.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                 {(provided, snapshot) => {
                                   const proj = projects.find(p => p.id === item.project_id);
                                   const hasRoom = proj?.rooms?.some(r => r.room_name === item.room_name);
                                   return (
                                     <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                       <ProductionCard
                                         item={item}
                                         isDragging={snapshot.isDragging}
                                         {...sharedCardProps}
                                         roomCadFiles={getRoomCadFiles(item.project_id, item.room_name)}
                                         onReturnToFolder={currentUser?.role === "admin" && hasRoom ? returnToFolder : undefined}
                                         onSendToJobInfo={currentUser?.role === "admin" ? sendToJobInfo : undefined}
                                         roomFolderLabel={hasRoom ? item.room_name : undefined}
                                         onOpenRoomFolder={hasRoom ? () => { setOpenFolderContext({ projectId: item.project_id, roomName: item.room_name }); setActiveTab("job_packets"); } : undefined}
                                       />
                                     </div>
                                   );
                                 }}
                                </Draggable>
                              ))}
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </TabsContent>

          {/* ── JOB INFO TAB ── */}
          <TabsContent value="job_info" className="mt-0">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { setJobInfoMode(true); setEditingItem(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" /> Add Job Info Item
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {activeProjects.map((project) => {
                  // Items whose project_id matches this project (any stage except complete/on_hold for job info view)
                  const projectItems = items.filter(i => i.project_id === project.id && i.is_job_info);

                  return (
                    <div key={project.id} className="flex-shrink-0 w-80">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {project.card_color && (
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.card_color }} />
                          )}
                          <h2 className="font-semibold text-slate-700 truncate">{project.project_name}</h2>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{projectItems.length}</Badge>
                      </div>
                      <Droppable droppableId={`jobinfo_${project.id}`} isDropDisabled={true}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="rounded-lg p-3 bg-slate-100 overflow-y-auto"
                            style={{ maxHeight: "calc(100vh - 280px)", minHeight: 120 }}
                          >
                            {projectItems.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">No production items</p>
                            ) : (
                              <div className="space-y-3">
                                {projectItems.map((item, index) => {
                                  // Find any linked production item (another item with this as pickup_item_id, or just show itself)
                                  return (
                                    <Draggable key={item.id} draggableId={`ji_${item.id}`} index={index} isDragDisabled={true}>
                                           {(provided) => {
                                             const linkedProd = item.linked_production_item_id
                                               ? items.find(i => i.id === item.linked_production_item_id)
                                               : null;
                                             const proj = projects.find(p => p.id === item.project_id);
                                             const matchedRoom = proj?.rooms?.find(r => r.room_name === item.room_name);
                                             return (
                                               <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                  <ProductionCard
                                                    item={item}
                                                    isDragging={false}
                                                    roomGlbUrl={matchedRoom?.glb_url}
                                                    roomGlbName={matchedRoom?.glb_name}
                                                    editingPts={editingPts}
                                                    setEditingPts={setEditingPts}
                                                    currentUser={currentUser}
                                                    roomCadFiles={getRoomCadFiles(item.project_id, item.room_name)}
                                                    onInlinePtsChange={handleInlinePtsChange}
                                                    onAnnotate={handleAnnotatePdf}
                                                    getProjectColor={getProjectColor}
                                                    onPickup={currentUser?.role === "admin" ? (item) => setPickupItem({ project_id: item.project_id, project_name: item.project_name, room_name: item.room_name, production_item_id: item.id }) : undefined}
                                                    onEdit={currentUser?.role === "admin" ? (item) => { setEditingItem(item); setShowForm(true); } : undefined}
                                                    onDelete={currentUser?.role === "admin" ? (id) => deleteMutation.mutate(id) : undefined}
                                                    onSendToJobInfo={undefined}
                                                    onReturnToFolder={currentUser?.role === "admin" && matchedRoom ? returnToFolderFromJobInfo : undefined}
                                                    roomFolderLabel={item.room_name}
                                                    onOpenRoomFolder={matchedRoom ? () => { setOpenFolderContext({ projectId: item.project_id, roomName: item.room_name }); setActiveTab("job_packets"); } : undefined}
                                                  />
                                                 {/* Link row */}
                                                 <div className="mt-1 flex items-center justify-between gap-2">
                                                   {linkedProd ? (
                                                     <button
                                                       onClick={() => setActiveTab("production")}
                                                       className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline truncate"
                                                       title="View linked production card"
                                                     >
                                                       <Link2 className="w-3 h-3 flex-shrink-0" />
                                                       <span className="truncate">{linkedProd.name}</span>
                                                       <Badge variant="outline" className="ml-1 text-xs capitalize flex-shrink-0">{linkedProd.stage?.replace(/_/g, " ")}</Badge>
                                                     </button>
                                                   ) : (
                                                     <button
                                                       onClick={() => setLinkingItem(item)}
                                                       className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600"
                                                     >
                                                       <Link2 className="w-3 h-3" /> Link to production card
                                                     </button>
                                                   )}
                                                   {linkedProd && (
                                                     <button
                                                       onClick={() => updateMutation.mutate({ id: item.id, data: { ...item, linked_production_item_id: null } })}
                                                       className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                                                       title="Unlink"
                                                     >
                                                       <Unlink className="w-3 h-3" />
                                                     </button>
                                                   )}
                                                 </div>
                                               </div>
                                             );
                                           }}
                                         </Draggable>
                                  );
                                })}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && (
                  <p className="text-slate-400 text-sm">No active projects found.</p>
                )}
              </div>
            </DragDropContext>
          </TabsContent>
          {/* ── MISSING ITEMS TAB ── */}
          <TabsContent value="missing_items" className="mt-0">
            <ProductionMissingItemsTab currentUser={currentUser} />
          </TabsContent>

          {/* ── JOB PACKETS TAB ── */}
          <TabsContent value="job_packets" className="mt-0">
            <JobPacketsTab
            projects={activeProjects}
            items={items}
            openFolderContext={openFolderContext}
            onFolderOpened={() => setOpenFolderContext(null)}
            onAddCard={(project, roomName) => {
              setPacketsFormContext({ project, roomName });
              setJobInfoMode(false);
              setEditingItem({ project_id: project.id, project_name: project.project_name, room_name: roomName, is_job_info: false, type: "cabinet", stage: "face_frame" });
              setShowForm(true);
            }}
            onSendToProduction={async (selectedItems) => {
              for (const item of selectedItems) {
                await base44.entities.ProductionItem.update(item.id, {
                  ...item,
                  is_job_info: false,
                  stage: item.stage || "face_frame"
                });
              }
              queryClient.invalidateQueries({ queryKey: ["productionItems"] });
              setActiveTab("production");
            }}
            sharedCardProps={sharedCardProps}
            />
          </TabsContent>
        </Tabs>

        {/* Forms */}
        <ProductionItemForm
          open={showForm}
          onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingItem(null); setJobInfoMode(false); setPacketsFormContext(null); } }}
          onSubmit={(data) => {
            const finalData = packetsFormContext
              ? { ...data, is_job_info: false, project_id: packetsFormContext.project.id, project_name: packetsFormContext.project.project_name, room_name: packetsFormContext.roomName }
              : data;
            if (editingItem?.id) {
              updateMutation.mutate({ id: editingItem.id, data: finalData, syncToProject: editingItem.project_id ? { project_id: editingItem.project_id, room_name: editingItem.room_name } : null });
            } else {
              createMutation.mutate(finalData);
            }
          }}
          initialData={editingItem ? { ...editingItem } : null}
          isLoading={createMutation.isPending || updateMutation.isPending}
          jobInfoProjects={jobInfoMode ? activeProjects : undefined}
        />

        {pickupItem && (
          <PickupItemForm
            open={!!pickupItem}
            onOpenChange={(open) => { if (!open) setPickupItem(null); }}
            onSubmit={(data) => createPickupMutation.mutate({ ...data, source: "production", production_item_id: pickupItem.production_item_id })}
            projectId={pickupItem.project_id}
            projectName={pickupItem.project_name}
            rooms={projects.find(p => p.id === pickupItem.project_id)?.rooms || []}
            initialData={{ room_name: pickupItem.room_name }}
            isLoading={createPickupMutation.isPending}
          />
        )}

        {/* Link dialog */}
        {linkingItem && (
          <Dialog open={!!linkingItem} onOpenChange={(open) => { if (!open) setLinkingItem(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Link to Production Card</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-500 mb-3">Select a production board card to link to <strong>{linkingItem.name}</strong>:</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.filter(i => !i.is_job_info).map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      updateMutation.mutate({ id: linkingItem.id, data: { ...linkingItem, linked_production_item_id: prod.id } });
                      setLinkingItem(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-sm"
                  >
                    <div className="font-medium text-slate-900">{prod.name}</div>
                    <div className="text-xs text-slate-500">{prod.project_name} · <span className="capitalize">{prod.stage?.replace(/_/g, " ")}</span></div>
                  </button>
                ))}
                {items.filter(i => !i.is_job_info).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No production cards found.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <ReportStruggleDialog
          open={!!reportingStruggle}
          onOpenChange={(open) => { if (!open) setReportingStruggle(false); }}
        />

        {quickReportItem && (
          <QuickReportMissingDialog
            open={!!quickReportItem}
            onOpenChange={(open) => { if (!open) setQuickReportItem(null); }}
            item={quickReportItem}
            currentUser={currentUser}
          />
        )}

        <GiveComplimentDialog
          open={givingCompliment}
          onOpenChange={setGivingCompliment}
        />

        <ReportMissingDialog
          open={!!reportingMissing}
          onOpenChange={(open) => { if (!open) setReportingMissing(null); }}
          currentUser={currentUser}
          prefillItem={reportingMissing !== true ? reportingMissing : null}
        />

        <EndOfDayDialog
          open={showEndOfDay}
          onOpenChange={setShowEndOfDay}
          currentUser={currentUser}
        />

        {annotatingPdf && currentPdfUrl && (
          <PDFAnnotator
            open={true}
            onOpenChange={() => { setAnnotatingPdf(null); setCurrentPdfUrl(null); setCurrentAnnotations([]); }}
            pdfUrl={currentPdfUrl}
            annotations={currentAnnotations}
            onSave={handleSaveAnnotations}
          />
        )}
      </div>
    </div>
  );
}