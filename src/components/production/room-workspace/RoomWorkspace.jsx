import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, ArrowRight, ArrowLeft, X, PanelRightOpen, PanelRightClose, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import TypeGroupedGrid from "@/components/production/TypeGroupedGrid";
import ProductionItemForm from "@/components/production/ProductionItemForm";
import RoomCardTile from "./RoomCardTile";
import RoomInfoPane from "./RoomInfoPane";
import { roomPts } from "@/lib/roomPts";

/**
 * Combined Room Workspace — production cards (left) and room info (right) in one
 * full-screen split view. Replaces the separate room card dialog and the room
 * detail modal: clicking a room opens this. On wide screens (desktop / iPad
 * landscape) the pane sits beside the cards; on narrow ones (iPad portrait,
 * phone) it stacks above them at ~45% viewport height with its own scroll.
 * Either way both panes stay live and interactive — never a modal overlay —
 * and the top-bar Room Info button collapses the pane.
 */
export default function RoomWorkspace({
  project,
  roomName,
  items,
  currentUser,
  onClose,
  cardProps,           // parent-supplied ProductionCard props (production board context)
  onSendToProduction,  // optional: parent handles the send (e.g. stage picker)
  onAddCard,           // optional: parent handles creating a card
  roomActions,         // optional: the room's usual action buttons (Pickup/Missing, Selections, 3D…)
}) {
  const queryClient = useQueryClient();
  // The workspace can switch to any other room of the same project without closing
  const [activeRoom, setActiveRoom] = useState(roomName);
  useEffect(() => { setActiveRoom(roomName); }, [roomName, project.id]);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());

  // One source of truth for the layout: width only. >= 1024px docks the Room Info
  // pane beside the cards (iPad landscape / desktop); below that it is a slide-over.
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const wide = viewportWidth >= 1024;

  // Room info is ALWAYS open on first paint — tapping a card's Room Info icon must
  // surface room info in that same tap: docked beside the cards when wide enough,
  // as a slide-over drawer over the cards when narrow. The top-bar toggle closes it.
  const [infoOpen, setInfoOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [localEditingPts, setLocalEditingPts] = useState(null);

  const roomItems = (items || []).filter(
    i => i.project_id === project.id && i.room_name === activeRoom && !i.is_job_info
  );
  const stagedItems = roomItems.filter(i => !i.stage);
  const inProductionItems = roomItems.filter(i => i.stage);
  const count = roomItems.length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    queryClient.invalidateQueries({ queryKey: ["productionItems", project.id] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditingItem(null); },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const safeData = { ...data, files: (data.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations })) };
      await base44.entities.ProductionItem.update(id, safeData);
    },
    onSuccess: () => { invalidate(); setShowForm(false); setEditingItem(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionItem.delete(id),
    onSuccess: () => invalidate(),
  });

  const handleAddCard = () => {
    if (onAddCard && activeRoom === roomName) { onAddCard(); return; }
    setEditingItem({
      project_id: project.id,
      project_name: project.project_name,
      room_name: activeRoom,
      is_job_info: false,
      type: "cabinet",
      stage: null,
    });
    setShowForm(true);
  };

  // Card actions: prefer the parent's handlers (production board), fall back to our own
  const editHandler = cardProps?.onEdit || ((item) => { setEditingItem(item); setShowForm(true); });
  const deleteHandler = cardProps?.onDelete || ((id) => deleteMutation.mutate(id));
  const moveStageHandler = cardProps?.onMoveStage || (async (item, newStage) => {
    await base44.entities.ProductionItem.update(item.id, { stage: newStage });
    invalidate();
  });
  const updateHandler = cardProps?.onUpdate || (async (id, fields) => {
    await base44.entities.ProductionItem.update(id, fields);
    invalidate();
  });
  const inlinePtsHandler = cardProps?.onInlinePtsChange || (async (item, fileIndex, newPts) => {
    const val = newPts === "" || newPts === undefined || newPts === null ? undefined : Number(newPts);
    if (fileIndex === -1) {
      await base44.entities.ProductionItem.update(item.id, { pts: val });
    } else {
      const files = (item.files || [])
        .map((f, i) => i === fileIndex ? { ...f, pts: val } : f)
        .map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations }));
      await base44.entities.ProductionItem.update(item.id, { files });
    }
    invalidate();
  });

  const cardPropsForCard = {
    editingPts: cardProps?.editingPts ?? localEditingPts,
    setEditingPts: cardProps?.setEditingPts ?? setLocalEditingPts,
    currentUser,
    getProjectColor: cardProps?.getProjectColor || (() => project.card_color || null),
    ...cardProps,
    onEdit: editHandler,
    onDelete: deleteHandler,
    onMoveStage: moveStageHandler,
    onUpdate: updateHandler,
    onInlinePtsChange: inlinePtsHandler,
    // "Room info" on a card inside the workspace just brings the room pane forward
    onOpenRoomInfo: () => setInfoOpen(true),
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === stagedItems.length) setSelected(new Set());
    else setSelected(new Set(stagedItems.map(i => i.id)));
  };

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allExpanded = roomItems.length > 0 && expanded.size === roomItems.length;
  const toggleExpandAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(roomItems.map(i => i.id)));
  };

  const sendItems = async (list) => {
    if (!list || list.length === 0) return;
    if (onSendToProduction) {
      onSendToProduction(list);
      setSelected(new Set());
      return;
    }
    for (const item of list) {
      await base44.entities.ProductionItem.update(item.id, { ...item, is_job_info: false, stage: item.stage || "cut" });
    }
    invalidate();
    setSelected(new Set());
  };

  const handleSendAll = () => {
    if (stagedItems.length === 0) return;
    if (onSendToProduction) { sendItems(stagedItems); return; }
    if (!window.confirm(`Send ${stagedItems.length} card${stagedItems.length !== 1 ? "s" : ""} to production?`)) return;
    sendItems(stagedItems);
  };

  const renderCard = (item) => (
    <RoomCardTile
      key={item.id}
      item={item}
      expanded={expanded.has(item.id)}
      onToggleExpand={() => toggleExpand(item.id)}
      checked={selected.has(item.id)}
      onToggleCheck={() => toggleSelect(item.id)}
      onSend={() => sendItems([item])}
      cardProps={cardPropsForCard}
    />
  );

  // Always 3 across on tablet/desktop — cards stay readable however wide the pane gets
  const gridClass = "grid grid-cols-2 sm:grid-cols-3 gap-2";

  const paneContent = (
    <div className="h-full flex flex-col min-h-0">
      {roomActions && activeRoom === roomName && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          {roomActions}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <RoomInfoPane
          project={project}
          roomName={activeRoom}
          onSelectRoom={(name) => { setActiveRoom(name); setSelected(new Set()); setExpanded(new Set()); }}
          onClose={onClose}
        />
      </div>
    </div>
  );

  return createPortal(
    <div
      className="fixed left-0 right-0 top-0 z-[100] bg-slate-200/80 p-1 sm:p-2 h-screen"
      style={{
        height: "100dvh",
        paddingTop: "calc(env(safe-area-inset-top) + 4px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
      }}
    >
      <div className="h-full w-full flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Pinned top bar — Exit View and the Room Info toggle stay visible at every width */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-2.5 sm:px-3 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex-shrink-0"
            title="Exit room view"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="whitespace-nowrap">Exit View</span>
          </Button>
          <div className="min-w-0 flex-1 basis-32">
            <p className="text-sm font-bold text-slate-900 truncate leading-tight">
              <span className="text-slate-400 font-normal">{project.project_name} /</span> {activeRoom}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight truncate">
              {stagedItems.length} staged{inProductionItems.length > 0 && ` · ${inProductionItems.length} in production`}
              <span className="ml-1.5 font-semibold text-amber-700">{roomPts(roomItems)} PTS</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInfoOpen(o => !o)}
            className={`flex items-center gap-1 flex-shrink-0 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
              infoOpen
                ? "bg-amber-600 border-amber-600 text-white"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
            title={infoOpen ? "Hide room info" : "Show room info"}
            aria-pressed={infoOpen}
          >
            {infoOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">Room Info</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row on wide screens (side-by-side), column on narrow ones (room info stacked above cards) */}
        <div className={wide ? "flex-1 flex min-h-0" : "flex-1 flex flex-col min-h-0"}>
          {/* Production cards — full width beside the pane, the lower half when stacked */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex flex-wrap items-center gap-1.5 px-2 sm:px-3 py-1.5 border-b border-slate-100 flex-shrink-0">
              <Button
                size="sm"
                className="h-7 px-2 text-xs gap-1 bg-slate-900 hover:bg-slate-800 text-white"
                onClick={onClose}
                title="Exit room view"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit</span>
              </Button>
              {stagedItems.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none mr-1">
                  <Checkbox
                    checked={selected.size === stagedItems.length && stagedItems.length > 0}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                  Select all
                </label>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={toggleExpandAll}
                className="h-7 px-2 text-xs gap-1"
                disabled={roomItems.length === 0}
              >
                {allExpanded ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{allExpanded ? "Collapse All" : "Expand All"}</span>
              </Button>
              {selected.size > 0 && (
                <span className="text-[11px] text-slate-400">{selected.size} selected</span>
              )}
              <div className="flex-1" />
              {selected.size > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1"
                  onClick={() => sendItems(stagedItems.filter(i => selected.has(i.id)))}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Send {selected.size}
                </Button>
              )}
              {stagedItems.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={handleSendAll}
                  title="Send all staged cards to production"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Send All to Production</span>
                  <span className="md:hidden">Send All</span>
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 gap-1"
                onClick={handleAddCard}
              >
                <Plus className="w-3.5 h-3.5" /> Add Card
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No items in this room yet.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={handleAddCard}>
                    <Plus className="w-4 h-4 mr-1" /> Add first card
                  </Button>
                </div>
              ) : (
                <TypeGroupedGrid items={roomItems} renderCard={renderCard} gridClassName={gridClass} />
              )}
            </div>
          </div>

          {/* Room info — a peer pane, never a modal: docked to the right when there is
              room for both (iPad landscape / desktop), stacked above the cards with its
              own scroll region when narrower (iPad portrait). Tapping or scrolling the
              cards never hides it; the top-bar Room Info button collapses it. */}
          {infoOpen && (
            <aside
              className={
                wide
                  ? "flex-shrink-0 flex flex-col w-[42%] xl:w-[44%] border-l border-slate-200 bg-white min-h-0 overflow-hidden"
                  : "order-first flex-shrink-0 flex flex-col border-b border-slate-200 bg-white min-h-0 overflow-hidden"
              }
              style={wide ? undefined : { height: "45%" }}
            >
              {paneContent}
            </aside>
          )}
        </div>
      </div>

      <ProductionItemForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setEditingItem(null); }}
        onSubmit={(data) => {
          const finalData = { ...data, is_job_info: false, project_id: project.id, project_name: project.project_name, room_name: data.room_name || activeRoom };
          if (editingItem?.id) updateMutation.mutate({ id: editingItem.id, data: finalData });
          else createMutation.mutate(finalData);
        }}
        initialData={editingItem ? { ...editingItem } : null}
        rooms={project.rooms || []}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>,
    document.body
  );
}