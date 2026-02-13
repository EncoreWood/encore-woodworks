import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, MapPin, Calendar, DollarSign, MessageCircle, Plus, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ProjectForm from "../components/projects/ProjectForm";
import TaskForm from "../components/projects/TaskForm";

const statusColumnsByTab = {
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
  const [activeTab, setActiveTab] = useState("pre-production");
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
    mutationFn: ({ id, status }) => base44.entities.Project.update(id, { status }),
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

  const getProjectsByStatus = (status) => {
    const filtered = projects.filter((p) => p.status === status);
    // Filter by project type for side projects tab
    if (activeTab === "side-projects") {
      return filtered.filter((p) => p.project_type === "custom");
    }
    // Exclude side projects from other tabs
    if (activeTab !== "side-projects") {
      return filtered.filter((p) => p.project_type !== "custom");
    }
    return filtered;
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pre-production">Pre Production</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="side-projects">Side Projects</TabsTrigger>
          </TabsList>

          {Object.keys(statusColumnsByTab).map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey} className="mt-0">
              <div className="mb-4 flex justify-end">
                {tabKey === "side-projects" && (
                  <Button
                    onClick={() => setShowProjectForm(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Side Project
                  </Button>
                )}
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {statusColumnsByTab[tabKey].map((column) => {
                    const columnProjects = getProjectsByStatus(column.id);
                    return (
                      <div key={column.id} className="flex-shrink-0 w-80">
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="font-semibold text-slate-700">{column.label}</h2>
                          <Badge variant="outline" className="text-xs">
                            {columnProjects.length}
                          </Badge>
                        </div>

                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[200px] rounded-lg p-3 transition-colors ${
                                snapshot.isDraggingOver ? "bg-slate-200" : column.color
                              }`}
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
                                              className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                                                snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                              }`}
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
                                         <Button
                                           variant="outline"
                                           size="sm"
                                           className="w-full mt-2"
                                           onClick={(e) => handleChatClick(e, project)}
                                         >
                                           <MessageCircle className="w-3 h-3 mr-2" />
                                           {chatRooms.find(r => r.project_id === project.id) ? 'View Chat' : 'Add Chat'}
                                         </Button>
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
          onOpenChange={setShowProjectForm}
          onSubmit={(projectData) => {
            // For side projects, set project_type to custom
            if (activeTab === "side-projects") {
              projectData.project_type = "custom";
            }
            createMutation.mutate(projectData);
          }}
          isLoading={createMutation.isPending}
        />

        {/* Task Form */}
        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          projectId={taskProject?.id}
          projectName={taskProject?.project_name}
          onSubmit={(data) => createTaskMutation.mutate(data)}
          isLoading={createTaskMutation.isPending}
        />
      </div>
    </div>
  );
}