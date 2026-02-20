import { useState, useCallback } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, FileText, ClipboardList } from "lucide-react";
import ProductionItemForm from "../components/production/ProductionItemForm";
import PDFAnnotator from "../components/production/PDFAnnotator";
import PickupItemForm from "../components/pickup/PickupItemForm";

const productionColumns = [
  { id: "face_frame", label: "Face Frame", color: "bg-blue-50" },
  { id: "spray", label: "Spray", color: "bg-purple-50" },
  { id: "build", label: "Build", color: "bg-amber-50" },
  { id: "complete", label: "Complete", color: "bg-green-50" }
];

export default function ShopProduction() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [annotatingPdf, setAnnotatingPdf] = useState(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [currentAnnotations, setCurrentAnnotations] = useState([]);
  const [pickupItem, setPickupItem] = useState(null); // { project_id, project_name, room_name }
  const [editingPts, setEditingPts] = useState(null); // { itemId, fileIdx }

  const { data: items = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
    initialData: []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list()
  });

  const getProjectColor = (projectId) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.card_color || null;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionItems"] });
      setShowForm(false);
      setEditingItem(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, syncToProject }) => {
      // Strip out any File/Blob objects from files array before saving
      const safeData = {
        ...data,
        files: (data.files || []).map(f => ({
          name: f.name,
          url: f.url,
          pts: f.pts,
          annotations: f.annotations
        }))
      };
      await base44.entities.ProductionItem.update(id, safeData);
      // Sync PTS back to the project's room files
      if (syncToProject && safeData.files && syncToProject.project_id && syncToProject.room_name) {
        const projList = await base44.entities.Project.filter({ id: syncToProject.project_id });
        const proj = projList[0];
        if (proj?.rooms) {
          const updatedRooms = proj.rooms.map(room => {
            if (room.room_name !== syncToProject.room_name) return room;
            return {
              ...room,
              files: (room.files || []).map(rf => {
                const match = safeData.files.find(pf => pf.url === rf.url || pf.name === rf.name);
                return match ? { ...rf, pts: match.pts } : rf;
              })
            };
          });
          await base44.entities.Project.update(syncToProject.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
    },
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

  const createPickupMutation = useMutation({
    mutationFn: (data) => base44.entities.PickupItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
      setPickupItem(null);
    }
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId && result.destination.index === result.source.index) return;

    const itemId = result.draggableId;
    const newStage = result.destination.droppableId;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Safe files — only plain serializable fields, never blobs
    const safeFiles = (item.files || []).map(f => ({
      name: f.name,
      url: f.url,
      pts: f.pts !== undefined ? Number(f.pts) : undefined,
      annotations: f.annotations
    }));

    const updatePayload = {
      name: item.name,
      type: item.type,
      stage: newStage,
      project_id: item.project_id,
      project_name: item.project_name,
      room_name: item.room_name,
      notes: item.notes,
      files: safeFiles,
      // Stamp the date when moved to complete
      completed_date: newStage === "complete" && item.stage !== "complete"
        ? format(new Date(), "yyyy-MM-dd")
        : item.completed_date
    };

    // Optimistically update cache so UI is instant
    queryClient.setQueryData(["productionItems"], (old = []) =>
      old.map(i => i.id === itemId ? { ...i, stage: newStage, files: safeFiles, completed_date: updatePayload.completed_date } : i)
    );

    await base44.entities.ProductionItem.update(itemId, updatePayload);
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
    
    // Sync back to project if this item came from a project
    if (item?.project_id) {
      try {
        const project = await base44.entities.Project.filter({ id: item.project_id }).then(res => res[0]);
        if (project?.rooms) {
          const updatedRooms = project.rooms.map(room => {
            if (room.room_name === item.room_name && room.files) {
              return {
                ...room,
                files: room.files.map(file => {
                  // Match by file_id (url) or by file name as fallback
                  const isMatch = item.file_id
                    ? file.url === item.file_id
                    : item.files?.some(f => f.url === file.url || f.name === file.name);
                  return isMatch
                    ? { ...file, in_production: true, production_stage: newStage }
                    : file;
                })
              };
            }
            return room;
          });
          await base44.entities.Project.update(item.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["project", item.project_id] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      } catch (error) {
        console.error("Failed to sync to project:", error);
      }
    }
  };

  // Inline PTS update — saves immediately to DB and syncs to project
  const handleInlinePtsChange = async (item, fileIndex, newPts) => {
    const updatedFiles = (item.files || []).map((f, i) =>
      i === fileIndex ? { ...f, pts: newPts === "" ? undefined : Number(newPts) } : f
    );

    // Optimistically update the cache
    queryClient.setQueryData(["productionItems"], (old = []) =>
      old.map(i => i.id === item.id ? { ...i, files: updatedFiles } : i)
    );

    // Save to ProductionItem
    await base44.entities.ProductionItem.update(item.id, { files: updatedFiles });

    // Sync PTS back to the Project's room files
    if (item.project_id && item.room_name) {
      const projList = await base44.entities.Project.filter({ id: item.project_id });
      const proj = projList[0];
      if (proj?.rooms) {
        const updatedRooms = proj.rooms.map(room => {
          if (room.room_name !== item.room_name) return room;
          return {
            ...room,
            files: (room.files || []).map(rf => {
              const match = updatedFiles.find(pf => pf.url === rf.url || pf.name === rf.name);
              return match !== undefined ? { ...rf, pts: match.pts } : rf;
            })
          };
        });
        await base44.entities.Project.update(item.project_id, { rooms: updatedRooms });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
    }
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
      data: { files: updatedFiles },
      syncToProject: item.project_id ? { project_id: item.project_id, room_name: item.room_name } : null
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
          <div className="flex items-center gap-4">
            {/* PTS Tracker — based on Complete stage items only */}
            {(() => {
              const now = new Date();
              const todayStr = format(now, "yyyy-MM-dd");
              const weekStart = startOfWeek(now, { weekStartsOn: 1 });
              const monthStart = startOfMonth(now);

              const completedItems = items.filter(i => i.stage === "complete");

              const getPts = (filtered) =>
                filtered.reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);

              const dayPts = getPts(completedItems.filter(i => i.completed_date === todayStr));
              const weekPts = getPts(completedItems.filter(i => i.completed_date && new Date(i.completed_date) >= weekStart));
              const monthPts = getPts(completedItems.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart));
              const totalPts = getPts(completedItems);

              return (
                <div className="flex gap-2">
                  {[{ label: "Day", val: dayPts }, { label: "Week", val: weekPts }, { label: "Month", val: monthPts }, { label: "All Time", val: totalPts, accent: true }].map(({ label, val, accent }) => (
                    <div key={label} className={`text-center rounded-lg px-3 py-2 shadow-sm border ${accent ? "bg-green-600 border-green-600" : "bg-white border-slate-200"}`}>
                      <p className={`text-xs font-medium ${accent ? "text-green-100" : "text-slate-500"}`}>{label}</p>
                      <p className={`text-lg font-bold ${accent ? "text-white" : "text-green-700"}`}>{val} <span className="text-xs font-semibold opacity-70">PTS</span></p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <Button onClick={() => setShowForm(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
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
                                   className={`p-4 bg-white border-0 shadow-sm transition-shadow overflow-hidden ${
                                     snapshot.isDragging ? "shadow-lg" : ""
                                   }`}
                                   style={(() => { const c = getProjectColor(item.project_id); return c ? { borderLeft: `4px solid ${c}`, backgroundColor: c + "18" } : {}; })()}
                                  >
                                    {item.project_name && (
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-slate-500 font-medium">{item.project_name}{item.room_name ? ` · ${item.room_name}` : ''}</p>
                                        {item.project_id && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setPickupItem({ project_id: item.project_id, project_name: item.project_name, room_name: item.room_name, production_item_id: item.id }); }}
                                            className="text-amber-600 hover:text-amber-700 flex items-center gap-1 text-xs"
                                            title="Add pickup item for this job"
                                          >
                                            <ClipboardList className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-slate-900">{item.name}</h3>
                                        {item.files && item.files.some(f => f.pts) && (
                                          <span className="text-xs font-bold text-amber-600">
                                            {item.files.reduce((s, f) => s + (f.pts || 0), 0)} PTS total
                                          </span>
                                        )}
                                      </div>
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
                                               <div className="relative">
                                                 <img 
                                                   src={file.url} 
                                                   alt={file.name} 
                                                   className="w-full rounded-md border border-slate-200"
                                                 />
                                                 <div className="absolute top-1 right-1 flex items-center gap-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 shadow">
                                                   <span className="text-xs font-semibold text-slate-500">PTS</span>
                                                   {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                                                     <input
                                                       type="number"
                                                       min="0"
                                                       defaultValue={file.pts ?? ""}
                                                       autoFocus
                                                       onClick={e => e.stopPropagation()}
                                                       onBlur={(e) => { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                                                       onKeyDown={(e) => { if (e.key === 'Enter') { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                                                       className="w-10 text-xs text-center font-bold text-amber-600 border-none outline-none bg-transparent"
                                                       placeholder="0"
                                                     />
                                                   ) : (
                                                     <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }} className="text-xs font-bold text-amber-600 min-w-[24px] text-center hover:underline">
                                                       {file.pts ?? "—"}
                                                     </button>
                                                   )}
                                                 </div>
                                               </div>
                                             ) : file.url.match(/\.pdf$/i) ? (
                                              <div className="rounded-md border border-slate-200 overflow-hidden">
                                                <iframe
                                                  src={file.url}
                                                  title={file.name}
                                                  className="w-full"
                                                  style={{ height: "260px", border: "none" }}
                                                />
                                                <div className="flex items-center gap-2 p-2 bg-slate-50 border-t border-slate-200">
                                                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                  <span className="text-slate-700 flex-1 truncate text-xs">{file.name}</span>
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-xs font-semibold text-slate-500">PTS</span>
                                                    {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        defaultValue={file.pts ?? ""}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                        onBlur={(e) => { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                                                        className="w-12 h-6 text-xs border border-amber-300 rounded px-1 text-center font-bold text-amber-600 bg-amber-50"
                                                        placeholder="0"
                                                      />
                                                    ) : (
                                                      <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }} className="h-6 px-2 text-xs border border-amber-200 rounded font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 min-w-[40px] text-center">
                                                        {file.pts ?? "—"}
                                                      </button>
                                                    )}
                                                  </div>
                                                  {file.annotations && file.annotations.length > 0 && (
                                                    <Badge className="bg-emerald-600 text-xs">
                                                      {file.annotations.length} notes
                                                    </Badge>
                                                  )}
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 px-2 text-xs"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleAnnotatePdf(item, idx);
                                                    }}
                                                  >
                                                    Annotate
                                                  </Button>
                                                </div>
                                              </div>
                                             ) : (
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(file.url, '_blank');
                                                  }}
                                                  className="text-amber-600 hover:text-amber-700 underline text-left flex-1"
                                                >
                                                  {file.name}
                                                </button>
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs font-semibold text-slate-500">PTS</span>
                                                  {editingPts?.itemId === item.id && editingPts?.fileIdx === idx ? (
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      defaultValue={file.pts ?? ""}
                                                      autoFocus
                                                      onClick={e => e.stopPropagation()}
                                                      onBlur={(e) => { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); }}
                                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleInlinePtsChange(item, idx, e.target.value); setEditingPts(null); } }}
                                                      className="w-12 h-6 text-xs border border-amber-300 rounded px-1 text-center font-bold text-amber-600"
                                                      placeholder="0"
                                                    />
                                                  ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingPts({ itemId: item.id, fileIdx: idx }); }} className="h-6 px-2 text-xs border border-amber-200 rounded font-bold text-amber-600 hover:bg-amber-50 min-w-[40px] text-center">
                                                      {file.pts ?? "—"}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
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
              updateMutation.mutate({
                id: editingItem.id,
                data: { ...data },
                syncToProject: editingItem.project_id ? {
                  project_id: editingItem.project_id,
                  room_name: editingItem.room_name
                } : null
              });
            } else {
              createMutation.mutate(data);
            }
          }}
          initialData={editingItem ? { ...editingItem } : null}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        {/* Pickup Item Form */}
        {pickupItem && (
          <PickupItemForm
            open={!!pickupItem}
            onOpenChange={(open) => { if (!open) setPickupItem(null); }}
            onSubmit={(data) => createPickupMutation.mutate({ ...data, source: "production", production_item_id: pickupItem.production_item_id })}
            projectId={pickupItem.project_id}
            projectName={pickupItem.project_name}
            rooms={projects.find(p => p.id === pickupItem.project_id)?.rooms || []}
            initialData={{ room_name: pickupItem.room_name }}
            isLoading={createPickupMutation.isPending}
          />
        )}

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