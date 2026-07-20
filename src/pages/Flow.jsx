import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Shuffle, X } from "lucide-react";
import FlowCanvas from "@/components/flow/FlowCanvas";
import ZoneEditor from "@/components/flow/ZoneEditor";
import ArrowEditor from "@/components/flow/ArrowEditor";
import FlowSequenceBar from "@/components/flow/FlowSequenceBar";
import AddZoneDialog from "@/components/flow/AddZoneDialog";
import FlowManager from "@/components/flow/FlowManager";
import { DEFAULT_ZONES, DEFAULT_FLOWS, CANVAS_INCHES } from "@/components/flow/flowConstants";

export default function Flow() {
  const queryClient = useQueryClient();
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFlowManager, setShowFlowManager] = useState(false);

  // Queries
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["shopFlowAreas"],
    queryFn: () => base44.entities.ShopFlowArea.list(),
    staleTime: 15000,
  });
  const { data: arrows = [] } = useQuery({
    queryKey: ["shopFlowArrows"],
    queryFn: () => base44.entities.ShopFlowArrow.list(),
    staleTime: 15000,
  });
  const { data: flows = [] } = useQuery({
    queryKey: ["shopFlows"],
    queryFn: () => base44.entities.ShopFlow.list(),
    staleTime: 15000,
  });

  const isLoading = zonesLoading;

  // Auto-seed zones
  const seedZones = useMutation({
    mutationFn: () => base44.entities.ShopFlowArea.bulkCreate(DEFAULT_ZONES),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  useEffect(() => {
    if (!isLoading && zones.length === 0 && !seedZones.isPending) seedZones.mutate();
  }, [isLoading, zones.length, seedZones.isPending]);

  // Auto-seed flows
  const seedFlows = useMutation({
    mutationFn: () => base44.entities.ShopFlow.bulkCreate(DEFAULT_FLOWS),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlows"] }),
  });
  useEffect(() => {
    if (!isLoading && flows.length === 0 && !seedFlows.isPending) seedFlows.mutate();
  }, [isLoading, flows.length, seedFlows.isPending]);

  // Zone mutations
  const updateZone = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlowArea.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  const createZone = useMutation({
    mutationFn: (data) => base44.entities.ShopFlowArea.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  const deleteZone = useMutation({
    mutationFn: (id) => base44.entities.ShopFlowArea.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }); setSelectedZoneId(null); },
  });

  // Arrow mutations
  const createArrow = useMutation({
    mutationFn: (data) => base44.entities.ShopFlowArrow.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }),
  });
  const updateArrow = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlowArrow.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }),
  });
  const deleteArrow = useMutation({
    mutationFn: (id) => base44.entities.ShopFlowArrow.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }); setSelectedArrowId(null); },
  });

  // Flow mutations
  const createFlow = useMutation({
    mutationFn: (data) => base44.entities.ShopFlow.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlows"] }),
  });
  const deleteFlow = useMutation({
    mutationFn: (id) => base44.entities.ShopFlow.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlows"] }),
  });
  const renameFlow = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlow.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlows"] }),
  });

  // Drag handlers (optimistic local update, save on end)
  const handleDragMove = (id, x, y, width, height) => {
    queryClient.setQueryData(["shopFlowAreas"], (old = []) =>
      old.map((z) => (z.id === id ? { ...z, x, y, width, height } : z))
    );
  };
  const handleDragEnd = (id) => {
    const current = queryClient.getQueryData(["shopFlowAreas"])?.find((z) => z.id === id);
    if (current) updateZone.mutate({ id, data: { x: current.x, y: current.y, width: current.width, height: current.height } });
  };

  const handleSequenceReorder = async (updates) => {
    queryClient.setQueryData(["shopFlowAreas"], (old = []) =>
      old.map((z) => {
        const u = updates.find((x) => x.id === z.id);
        return u ? { ...z, flow_order: u.flow_order } : z;
      })
    );
    await base44.entities.ShopFlowArea.bulkUpdate(updates);
    queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] });
  };

  const handleCreateZone = (data) => {
    createZone.mutate({ ...data, x: CANVAS_INCHES / 2 - 50, y: CANVAS_INCHES / 2 - 40, width: 100, height: 70, flow_tags: [] });
  };

  const handleSelectZone = (id) => { setSelectedZoneId(id); if (id) setSelectedArrowId(null); };
  const handleSelectArrow = (id) => { setSelectedArrowId(id); if (id) setSelectedZoneId(null); };

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const selectedArrow = arrows.find((a) => a.id === selectedArrowId);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">Shop Flow</h1>
          {selectedFlow && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
              {selectedFlow}
              <button onClick={() => setSelectedFlow(null)}><X className="w-3 h-3" /></button>
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowFlowManager(true)}>
            <Shuffle className="w-4 h-4 mr-1.5" />Flows
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1.5" />Add Zone
          </Button>
        </div>
      </div>

      {/* Zone / Arrow Editor (top panel) */}
      {selectedZone && (
        <ZoneEditor
          zone={selectedZone}
          flows={flows}
          onUpdate={(data) => updateZone.mutate({ id: selectedZone.id, data })}
          onDelete={() => deleteZone.mutate(selectedZone.id)}
          onClose={() => setSelectedZoneId(null)}
        />
      )}
      {selectedArrow && (
        <ArrowEditor
          arrow={selectedArrow}
          flows={flows}
          onUpdate={(data) => updateArrow.mutate({ id: selectedArrow.id, data })}
          onDelete={() => deleteArrow.mutate(selectedArrow.id)}
          onClose={() => setSelectedArrowId(null)}
        />
      )}

      {/* Canvas */}
      <div className="flex-1 p-2 min-h-0">
        <FlowCanvas
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={handleSelectZone}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          arrows={arrows}
          selectedArrowId={selectedArrowId}
          onSelectArrow={handleSelectArrow}
          onArrowCreate={(data) => createArrow.mutate(data)}
          onArrowUpdate={(id, data) => updateArrow.mutate({ id, data })}
          selectedFlow={selectedFlow}
          isLoading={isLoading}
        />
      </div>

      {/* Flow Sequence Bar */}
      <div className="p-2 pt-0 flex-shrink-0">
        <FlowSequenceBar zones={zones} selectedFlow={selectedFlow} onReorder={handleSequenceReorder} />
      </div>

      {/* Modals */}
      <AddZoneDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreate={handleCreateZone} />
      <FlowManager
        open={showFlowManager}
        onOpenChange={setShowFlowManager}
        flows={flows}
        onCreate={createFlow.mutate}
        onDelete={deleteFlow.mutate}
        onRename={(id, name) => renameFlow.mutate({ id, data: { name } })}
        selectedFlow={selectedFlow}
        onSelectFlow={setSelectedFlow}
      />
    </div>
  );
}