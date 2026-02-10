import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import ProductionItemForm from "../components/production/ProductionItemForm";
import WoodworkingCalculator from "../components/production/WoodworkingCalculator";
import PDFAnnotator from "../components/production/PDFAnnotator";

const productionColumns = [
  { id: "face_frame", label: "Face Frame", color: "bg-blue-50" },
  { id: "spray", label: "Spray", color: "bg-purple-50" },
  { id: "build", label: "Build", color: "bg-amber-50" }
];

export default function ShopProduction() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [annotatingPdf, setAnnotatingPdf] = useState(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [currentAnnotations, setCurrentAnnotations] = useState([]);

  const { data: items = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      setShowForm(false);
      setEditingItem(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      setShowForm(false);
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const itemId = result.draggableId;
    const newStage = result.destination.droppableId;
    
    updateMutation.mutate({
      id: itemId,
      data: { stage: newStage }
    });
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
    updatedFiles[fileIndex] = {
      ...updatedFiles[fileIndex],
      annotations
    };

    updateMutation.mutate({
      id: item.id,
      data: { files: updatedFiles }
    });

    setAnnotatingPdf(null);
    setCurrentPdfUrl(null);
    setCurrentAnnotations([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shop Production</h1>
            <p className="text-slate-500 mt-1">Track projects through production stages</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="mb-6">
          <WoodworkingCalculator />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {productionColumns.map((column) => {
              const columnItems = items.filter((item) => item.stage === column.id);
              
              return (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-700">{column.label}</h2>
                    <Badge variant="outline" className="text-xs">
                      {columnItems.length}
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
                          {columnItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Card
                                    className={`p-4 bg-white border-0 shadow-sm transition-shadow ${
                                      snapshot.isDragging ? "shadow-lg" : ""
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <h3 className="font-medium text-slate-900">{item.name}</h3>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingItem(item);
                                            setShowForm(true);
                                          }}
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete "${item.name}"?`)) {
                                              deleteMutation.mutate(item.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                        <Badge
                                          variant="outline"
                                          className={
                                            item.type === "cabinet"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : item.type === "misc"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }
                                        >
                                          {item.type === "cabinet" ? "Cabinet" : item.type === "misc" ? "Misc" : "Pick up"}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    {item.notes && (
                                      <p className="text-sm text-slate-600 mb-3">{item.notes}</p>
                                    )}
                                    
                                    {item.files && item.files.length > 0 && (
                                      <div className="space-y-2 pt-2 border-t border-slate-100">
                                        {item.files.map((file, idx) => (
                                          <div key={idx} className="text-xs">
                                            {file.url && (file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                              <img 
                                                src={file.url} 
                                                alt={file.name} 
                                                className="w-full rounded-md border border-slate-200"
                                              />
                                            ) : file.url.match(/\.pdf$/i) ? (
                                              <div className="relative group">
                                                <iframe 
                                                  src={file.url} 
                                                  className="w-full h-48 rounded-md border border-slate-200"
                                                  title={file.name}
                                                />
                                                <Button
                                                  size="sm"
                                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-600 hover:bg-amber-700"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAnnotatePdf(item, idx);
                                                  }}
                                                >
                                                  <FileText className="w-3 h-3 mr-1" />
                                                  Annotate
                                                </Button>
                                                {file.annotations && file.annotations.length > 0 && (
                                                  <Badge className="absolute bottom-2 right-2 bg-emerald-600">
                                                    {file.annotations.length} notes
                                                  </Badge>
                                                )}
                                              </div>
                                            ) : (
                                              <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-amber-600 hover:text-amber-700 underline"
                                              >
                                                {file.name}
                                              </a>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </Card>
                                </div>
                              )}
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

        <ProductionItemForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingItem(null);
          }}
          onSubmit={(data) => {
            if (editingItem) {
              updateMutation.mutate({ id: editingItem.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          initialData={editingItem}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        {annotatingPdf && (
          <PDFAnnotator
            open={!!annotatingPdf}
            onOpenChange={() => {
              setAnnotatingPdf(null);
              setCurrentPdfUrl(null);
              setCurrentAnnotations([]);
            }}
            pdfUrl={currentPdfUrl}
            annotations={currentAnnotations}
            onSave={handleSaveAnnotations}
          />
        )}
      </div>
    </div>
  );
}