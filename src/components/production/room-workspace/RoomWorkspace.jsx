import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, ArrowRight, X, PanelRightOpen, PanelRightClose, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import TypeGroupedGrid from "@/components/production/TypeGroupedGrid";
import ProductionItemForm from "@/components/production/ProductionItemForm";
import RoomCardTile from "./RoomCardTile";
import RoomInfoPane from "./RoomInfoPane";
import { roomPts } from "@/lib/roomPts";

/**
 * Combined Room Workspace — production cards (left) and room info (right) in one
 * full-screen split view. Replaces the separate room card dialog and the room
 * detail modal: clicking a room opens this. The right pane collapses so the
 * cards can use the full width, and becomes a slide-over drawer on narrow
 * screens (iPad portrait / phone).
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
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [rightOpen, setRightOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);

  // Narrow screens (iPad portrait / phone) show the room info as a slide-over drawer
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setNarrow(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [localEditingPts, setLocalEditingPts] = useState(null);

  const roomItems = (items || []).filter(
    i => i.project_id === project.id && i.room_name === roomName && !i.is_job_info
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
    if (onAddCard) { onAddCard(); return; }
    setEditingItem({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
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

  const paneDocked = rightOpen && !narrow;
  const gridClass = paneDocked
    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2";

  const paneContent = <RoomInfoPane project={project} roomName={roomName} />;

  return (
    <div className="fixed inset-0 z-40 bg-slate-200/80 p-1 sm:p-2">
      <div className="h-full w-full flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate leading-tight">
              <span className="text-slate-400 font-normal">{project.project_name} /</span> {roomName}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">
              {stagedItems.length} staged{inProductionItems.length > 0 && ` · ${inProductionItems.length} in production`}
              <span className="ml-1.5 font-semibold text-amber-700">{roomPts(roomItems)} PTS</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRightOpen(o => !o)}
            className={`flex items-center gap-1 flex-shrink-0 h-7 px-2 rounded-lg border text-xs font-medium transition-colors ${
              rightOpen
                ? "bg-amber-600 border-amber-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title={rightOpen ? "Hide room info" : "Show room info"}
          >
            {rightOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Room Info</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* LEFT — production cards */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex flex-wrap items-center gap-1.5 px-2 sm:px-3 py-1.5 border-b border-slate-100 flex-shrink-0">
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
                  Send All to Production
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

          {/* RIGHT — room info (desktop / iPad landscape) */}
          {paneDocked && (
            <aside className="hidden lg:flex lg:flex-col lg:w-[42%] xl:w-[40%] border-l border-slate-200 bg-white min-h-0 overflow-hidden">
              {paneContent}
            </aside>
          )}
        </div>

        {/* RIGHT — slide-over drawer on narrow screens */}
        {rightOpen && narrow && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-slate-900/40" onClick={() => setRightOpen(false)} />
            <aside className="w-[92%] max-w-md bg-white shadow-2xl flex flex-col min-h-0 border-l border-slate-200">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Room Info</p>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  title="Hide room info"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">{paneContent}</div>
            </aside>
          </div>
        )}
      </div>

      <ProductionItemForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setEditingItem(null); }}
        onSubmit={(data) => {
          const finalData = { ...data, is_job_info: false, project_id: project.id, project_name: project.project_name, room_name: data.room_name || roomName };
          if (editingItem?.id) updateMutation.mutate({ id: editingItem.id, data: finalData });
          else createMutation.mutate(finalData);
        }}
        initialData={editingItem ? { ...editingItem } : null}
        rooms={project.rooms || []}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}