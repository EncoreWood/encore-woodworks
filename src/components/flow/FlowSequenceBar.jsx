import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ZONE_COLORS } from "./flowConstants";

export default function FlowSequenceBar({ zones, selectedFlowObj, onFlowSequenceReorder, onReorder }) {
  let sequenced = [];
  let isFlowMode = false;

  if (selectedFlowObj) {
    // Use the flow's sequence field (ordered zone IDs)
    isFlowMode = true;
    let ids = [];
    try { ids = JSON.parse(selectedFlowObj.sequence || "[]"); } catch { ids = []; }
    // If empty, auto-build from flow_tags + flow_order
    if (ids.length === 0) {
      const tagged = zones.filter((z) => (z.flow_tags || []).includes(selectedFlowObj.name));
      tagged.sort((a, b) => (a.flow_order ?? 999) - (b.flow_order ?? 999));
      ids = tagged.map((z) => z.id);
    }
    sequenced = ids.map((id) => zones.find((z) => z.id === id)).filter(Boolean);
  } else {
    // Show all zones with flow_order, sorted
    sequenced = [...zones].filter((z) => z.flow_order != null);
    sequenced.sort((a, b) => a.flow_order - b.flow_order);
  }

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = [...sequenced];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    if (isFlowMode) {
      onFlowSequenceReorder(reordered.map((z) => z.id));
    } else {
      const updates = reordered.map((z, i) => ({ id: z.id, flow_order: i + 1 }));
      onReorder(updates);
    }
  };

  if (sequenced.length === 0) return null;

  const flowHex = selectedFlowObj ? ZONE_COLORS[selectedFlowObj.color]?.hex : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Flow Sequence {selectedFlowObj ? `· ${selectedFlowObj.name}` : "· All"}
      </p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="flow-seq" direction="horizontal">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex items-center gap-1 overflow-x-auto pb-1">
              {sequenced.map((zone, index) => {
                const colorClass = ZONE_COLORS[zone.color]?.zone || ZONE_COLORS.blue.zone;
                return (
                  <Draggable key={zone.id} draggableId={zone.id} index={index}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium whitespace-nowrap touch-none cursor-grab active:cursor-grabbing",
                          colorClass,
                          snapshot.isDragging && "shadow-lg ring-2 ring-amber-400"
                        )}
                        style={flowHex ? { borderColor: flowHex } : undefined}
                      >
                        <span className="text-xs font-bold opacity-60">{index + 1}.</span>
                        <span>{zone.icon} {zone.name}</span>
                        {index < sequenced.length - 1 && <span className="text-slate-400 ml-1">→</span>}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}