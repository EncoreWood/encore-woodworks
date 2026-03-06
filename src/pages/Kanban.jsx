import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import usePullToRefresh from "@/components/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, MapPin, Calendar, DollarSign, MessageCircle, Plus, CheckCircle2, Circle, Settings, Pencil, Trash2, ArrowRight, GripVertical, Palette, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ProjectForm from "../components/projects/ProjectForm";
import TaskForm from "../components/projects/TaskForm";
import PickupItemForm from "../components/pickup/PickupItemForm";

const allStatusOptions = [
  { id: "inquiry", label: "Inquiry" },
  { id: "side_projects", label: "Side Projects" },
  { id: "quoted", label: "Quoted" },
  { id: "approved", label: "Approved" },
  { id: "in_design", label: "In Design" },
  { id: "in_production", label: "In Production" },
  { id: "ready_for_install", label: "Ready for Install" },
  { id: "installing", label: "Installing" },
  { id: "completed", label: "Completed" },
  { id: "on_hold", label: "On Hold" }
];

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-slate-100 text-slate-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

export default function Kanban() {
  const queryClient = useQueryClient();
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskProject, setTaskProject] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("kanban_active_tab") || "pre-production";
  });
  const [newProjectStatus, setNewProjectStatus] = useState(null);
  const [showTabEditor, setShowTabEditor] = useState(false);
  const [editingTab, setEditingTab] = useState(null); // { tabKey, columns }
  const [moveProjectDialog, setMoveProjectDialog] = useState(null); // { project }
  const [moveTarget, setMoveTarget] = useState({ tab: "", status: "" });

  const defaultColumnsByTab = {
    "pre-production": [
      { id: "inquiry", label: "Inquiry", color: "bg-slate-100" },
      { id: "quoted", label: "Quoted", color: "bg-blue-50" },
      { id: "approved", label: "Approved", color: "bg-emerald-50" }
    ],
    production: [
      { id: "in_design", label: "In Design", color: "bg-violet-50" },
      { id: "in_production", label: "In Production", color: "bg-amber-50" },
      { id: "ready_for_install", label: "Ready", color: "bg-cyan-50" },
      { id: "installing", label: "Installing", color: "bg-orange-50" },
      { id: "on_hold", label: "On Hold", color: "bg-red-50" }
    ],
    completed: [
      { id: "completed", label: "Completed", color: "bg-emerald-50" }
    ],
    "side-projects": [
      { id: "side_projects", label: "Side Projects", color: "bg-slate-200" },
      { id: "inquiry", label: "Inquiry", color: "bg-slate-100" },
      { id: "quoted", label: "Quoted", color: "bg-blue-50" },
      { id: "approved", label: "Approved", color: "bg-emerald-50" },
      { id: "in_design", label: "In Design", color: "bg-violet-50" },
      { id: "in_production", label: "In Production", color: "bg-amber-50" },
      { id: "completed", label: "Completed", color: "bg-emerald-50" }
    ]
  };

  const loadCustomColumns = () => {
    try {
      const saved = localStorage.getItem("kanban_custom_columns");
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultColumnsByTab;
  };

  const [customColumnsByTab, setCustomColumnsByTab] = useState(loadCustomColumns);

  const projectRefs = useRef({});

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ["chatRooms"],
    queryFn: () => base44.entities.ChatRoom.list()
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, project_type }) => base44.entities.Project.update(id, { status, ...(project_type ? { project_type } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  const createChatMutation = useMutation({
    mutationFn: (chatData) => base44.entities.ChatRoom.create(chatData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatRooms"] });
      setChatDialogOpen(false);
    }
  });

  const linkChatMutation = useMutation({
    mutationFn: ({ projectId, roomId }) => 
      base44.entities.ChatRoom.update(roomId, { project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatRooms"] });
      setChatDialogOpen(false);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowProjectForm(false);
      setNewProjectStatus(null);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowTaskForm(false);
      setTaskProject(null);
    }
  });

  const createPickupMutation = useMutation({
    mutationFn: (data) => base44.entities.PickupItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
      setPickupFormProject(null);
    }
  });

  const updateColorMutation = useMutation({
    mutationFn: ({ id, card_color }) => base44.entities.Project.update(id, { card_color }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });

  const [colorPickerProjectId, setColorPickerProjectId] = useState(null);
  const [pickupFormProject, setPickupFormProject] = useState(null);

  const cardColors = [
    "", "#fee2e2", "#fef3c7", "#d1fae5", "#dbeafe", "#ede9fe",
    "#fce7f3", "#cffafe", "#f0fdf4", "#fef9c3", "#e0e7ff",
    "#f97316", "#ef4444", "#22c55e", "#3b82f6", "#a855f7",
    "#ec4899", "#14b8a6", "#f59e0b", "#6366f1", "#64748b"
  ];

  const handleChatClick = (e, project) => {
    e.preventDefault();
    setSelectedProject(project);
    setChatDialogOpen(true);
  };

  const projectChat = chatRooms.find(r => r.project_id === selectedProject?.id);
  const availableChats = chatRooms.filter(r => !r.project_id);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const projectId = draggableId;
    const newStatus = destination.droppableId;

    updateMutation.mutate({ id: projectId, status: newStatus });
  };

  const getProjectsByStatus = (status, tabKey) => {
    const tab = tabKey || activeTab;
    const filtered = projects.filter((p) => p.status === status);
    if (tab === "side-projects") {
      return filtered.filter((p) => p.project_type === "custom");
    }
    if (tab !== "side-projects") {
      return filtered.filter((p) => p.project_type !== "custom");
    }
    return filtered;
  };

  const handleMoveProject = () => {
    if (!moveProjectDialog || !moveTarget.status) return;
    const updates = { status: moveTarget.status };
    if (moveTarget.tab === "side-projects") updates.project_type = "custom";
    else if (moveProjectDialog.project.project_type === "custom") updates.project_type = "kitchen"; // reset type if moving out of side projects
    updateMutation.mutate({ id: moveProjectDialog.project.id, ...updates });
    setMoveProjectDialog(null);
    setMoveTarget({ tab: "", status: "" });
  };

  const saveTabColumns = (tabKey, columns) => {
    const updated = { ...customColumnsByTab, [tabKey]: columns };
    setCustomColumnsByTab(updated);
    localStorage.setItem("kanban_custom_columns", JSON.stringify(updated));
    setEditingTab(null);
    setShowTabEditor(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("project");
    
    if (projectId && projectRefs.current[projectId]) {
      setTimeout(() => {
        projectRefs.current[projectId]?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
        projectRefs.current[projectId]?.classList.add("ring-4", "ring-amber-400", "ring-opacity-50");
        setTimeout(() => {
          projectRefs.current[projectId]?.classList.remove("ring-4", "ring-amber-400", "ring-opacity-50");
        }, 2000);
      }, 100);
    }
  }, [projects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const handleAddTask = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskProject(project);
    setShowTaskForm(true);
  };

  const getProjectTasks = (projectId) => {
    return allTasks.filter(t => t.project_id === projectId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Board</h1>
            <p className="text-slate-500 mt-1">Drag projects to update their status</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setEditingTab({ tabKey: activeTab, columns: JSON.parse(JSON.stringify(customColumnsByTab[activeTab] || [])) }); setShowTabEditor(true); }}>
            <Settings className="w-4 h-4 mr-2" />
            Edit Stages
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); localStorage.setItem("kanban_active_tab", tab); }} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pre-production">Pre Production</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="side-projects">Side Projects</TabsTrigger>
          </TabsList>

          {Object.keys(customColumnsByTab).map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey} className="mt-0">
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {(customColumnsByTab[tabKey] || []).map((column) => {
                    const columnProjects = getProjectsByStatus(column.id, tabKey);
                    return (
                      <div key={column.id} className="flex-shrink-0 w-80">
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="font-semibold text-slate-700">{column.label}</h2>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {columnProjects.length}
                            </Badge>
                            <button
                              onClick={() => {
                                setNewProjectStatus(column.id);
                                setShowProjectForm(true);
                              }}
                              className="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-colors"
                              title={`Add project to ${column.label}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`rounded-lg p-3 transition-colors overflow-y-auto ${
                                snapshot.isDraggingOver ? "bg-slate-200" : column.color
                              }`}
                              style={{ maxHeight: "calc(100vh - 260px)", minHeight: 200 }}
                            >
                              <div className="space-y-3">
                                {columnProjects.map((project, index) => (
                                  <Draggable
                                     key={project.id}
                                     draggableId={project.id}
                                     index={index}
                                   >
                                     {(provided, snapshot) => (
                                        <div
                                          ref={(el) => {
                                            provided.innerRef(el);
                                            projectRefs.current[project.id] = el;
                                          }}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                        >
                                          <Link to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                                           <Card
                                             className={`p-4 cursor-pointer hover:shadow-md transition-all overflow-hidden ${
                                               snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                             }`}
                                             style={project.card_color ? { borderLeft: `4px solid ${project.card_color}`, backgroundColor: project.card_color + "18" } : {}}
                                           >
                                            <div className="space-y-3">
                                              <div>
                                                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                                                  {project.project_name}
                                                </h3>
                                                 <div className="flex items-center gap-2">
                                                   <Badge
                                                     className={`text-xs border-0 ${
                                                       priorityColors[project.priority]
                                                     }`}
                                                   >
                                                     {project.priority}
                                                   </Badge>
                                                 </div>
                                               </div>

                                               <div className="space-y-2 text-xs text-slate-600">
                                                 <div className="flex items-center gap-2">
                                                   <User className="w-3 h-3 flex-shrink-0" />
                                                   <span className="truncate">{project.client_name}</span>
                                                 </div>
                                                 {project.address && (
                                                   <div className="flex items-center gap-2">
                                                     <MapPin className="w-3 h-3 flex-shrink-0" />
                                                     <span className="truncate">{project.address}</span>
                                                   </div>
                                                 )}
                                                 {project.estimated_completion && (
                                                   <div className="flex items-center gap-2">
                                                     <Calendar className="w-3 h-3 flex-shrink-0" />
                                                     <span>
                                                       {format(new Date(project.estimated_completion), "MMM d")}
                                                     </span>
                                                   </div>
                                                 )}
                                                 {project.estimated_budget && (
                                                   <div className="flex items-center gap-2">
                                                     <DollarSign className="w-3 h-3 flex-shrink-0" />
                                                     <span>${project.estimated_budget.toLocaleString()}</span>
                                                   </div>
                                                 )}
                                               </div>

                                               {(project.project_manager_name || project.shop_manager_name) && (
                                                 <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                                                   {project.project_manager_name && (
                                                     <div className="flex items-center gap-1">
                                                       <span className="text-slate-500 font-medium">PM:</span>
                                                       <span className="text-slate-700">{project.project_manager_name}</span>
                                                     </div>
                                                   )}
                                                   {project.shop_manager_name && (
                                                     <div className="flex items-center gap-1">
                                                       <span className="text-slate-500 font-medium">SM:</span>
                                                       <span className="text-slate-700">{project.shop_manager_name}</span>
                                                     </div>
                                                   )}
                                                 </div>
                                               )}

                                               {project.rooms && project.rooms.length > 0 && (
                                                 <div className="pt-2 border-t border-slate-100">
                                                   <span className="text-xs text-slate-500">
                                                     {project.rooms.length} room{project.rooms.length !== 1 ? 's' : ''}
                                                   </span>
                                                 </div>
                                               )}

                                               {/* Tasks Section */}
                                               {(() => {
                                                 const projectTasks = getProjectTasks(project.id);
                                                 const completedTasks = projectTasks.filter(t => t.status === "completed").length;
                                                 return (
                                                   <div className="mt-3 pt-3 border-t border-slate-100">
                                                     <div className="flex items-center justify-between mb-2">
                                                       <span className="text-xs font-medium text-slate-600">
                                                         Tasks {projectTasks.length > 0 && `(${completedTasks}/${projectTasks.length})`}
                                                       </span>
                                                       <button
                                                         onClick={(e) => handleAddTask(e, project)}
                                                         className="text-amber-600 hover:text-amber-700 text-xs flex items-center gap-1"
                                                       >
                                                         <Plus className="w-3 h-3" />
                                                         Add
                                                       </button>
                                                     </div>
                                                     {projectTasks.length > 0 ? (
                                                       <div className="space-y-1">
                                                         {projectTasks.slice(0, 2).map((task) => (
                                                           <div key={task.id} className="flex items-center gap-1.5 text-xs">
                                                             {task.status === "completed" ? (
                                                               <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                                             ) : (
                                                               <Circle className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                             )}
                                                             <span className={cn(
                                                               "truncate flex-1",
                                                               task.status === "completed" ? "line-through text-slate-400" : "text-slate-600"
                                                             )}>
                                                               {task.title}
                                                             </span>
                                                           </div>
                                                         ))}
                                                         {projectTasks.length > 2 && (
                                                           <p className="text-xs text-slate-400 mt-1">+{projectTasks.length - 2} more</p>
                                                         )}
                                                       </div>
                                                     ) : (
                                                       <p className="text-xs text-slate-400">No tasks yet</p>
                                                     )}
                                                   </div>
                                                 );
                                               })()}
                                             </div>
                                           </Card>
                                         </Link>
                                         <div className="flex gap-1 mt-2 flex-wrap">
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             className="flex-1"
                                             onClick={(e) => handleChatClick(e, project)}
                                           >
                                             <MessageCircle className="w-3 h-3 mr-1" />
                                             Chat
                                           </Button>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             className="flex-1 text-slate-600"
                                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoveProjectDialog({ project }); setMoveTarget({ tab: "", status: "" }); }}
                                           >
                                             <ArrowRight className="w-3 h-3 mr-1" />
                                             Move
                                           </Button>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             className="text-amber-600 hover:text-amber-700 hover:border-amber-300"
                                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPickupFormProject(project); }}
                                             title="Add pickup item"
                                           >
                                             <ClipboardList className="w-3 h-3 mr-1" />
                                             Pickup
                                           </Button>
                                           <div className="relative">
                                             <button
                                               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setColorPickerProjectId(colorPickerProjectId === project.id ? null : project.id); }}
                                               className="h-8 w-8 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                               style={project.card_color ? { backgroundColor: project.card_color } : {}}
                                               title="Set card color"
                                             >
                                               {!project.card_color && <Palette className="w-3 h-3 text-slate-400" />}
                                             </button>
                                             {colorPickerProjectId === project.id && (
                                               <div
                                                 className="absolute bottom-10 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-44"
                                                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                               >
                                                 <div className="grid grid-cols-5 gap-1">
                                                   {cardColors.map((color, ci) => (
                                                     <button
                                                       key={ci}
                                                       onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateColorMutation.mutate({ id: project.id, card_color: color }); setColorPickerProjectId(null); }}
                                                       className="w-7 h-7 rounded border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center"
                                                       style={{ backgroundColor: color || "#ffffff" }}
                                                       title={color || "No color"}
                                                     >
                                                       {!color && <span className="text-slate-300 text-xs">✕</span>}
                                                     </button>
                                                   ))}
                                                 </div>
                                               </div>
                                             )}
                                           </div>
                                         </div>
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
          ))}
        </Tabs>

        {/* Chat Dialog */}
        <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedProject?.project_name} - Chat Management
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {projectChat ? (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-900 mb-2">
                    Chat: {projectChat.name}
                  </p>
                  <Link to={createPageUrl("ChatBoard") + "?room=" + projectChat.id}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Open Chat
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Create New Chat
                    </p>
                    <Button
                      className="w-full"
                      onClick={() =>
                        createChatMutation.mutate({
                          name: selectedProject?.project_name,
                          project_id: selectedProject?.id
                        })
                      }
                      disabled={createChatMutation.isPending}
                    >
                      Create Chat
                    </Button>
                  </div>

                  {availableChats.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Or Link Existing Chat
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {availableChats.map((chat) => (
                          <Button
                            key={chat.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() =>
                              linkChatMutation.mutate({
                                projectId: selectedProject?.id,
                                roomId: chat.id
                              })
                            }
                            disabled={linkChatMutation.isPending}
                          >
                            {chat.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Project Form */}
        <ProjectForm
          open={showProjectForm}
          onOpenChange={(open) => {
            setShowProjectForm(open);
            if (!open) setNewProjectStatus(null);
          }}
          onSubmit={(projectData) => {
            if (activeTab === "side-projects") {
              projectData.project_type = "custom";
            }
            if (newProjectStatus) {
              projectData.status = newProjectStatus;
            }
            createMutation.mutate(projectData);
          }}
          isLoading={createMutation.isPending}
        />

        {/* Pickup Item Form */}
        {pickupFormProject && (
          <PickupItemForm
            open={!!pickupFormProject}
            onOpenChange={(open) => { if (!open) setPickupFormProject(null); }}
            onSubmit={(data) => createPickupMutation.mutate({ ...data, source: "project" })}
            projectId={pickupFormProject?.id}
            projectName={pickupFormProject?.project_name}
            rooms={pickupFormProject?.rooms || []}
            isLoading={createPickupMutation.isPending}
          />
        )}

        {/* Task Form */}
        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          projectId={taskProject?.id}
          projectName={taskProject?.project_name}
          onSubmit={(data) => createTaskMutation.mutate(data)}
          isLoading={createTaskMutation.isPending}
        />

        {/* Move Project Dialog */}
        <Dialog open={!!moveProjectDialog} onOpenChange={(open) => { if (!open) { setMoveProjectDialog(null); setMoveTarget({ tab: "", status: "" }); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Move Project</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 mb-3 font-medium">{moveProjectDialog?.project.project_name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Group</label>
                <Select value={moveTarget.tab} onValueChange={(val) => setMoveTarget({ tab: val, status: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-production">Pre Production</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="side-projects">Side Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {moveTarget.tab && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Stage</label>
                  <Select value={moveTarget.status} onValueChange={(val) => setMoveTarget(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(customColumnsByTab[moveTarget.tab] || []).map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={!moveTarget.status}
                onClick={handleMoveProject}
              >
                Move Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Stages Dialog */}
        <Dialog open={showTabEditor} onOpenChange={setShowTabEditor}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Stages — {editingTab?.tabKey?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</DialogTitle>
            </DialogHeader>
            {editingTab && (
              <div className="space-y-3">
                {editingTab.columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <Input
                      value={col.label}
                      onChange={(e) => {
                        const updated = [...editingTab.columns];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setEditingTab({ ...editingTab, columns: updated });
                      }}
                      className="h-8 text-sm flex-1"
                      placeholder="Stage label"
                    />
                    <Select value={col.id} onValueChange={(val) => {
                      const updated = [...editingTab.columns];
                      updated[idx] = { ...updated[idx], id: val };
                      setEditingTab({ ...editingTab, columns: updated });
                    }}>
                      <SelectTrigger className="h-8 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allStatusOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => {
                        const updated = editingTab.columns.filter((_, i) => i !== idx);
                        setEditingTab({ ...editingTab, columns: updated });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditingTab({ ...editingTab, columns: [...editingTab.columns, { id: "inquiry", label: "New Stage", color: "bg-slate-100" }] })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Stage
                </Button>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowTabEditor(false)}>Cancel</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => saveTabColumns(editingTab.tabKey, editingTab.columns)}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}