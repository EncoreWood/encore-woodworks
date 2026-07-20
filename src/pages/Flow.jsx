import { useState, useEffect, useRef } from "react";
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
import FlowSequenceBuilder from "@/components/flow/FlowSequenceBuilder";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateFlowPath, pruneRemovedZones } from "@/components/flow/flowPathUtils";
import { DEFAULT_ZONES, DEFAULT_FLOWS, CANVAS_INCHES, FLOW_COLORS } from "@/components/flow/flowConstants";

export default function Flow() {
  const queryClient = useQueryClient();
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFlowManager, setShowFlowManager] = useState(false);
  const [editingSequenceFlow, setEditingSequenceFlow] = useState(null);
  const [checkedFlows, setCheckedFlows] = useState(new Set());
  const [selectedPathId, setSelectedPathId] = useState(null);
  const [pendingRegenFlow, setPendingRegenFlow] = useState(null);
  const checkedInitRef = useRef(false);
  const pathGenRef = useRef(false);

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

  // Migrate old inch-based positions (x > 100) to percentage-based
  const migratingRef = useRef(false);
  useEffect(() => {
    if (!isLoading && zones.length > 0 && !migratingRef.current) {
      const needsMigration = zones.some((z) => z.x > 100 || z.y > 100 || z.width > 100 || z.height > 100);
      if (needsMigration) {
        migratingRef.current = true;
        const updates = zones.map((z) => {
          const def = DEFAULT_ZONES.find((d) => d.name === z.name);
          if (def) return { id: z.id, x: def.x, y: def.y, width: def.width, height: def.height };
          // Proportional conversion for custom zones
          return {
            id: z.id,
            x: Math.min((z.x / CANVAS_INCHES) * 100, 100),
            y: Math.min((z.y / CANVAS_INCHES) * 100, 100),
            width: Math.min((z.width / CANVAS_INCHES) * 100, 100),
            height: Math.min((z.height / CANVAS_INCHES) * 100, 100),
          };
        });
        base44.entities.ShopFlowArea.bulkUpdate(updates).then(() =>
          queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] })
        );
      }
    }
  }, [isLoading, zones]);

  // Initialize checked flows (all visible by default)
  useEffect(() => {
    if (!checkedInitRef.current && flows.length > 0) {
      checkedInitRef.current = true;
      setCheckedFlows(new Set(flows.map((f) => f.name)));
    }
  }, [flows]);

  // Auto-generate flow paths for existing sequences on initial load
  useEffect(() => {
    if (pathGenRef.current || isLoading || flows.length === 0 || zones.length === 0) return;
    pathGenRef.current = true;
    (async () => {
      let created = false;
      for (const flow of flows) {
        let seqIds = [];
        try { seqIds = JSON.parse(flow.sequence || "[]"); } catch { seqIds = []; }
        if (seqIds.length < 2) continue;
        const hasPath = arrows.some((a) => a.arrow_type === "flow_path" && a.flow_name === flow.name);
        if (hasPath) continue;
        const pathData = generateFlowPath(zones, seqIds);
        if (!pathData) continue;
        await base44.entities.ShopFlowArrow.create({
          arrow_type: "flow_path",
          flow_name: flow.name,
          start_x: pathData.points[0][0],
          start_y: pathData.points[0][1],
          end_x: pathData.points[pathData.points.length - 1][0],
          end_y: pathData.points[pathData.points.length - 1][1],
          label: JSON.stringify(pathData),
          color: FLOW_COLORS[flow.color] || "#64748b",
          stroke_width: 2,
          arrowhead_style: "filled",
        });
        created = true;
      }
      if (created) queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    })();
  }, [isLoading, flows, arrows, zones]);

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
  const updateFlowSequence = useMutation({
    mutationFn: ({ id, sequence }) => base44.entities.ShopFlow.update(id, { sequence }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlows"] }),
  });

  // Helper: delete all flow_path arrows by ID
  const deleteFlowPaths = async (ids) => {
    await Promise.all(ids.map((id) => base44.entities.ShopFlowArrow.delete(id)));
  };

  // Helper: build a flow_path record from generated path data
  const createFlowPathRecord = (flow, pathData) => ({
    arrow_type: "flow_path",
    flow_name: flow.name,
    start_x: pathData.points[0][0],
    start_y: pathData.points[0][1],
    end_x: pathData.points[pathData.points.length - 1][0],
    end_y: pathData.points[pathData.points.length - 1][1],
    label: JSON.stringify(pathData),
    color: FLOW_COLORS[flow.color] || "#64748b",
    stroke_width: 2,
    arrowhead_style: "filled",
  });

  // Ensure a flow has a path; delete old + regenerate if auto, prompt if manual
  const ensureFlowPath = async (flow, sequenceIds) => {
    if (!sequenceIds || sequenceIds.length < 2) return;
    const existingPaths = arrows.filter((a) => a.arrow_type === "flow_path" && a.flow_name === flow.name);
    const pathData = generateFlowPath(zones, sequenceIds);
    if (!pathData) return;

    if (existingPaths.length === 0) {
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
      return;
    }

    const manuallyEdited = existingPaths.some((p) => {
      try { return JSON.parse(p.label || "{}").auto_generated === false; } catch { return false; }
    });

    if (manuallyEdited) {
      setPendingRegenFlow({ flow, sequenceIds, existingPathIds: existingPaths.map((p) => p.id) });
    } else {
      await deleteFlowPaths(existingPaths.map((p) => p.id));
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    }
  };

  const handleRegeneratePath = async () => {
    if (!pendingRegenFlow) return;
    const { flow, sequenceIds, existingPathIds } = pendingRegenFlow;
    await deleteFlowPaths(existingPathIds);
    const pathData = generateFlowPath(zones, sequenceIds);
    if (pathData) {
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
    }
    queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    setPendingRegenFlow(null);
  };

  // Keep manually edited path but prune segments for zones removed from the sequence
  const handleKeepEdits = async () => {
    if (!pendingRegenFlow) return;
    const { sequenceIds, existingPathIds } = pendingRegenFlow;
    const existingPaths = arrows.filter((a) => existingPathIds.includes(a.id));
    for (const path of existingPaths) {
      try {
        const pathData = JSON.parse(path.label || "{}");
        const pruned = pruneRemovedZones(pathData, sequenceIds);
        if (pruned.points.length < 2) {
          await base44.entities.ShopFlowArrow.delete(path.id);
        } else {
          await base44.entities.ShopFlowArrow.update(path.id, {
            start_x: pruned.points[0][0],
            start_y: pruned.points[0][1],
            end_x: pruned.points[pruned.points.length - 1][0],
            end_y: pruned.points[pruned.points.length - 1][1],
            label: JSON.stringify(pruned),
          });
        }
      } catch { /* skip unparseable */ }
    }
    queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    setPendingRegenFlow(null);
  };

  // Rename flow and update flow_name on all its path arrows
  const handleRenameFlow = async (id, newName) => {
    const oldFlow = flows.find((f) => f.id === id);
    if (!oldFlow || oldFlow.name === newName) return;
    await renameFlow.mutateAsync({ id, data: { name: newName } });
    const flowArrows = arrows.filter((a) => a.arrow_type === "flow_path" && a.flow_name === oldFlow.name);
    if (flowArrows.length > 0) {
      await Promise.all(flowArrows.map((a) => base44.entities.ShopFlowArrow.update(a.id, { flow_name: newName })));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    }
    setCheckedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(oldFlow.name)) { next.delete(oldFlow.name); next.add(newName); }
      return next;
    });
    if (selectedFlow === oldFlow.name) setSelectedFlow(newName);
  };

  // Flow visibility handlers
  const toggleFlowVisibility = (flowName) => {
    setCheckedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(flowName)) next.delete(flowName);
      else next.add(flowName);
      return next;
    });
    if (checkedFlows.has(flowName) && selectedFlow === flowName) setSelectedFlow(null);
  };
  const showAllFlows = () => setCheckedFlows(new Set(flows.map((f) => f.name)));
  const showSelectedOnly = () => setCheckedFlows(new Set());

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

  const handleFlowSequenceReorder = async (newSequenceIds) => {
    const flowObj = flows.find((f) => f.name === selectedFlow);
    if (!flowObj) return;
    queryClient.setQueryData(["shopFlows"], (old = []) =>
      old.map((f) => (f.id === flowObj.id ? { ...f, sequence: JSON.stringify(newSequenceIds) } : f))
    );
    await updateFlowSequence.mutateAsync({ id: flowObj.id, sequence: JSON.stringify(newSequenceIds) });
    await ensureFlowPath(flowObj, newSequenceIds);
  };

  const handleCreateZone = (data) => {
    createZone.mutate({ ...data, x: 40, y: 40, width: 15, height: 15, flow_tags: [] });
  };

  const handleSelectZone = (id) => { setSelectedZoneId(id); if (id) { setSelectedArrowId(null); setSelectedPathId(null); } };
  const handleSelectArrow = (id) => { setSelectedArrowId(id); if (id) { setSelectedZoneId(null); setSelectedPathId(null); } };
  const handleSelectPath = (id) => { setSelectedPathId(id); if (id) { setSelectedZoneId(null); setSelectedArrowId(null); } };
  const handleSelectFlow = (flowName) => {
    setSelectedFlow(flowName);
    if (flowName) setCheckedFlows((prev) => new Set([...prev, flowName]));
    setSelectedPathId(null);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const selectedArrow = arrows.find((a) => a.id === selectedArrowId);
  const selectedFlowObj = flows.find((f) => f.name === selectedFlow) || null;
  const flowSequenceIds = (() => {
    if (!selectedFlowObj) return [];
    let ids = [];
    try { ids = JSON.parse(selectedFlowObj.sequence || "[]"); } catch { ids = []; }
    if (ids.length === 0) {
      const tagged = zones.filter((z) => (z.flow_tags || []).includes(selectedFlow));
      tagged.sort((a, b) => (a.flow_order ?? 999) - (b.flow_order ?? 999));
      ids = tagged.map((z) => z.id);
    }
    return ids;
  })();

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
          checkedFlows={checkedFlows}
          selectedPathId={selectedPathId}
          onSelectPath={handleSelectPath}
          onUpdatePath={(id, data) => updateArrow.mutate({ id, data })}
          isLoading={isLoading}
        />
      </div>

      {/* Flow Sequence Bar */}
      <div className="p-2 pt-0 flex-shrink-0">
        <FlowSequenceBar zones={zones} selectedFlowObj={selectedFlowObj} onFlowSequenceReorder={handleFlowSequenceReorder} onReorder={handleSequenceReorder} />
      </div>

      {/* Modals */}
      <AddZoneDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreate={handleCreateZone} />
      <FlowManager
        open={showFlowManager}
        onOpenChange={setShowFlowManager}
        flows={flows}
        onCreate={createFlow.mutate}
        onDelete={deleteFlow.mutate}
        onRename={handleRenameFlow}
        selectedFlow={selectedFlow}
        onSelectFlow={handleSelectFlow}
        onEditSequence={(flow) => { setEditingSequenceFlow(flow); setShowFlowManager(false); }}
        checkedFlows={checkedFlows}
        onToggleFlowVisibility={toggleFlowVisibility}
        onShowAllFlows={showAllFlows}
        onShowSelectedOnly={showSelectedOnly}
      />
      <FlowSequenceBuilder
        flow={editingSequenceFlow}
        zones={zones}
        open={!!editingSequenceFlow}
        onOpenChange={(open) => { if (!open) setEditingSequenceFlow(null); }}
        onSave={async (id, sequence) => {
          await updateFlowSequence.mutateAsync({ id, sequence });
          const flow = flows.find((f) => f.id === id);
          if (flow) {
            let seqIds = [];
            try { seqIds = JSON.parse(sequence || "[]"); } catch { seqIds = []; }
            await ensureFlowPath(flow, seqIds);
          }
        }}
      />

      {/* Regeneration prompt */}
      <Dialog open={!!pendingRegenFlow} onOpenChange={(open) => !open && setPendingRegenFlow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sequence changed — regenerate path?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">The flow sequence was updated but the path has manual edits.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleKeepEdits}>Keep Edits</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleRegeneratePath}>Regenerate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}