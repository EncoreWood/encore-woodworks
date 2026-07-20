import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import FlowCanvas from "@/components/flow/FlowCanvas";
import ZoneEditor from "@/components/flow/ZoneEditor";
import FlowSequenceBar from "@/components/flow/FlowSequenceBar";
import AddZoneDialog from "@/components/flow/AddZoneDialog";
import { DEFAULT_ZONES, CANVAS_INCHES } from "@/components/flow/flowConstants";

export default function Flow() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["shopFlowAreas"],
    queryFn: () => base44.entities.ShopFlowArea.list(),
    staleTime: 15000,
  });

  // Auto-seed default zones on first load
  const seedMutation = useMutation({
    mutationFn: () => base44.entities.ShopFlowArea.bulkCreate(DEFAULT_ZONES),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });

  useEffect(() => {
    if (!isLoading && zones.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [isLoading, zones.length, seedMutation.isPending]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlowArea.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShopFlowArea.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShopFlowArea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] });
      setSelectedId(null);
    },
  });

  // Optimistic local update during drag/resize (no API call until release)
  const handleDragMove = (id, x, y, width, height) => {
    queryClient.setQueryData(["shopFlowAreas"], (old = []) =>
      old.map(z => z.id === id ? { ...z, x, y, width, height } : z)
    );
  };

  const handleDragEnd = (id) => {
    const current = queryClient.getQueryData(["shopFlowAreas"])?.find(z => z.id === id);
    if (current) {
      updateMutation.mutate({ id, data: { x: current.x, y: current.y, width: current.width, height: current.height } });
    }
  };

  const handleSequenceReorder = async (updates) => {
    // Optimistic update
    queryClient.setQueryData(["shopFlowAreas"], (old = []) =>
      old.map(z => {
        const u = updates.find(x => x.id === z.id);
        return u ? { ...z, flow_order: u.flow_order } : z;
      })
    );
    await base44.entities.ShopFlowArea.bulkUpdate(updates);
    queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] });
  };

  const handleCreate = (data) => {
    createMutation.mutate({
      ...data,
      x: CANVAS_INCHES / 2 - 50,
      y: CANVAS_INCHES / 2 - 40,
      width: 100,
      height: 70,
    });
  };

  const selectedZone = zones.find(z => z.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Shop Flow</h1>
        <Button onClick={() => setShowAddDialog(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-1.5" />Add Zone
        </Button>
      </div>

      {/* Canvas */}
      <FlowCanvas
        zones={zones}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        isLoading={isLoading}
      />

      {/* Flow Sequence Bar */}
      <div className="mt-4">
        <FlowSequenceBar zones={zones} onReorder={handleSequenceReorder} />
      </div>

      {/* Zone Editor Panel */}
      {selectedZone && (
        <ZoneEditor
          zone={selectedZone}
          onUpdate={(data) => updateMutation.mutate({ id: selectedZone.id, data })}
          onDelete={() => deleteMutation.mutate(selectedZone.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Add Zone Dialog */}
      <AddZoneDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreate={handleCreate} />
    </div>
  );
}