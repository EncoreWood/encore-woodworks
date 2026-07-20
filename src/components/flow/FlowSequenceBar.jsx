import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ZONE_COLORS } from "./flowConstants";

export default function FlowSequenceBar({ zones, onReorder }) {
  const sequenced = [...zones]
    .filter(z => z.flow_order != null)
    .sort((a, b) => a.flow_order - b.flow_order);

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = [...sequenced];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((z, i) => ({ id: z.id, flow_order: i + 1 }));
    onReorder(updates);
  };

  if (sequenced.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Flow Sequence</p>
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