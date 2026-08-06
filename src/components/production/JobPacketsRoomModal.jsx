import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, ArrowRight } from "lucide-react";
import ProductionCard from "./ProductionCard";
import ProductionItemForm from "./ProductionItemForm";

const STAGE_LABELS = { cut: "Cut", face_frame: "Face Frame", spray: "Spray", build: "Build", complete: "Complete", on_hold: "On Hold" };

/**
 * Self-contained "Job Packets" room modal — the SAME modal used on Shop Production → Job Packets.
 * Renders a small trigger button (with a live count badge) and opens the staging grid +
 * Add Card / Send to Production flows, pre-scoped to one project_id + room_name. Reuses the
 * same ProductionCard + ProductionItemForm building blocks, so both entry points show the same
 * underlying ProductionItem records and behave identically.
 */
export default function JobPacketsRoomModal({ project, roomName, items, currentUser }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingPts, setEditingPts] = useState(null);

  const roomItems = (items || []).filter(i => i.project_id === project.id && i.room_name === roomName && !i.is_job_info);
  const stagedItems = roomItems.filter(i => !i.stage);
  const inProductionItems = roomItems.filter(i => i.stage);
  const count = roomItems.length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    queryClient.invalidateQueries({ queryKey: ["productionItems", project.id] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditingItem(null); }
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const safeData = { ...data, files: (data.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations })) };
      await base44.entities.ProductionItem.update(id, safeData);
    },
    onSuccess: () => { invalidate(); setShowForm(false); setEditingItem(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionItem.delete(id),
    onSuccess: () => invalidate()
  });

  const handleAddCard = () => {
    setEditingItem({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      is_job_info: false,
      type: "cabinet",
      stage: null
    });
    setShowForm(true);
  };

  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const handleSendToProduction = async (selectedItems) => {
    for (const item of selectedItems) {
      await base44.entities.ProductionItem.update(item.id, { ...item, is_job_info: false, stage: item.stage || "cut" });
    }
    invalidate();
    setSelected(new Set());
  };

  const handleSendAll = () => {
    if (stagedItems.length === 0) return;
    if (!window.confirm(`Send ${stagedItems.length} card${stagedItems.length !== 1 ? "s" : ""} to production?`)) return;
    handleSendToProduction(stagedItems);
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

  const sharedCardProps = {
    editingPts,
    setEditingPts,
    currentUser,
    getProjectColor: () => project.card_color || null,
    onEdit: handleEdit,
    onDelete: (id) => deleteMutation.mutate(id),
    onMoveStage: async (item, newStage) => {
      await base44.entities.ProductionItem.update(item.id, { stage: newStage });
      invalidate();
    },
    onUpdate: async (id, fields) => {
      await base44.entities.ProductionItem.update(id, fields);
      invalidate();
    },
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 gap-1"
        title="Job Packets for this room"
      >
        <Package className="w-3 h-3" />
        Job Packets{count > 0 && ` (${count})`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-lg">
                  <span className="text-slate-500 font-normal">{project.project_name} /</span> {roomName}
                </DialogTitle>
                <p className="text-sm text-slate-400 mt-0.5">
                  {stagedItems.length} staged{inProductionItems.length > 0 && ` · ${inProductionItems.length} in production`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => handleSendToProduction(stagedItems.filter(i => selected.has(i.id)))}>
                    <ArrowRight className="w-4 h-4" />
                    Send {selected.size} to Production
                  </Button>
                )}
                {stagedItems.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50" onClick={handleSendAll} title="Send all staged cards to production">
                    <ArrowRight className="w-4 h-4" />
                    Send All to Production
                  </Button>
                )}
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-2" onClick={handleAddCard}>
                  <Plus className="w-4 h-4" /> Add Card
                </Button>
              </div>
            </div>
          </DialogHeader>

          {stagedItems.length > 0 && (
            <div className="flex items-center gap-2 px-1 pt-1 pb-2 border-b border-slate-100">
              <Checkbox
                checked={selected.size === stagedItems.length && stagedItems.length > 0}
                onCheckedChange={toggleAll}
                id="jp-select-all"
              />
              <label htmlFor="jp-select-all" className="text-sm text-slate-500 cursor-pointer select-none">Select all</label>
              {selected.size > 0 && <span className="ml-2 text-xs text-slate-400">{selected.size} selected</span>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {roomItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Package className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No items in this room yet.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={handleAddCard}>
                  <Plus className="w-4 h-4 mr-1" /> Add first card
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1 pt-3">
                {roomItems.map(item => {
                  const isStaged = !item.stage;
                  return (
                  <div key={item.id} className="relative">
                    {isStaged && (
                      <>
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selected.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            className="bg-white shadow"
                          />
                        </div>
                        <div className="absolute top-2 right-2 z-10">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs bg-white hover:bg-green-50 hover:border-green-400 hover:text-green-700"
                            onClick={() => handleSendToProduction([item])}
                            title="Send to Production"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                      {isStaged ? (
                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] px-2 py-0.5">Staged</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5">In Production: {STAGE_LABELS[item.stage] || item.stage}</Badge>
                      )}
                    </div>
                    <div className={`rounded-lg transition-all ${isStaged && selected.has(item.id) ? "ring-2 ring-amber-400" : ""}`} onClick={isStaged ? () => toggleSelect(item.id) : undefined}>
                      <ProductionCard item={item} isDragging={false} {...sharedCardProps} />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProductionItemForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setEditingItem(null); }}
        onSubmit={(data) => {
          const finalData = { ...data, is_job_info: false, project_id: project.id, project_name: project.project_name, room_name: roomName };
          if (editingItem?.id) {
            updateMutation.mutate({ id: editingItem.id, data: finalData });
          } else {
            createMutation.mutate(finalData);
          }
        }}
        initialData={editingItem ? { ...editingItem } : null}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}