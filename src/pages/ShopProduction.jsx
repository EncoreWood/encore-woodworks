import { useState } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Factory, Briefcase } from "lucide-react";
import ProductionItemForm from "../components/production/ProductionItemForm";
import PDFAnnotator from "../components/production/PDFAnnotator";
import PickupItemForm from "../components/pickup/PickupItemForm";
import ProductionCard from "../components/production/ProductionCard";

const productionColumns = [
  { id: "face_frame", label: "Face Frame", color: "bg-blue-50" },
  { id: "spray", label: "Spray", color: "bg-purple-50" },
  { id: "build", label: "Build", color: "bg-amber-50" },
  { id: "complete", label: "Complete", color: "bg-green-50" },
  { id: "on_hold", label: "On Hold", color: "bg-red-100" }
];

const ACTIVE_PROJECT_STATUSES = ["in_production", "ready_for_install", "installing", "in_design", "approved"];

export default function ShopProduction() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("production");
  const [showForm, setShowForm] = useState(false);
  const [jobInfoMode, setJobInfoMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [annotatingPdf, setAnnotatingPdf] = useState(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [currentAnnotations, setCurrentAnnotations] = useState([]);
  const [pickupItem, setPickupItem] = useState(null);
  const [editingPts, setEditingPts] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list(),
    initialData: []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list()
  });

  const activeProjects = projects.filter(p => ACTIVE_PROJECT_STATUSES.includes(p.status));

  const getProjectColor = (projectId) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.card_color || null;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productionItems"] }); setShowForm(false); setEditingItem(null); }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, syncToProject }) => {
      const safeData = { ...data, files: (data.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts, annotations: f.annotations })) };
      await base44.entities.ProductionItem.update(id, safeData);
      if (syncToProject && safeData.files && syncToProject.project_id && syncToProject.room_name) {
        const projList = await base44.entities.Project.filter({ id: syncToProject.project_id });
        const proj = projList[0];
        if (proj?.rooms) {
          const updatedRooms = proj.rooms.map(room => {
            if (room.room_name !== syncToProject.room_name) return room;
            return { ...room, files: (room.files || []).map(rf => { const match = safeData.files.find(pf => pf.url === rf.url || pf.name === rf.name); return match ? { ...rf, pts: match.pts } : rf; }) };
          });
          await base44.entities.Project.update(syncToProject.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productionItems"] }); setShowForm(false); setEditingItem(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["productionItems"] })
  });

  const createPickupMutation = useMutation({
    mutationFn: (data) => base44.entities.PickupItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pickupItems"] }); setPickupItem(null); }
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId && result.destination.index === result.source.index) return;

    const itemId = result.draggableId;
    const newStage = result.destination.droppableId;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const safeFiles = (item.files || []).map(f => ({ name: f.name, url: f.url, pts: f.pts !== undefined ? Number(f.pts) : undefined, annotations: f.annotations }));
    const updatePayload = {
      name: item.name, type: item.type, stage: newStage,
      project_id: item.project_id, project_name: item.project_name, room_name: item.room_name,
      notes: item.notes, files: safeFiles,
      completed_date: newStage === "complete" && item.stage !== "complete" ? format(new Date(), "yyyy-MM-dd") : item.completed_date
    };

    queryClient.setQueryData(["productionItems"], (old = []) =>
      old.map(i => i.id === itemId ? { ...i, stage: newStage, files: safeFiles, completed_date: updatePayload.completed_date } : i)
    );

    await base44.entities.ProductionItem.update(itemId, updatePayload);
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });

    if (item?.pickup_item_id) {
      try { await base44.entities.PickupItem.update(item.pickup_item_id, { production_stage: newStage }); queryClient.invalidateQueries({ queryKey: ["pickupItems"] }); } catch (e) {}
    }

    if (item?.project_id) {
      try {
        const project = await base44.entities.Project.filter({ id: item.project_id }).then(res => res[0]);
        if (project?.rooms) {
          const updatedRooms = project.rooms.map(room => {
            if (room.room_name === item.room_name && room.files) {
              return { ...room, files: room.files.map(file => { const isMatch = item.files?.some(f => f.url === file.url || f.name === file.name); return isMatch ? { ...file, in_production: true, production_stage: newStage } : file; }) };
            }
            return room;
          });
          await base44.entities.Project.update(item.project_id, { rooms: updatedRooms });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      } catch (error) {}
    }
  };

  const handleInlinePtsChange = async (item, fileIndex, newPts) => {
    const updatedFiles = (item.files || []).map((f, i) => i === fileIndex ? { ...f, pts: newPts === "" ? undefined : Number(newPts) } : f);
    queryClient.setQueryData(["productionItems"], (old = []) => old.map(i => i.id === item.id ? { ...i, files: updatedFiles } : i));
    await base44.entities.ProductionItem.update(item.id, { files: updatedFiles });
    if (item.project_id && item.room_name) {
      const projList = await base44.entities.Project.filter({ id: item.project_id });
      const proj = projList[0];
      if (proj?.rooms) {
        const updatedRooms = proj.rooms.map(room => {
          if (room.room_name !== item.room_name) return room;
          return { ...room, files: (room.files || []).map(rf => { const match = updatedFiles.find(pf => pf.url === rf.url || pf.name === rf.name); return match !== undefined ? { ...rf, pts: match.pts } : rf; }) };
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
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], annotations };
    updateMutation.mutate({ id: item.id, data: { files: updatedFiles }, syncToProject: item.project_id ? { project_id: item.project_id, room_name: item.room_name } : null });
    setAnnotatingPdf(null); setCurrentPdfUrl(null); setCurrentAnnotations([]);
  };

  // PTS stats
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const completedItems = items.filter(i => i.stage === "complete");
  const getPts = (filtered) => filtered.reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);
  const dayPts = getPts(completedItems.filter(i => i.completed_date === todayStr));
  const weekPts = getPts(completedItems.filter(i => i.completed_date && new Date(i.completed_date) >= weekStart));
  const monthPts = getPts(completedItems.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart));

  const sharedCardProps = {
    editingPts,
    setEditingPts,
    onInlinePtsChange: handleInlinePtsChange,
    onAnnotate: handleAnnotatePdf,
    getProjectColor,
    onPickup: (item) => setPickupItem({ project_id: item.project_id, project_name: item.project_name, room_name: item.room_name, production_item_id: item.id }),
    onEdit: (item) => { setEditingItem(item); setShowForm(true); },
    onDelete: (id) => deleteMutation.mutate(id),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Shop Production</h1>
            <p className="text-slate-500 mt-1">Track projects through production stages</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[{ label: "Day", val: dayPts }, { label: "Week", val: weekPts }, { label: "Month", val: monthPts }].map(({ label, val }) => (
                <div key={label} className="text-center rounded-lg px-3 py-2 shadow-sm border bg-white border-slate-200">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-green-700">{val} <span className="text-xs font-semibold opacity-70">PTS</span></p>
                </div>
              ))}
            </div>
            <Button onClick={() => { setJobInfoMode(false); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Factory className="w-4 h-4" /> Production
            </TabsTrigger>
            <TabsTrigger value="job_info" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Job Info
            </TabsTrigger>
          </TabsList>

          {/* ── PRODUCTION TAB ── */}
          <TabsContent value="production" className="mt-0">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {productionColumns.map((column, colIdx) => {
                  const columnItems = items.filter(i => i.stage === column.id && !i.is_job_info);
                  const laterStageIds = productionColumns.slice(colIdx + 1).map(c => c.id);
                  const todayColPts = items
                    .filter(i => laterStageIds.includes(i.stage) && i.completed_date === todayStr)
                    .reduce((sum, item) => sum + (item.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0), 0);

                  return (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-slate-700">{column.label}</h2>
                          {todayColPts > 0 && (
                            <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">{todayColPts} PTS</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">{columnItems.length}</Badge>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`rounded-lg p-3 transition-colors overflow-y-auto ${snapshot.isDraggingOver ? "bg-slate-200" : column.color}`}
                            style={{ maxHeight: "calc(100vh - 280px)", minHeight: 200 }}
                          >
                            <div className="space-y-3">
                              {columnItems.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                      <ProductionCard item={item} isDragging={snapshot.isDragging} {...sharedCardProps} />
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
          </TabsContent>

          {/* ── JOB INFO TAB ── */}
          <TabsContent value="job_info" className="mt-0">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { setJobInfoMode(true); setEditingItem(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" /> Add Job Info Item
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {activeProjects.map((project) => {
                  // Items whose project_id matches this project (any stage except complete/on_hold for job info view)
                  const projectItems = items.filter(i => i.project_id === project.id && i.is_job_info);

                  return (
                    <div key={project.id} className="flex-shrink-0 w-80">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {project.card_color && (
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.card_color }} />
                          )}
                          <h2 className="font-semibold text-slate-700 truncate">{project.project_name}</h2>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{projectItems.length}</Badge>
                      </div>
                      <Droppable droppableId={`jobinfo_${project.id}`} isDropDisabled={true}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="rounded-lg p-3 bg-slate-100 overflow-y-auto"
                            style={{ maxHeight: "calc(100vh - 280px)", minHeight: 120 }}
                          >
                            {projectItems.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">No production items</p>
                            ) : (
                              <div className="space-y-3">
                                {projectItems.map((item, index) => {
                                  // Find any linked production item (another item with this as pickup_item_id, or just show itself)
                                  return (
                                    <Draggable key={item.id} draggableId={`ji_${item.id}`} index={index} isDragDisabled={true}>
                                      {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                          <ProductionCard
                                            item={item}
                                            isDragging={false}
                                            editingPts={editingPts}
                                            setEditingPts={setEditingPts}
                                            onInlinePtsChange={handleInlinePtsChange}
                                            onAnnotate={handleAnnotatePdf}
                                            getProjectColor={getProjectColor}
                                            onPickup={(item) => setPickupItem({ project_id: item.project_id, project_name: item.project_name, room_name: item.room_name, production_item_id: item.id })}
                                            onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
                                            onDelete={(id) => deleteMutation.mutate(id)}
                                            showLinkButton={true}
                                            onLinkClick={() => setActiveTab("production")}
                                          />
                                          {/* Stage badge below card */}
                                          <div className="mt-1 flex justify-end">
                                            <Badge variant="outline" className="text-xs capitalize">{item.stage?.replace(/_/g, " ") || "—"}</Badge>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && (
                  <p className="text-slate-400 text-sm">No active projects found.</p>
                )}
              </div>
            </DragDropContext>
          </TabsContent>
        </Tabs>

        {/* Forms */}
        <ProductionItemForm
          open={showForm}
          onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingItem(null); setJobInfoMode(false); } }}
          onSubmit={(data) => {
            if (editingItem) {
              updateMutation.mutate({ id: editingItem.id, data: { ...data }, syncToProject: editingItem.project_id ? { project_id: editingItem.project_id, room_name: editingItem.room_name } : null });
            } else {
              createMutation.mutate(data);
            }
          }}
          initialData={editingItem ? { ...editingItem } : null}
          isLoading={createMutation.isPending || updateMutation.isPending}
          jobInfoProjects={jobInfoMode ? activeProjects : undefined}
        />

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

        {annotatingPdf && currentPdfUrl && (
          <PDFAnnotator
            open={true}
            onOpenChange={() => { setAnnotatingPdf(null); setCurrentPdfUrl(null); setCurrentAnnotations([]); }}
            pdfUrl={currentPdfUrl}
            annotations={currentAnnotations}
            onSave={handleSaveAnnotations}
          />
        )}
      </div>
    </div>
  );
}