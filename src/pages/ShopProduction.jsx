import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const productionColumns = [
  { id: "face_frame", label: "Face Frame", color: "bg-blue-50" },
  { id: "spray", label: "Spray", color: "bg-purple-50" },
  { id: "build", label: "Build", color: "bg-amber-50" }
];

export default function ShopProduction() {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    // TODO: Update production stage when items are added
    console.log("Moved to:", result.destination.droppableId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shop Production</h1>
          <p className="text-slate-500 mt-1">Track projects through production stages</p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {productionColumns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">{column.label}</h2>
                  <Badge variant="outline" className="text-xs">
                    0
                  </Badge>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] rounded-lg p-3 transition-colors ${
                        snapshot.isDraggingOver ? "bg-slate-200" : column.color
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Cards will go here */}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}