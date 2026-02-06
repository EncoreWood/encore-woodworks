import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, MapPin, Calendar, DollarSign, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const statusColumns = [
  { id: "inquiry", label: "Inquiry", color: "bg-slate-100" },
  { id: "quoted", label: "Quoted", color: "bg-blue-50" },
  { id: "approved", label: "Approved", color: "bg-emerald-50" },
  { id: "in_design", label: "In Design", color: "bg-violet-50" },
  { id: "in_production", label: "In Production", color: "bg-amber-50" },
  { id: "ready_for_install", label: "Ready", color: "bg-cyan-50" },
  { id: "installing", label: "Installing", color: "bg-orange-50" },
  { id: "completed", label: "Completed", color: "bg-emerald-50" },
  { id: "on_hold", label: "On Hold", color: "bg-red-50" }
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

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ["chatRooms"],
    queryFn: () => base44.entities.ChatRoom.list()
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
    return projects.filter((p) => p.status === status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Board</h1>
          <p className="text-slate-500 mt-1">Drag projects to update their status</p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((column) => {
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
                                <Link to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
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

                                      {project.rooms && project.rooms.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100">
                                          <span className="text-xs text-slate-500">
                                            {project.rooms.length} room{project.rooms.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                </Link>
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
      </div>
    </div>
  );
}