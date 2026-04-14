import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Plus, CheckCircle2, Clock, AlertCircle, Truck, Home, Zap, GripVertical, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PHASE_CONFIG = {
  template: { label: "Template", color: "bg-gray-200 text-gray-700" },
  phase_1: { label: "Phase 1", color: "bg-blue-200 text-blue-700" },
  phase_2: { label: "Phase 2", color: "bg-purple-200 text-purple-700" },
  phase_3: { label: "Phase 3", color: "bg-pink-200 text-pink-700" },
};

const STATUS_CONFIG = {
  planned: { label: "Planned", color: "bg-slate-100 text-slate-700", icon: Home },
  prepping: { label: "Prepping", color: "bg-orange-100 text-orange-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  on_hold: { label: "On Hold", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  ready_for_delivery: { label: "Ready for Delivery", color: "bg-green-100 text-green-700", icon: Truck },
  installed: { label: "Installed", color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const STATUS_WORKFLOW = [
  "planned",
  "prepping",
  "in_progress",
  "on_hold",
  "ready_for_delivery",
  "installed",
  "complete",
];

export default function ProductionPlanning() {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: roomPlanning = [] } = useQuery({
    queryKey: ["room_planning", selectedProjectId],
    queryFn: () =>
      selectedProjectId
        ? base44.entities.RoomProductionPlanning.filter({ project_id: selectedProjectId })
        : Promise.resolve([]),
    enabled: !!selectedProjectId,
  });

  const { data: jobPackets = [] } = useQuery({
    queryKey: ["job_packets", selectedProjectId],
    queryFn: () =>
      selectedProjectId
        ? base44.entities.JobPacket.filter({ project_id: selectedProjectId })
        : Promise.resolve([]),
    enabled: !!selectedProjectId,
  });

  const { data: productionItems = [] } = useQuery({
    queryKey: ["production_items", selectedProjectId],
    queryFn: () =>
      selectedProjectId
        ? base44.entities.ProductionItem.filter({ project_id: selectedProjectId })
        : Promise.resolve([]),
    enabled: !!selectedProjectId,
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectRooms = selectedProject?.rooms || [];

  // Initialize missing room planning records on project selection
  useEffect(() => {
    if (!selectedProject) return;

    const initRooms = async () => {
      const existing = await base44.entities.RoomProductionPlanning.filter({
        project_id: selectedProject.id,
      });
      const existingNames = new Set(existing.map((r) => r.room_name));

      const missing = projectRooms.filter((r) => !existingNames.has(r.room_name));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((room) =>
            base44.entities.RoomProductionPlanning.create({
              project_id: selectedProject.id,
              project_name: selectedProject.project_name,
              room_name: room.room_name,
              phase: "phase_1",
              status: "planned",
              planned_points: 0,
              completed_points: 0,
              notes: "",
              updated_at: new Date().toISOString(),
            })
          )
        );
        queryClient.invalidateQueries({ queryKey: ["room_planning", selectedProject.id] });
      }
    };

    initRooms();
  }, [selectedProject]);

  const handlePhaseChange = async (roomPlanning, newPhase) => {
    await base44.entities.RoomProductionPlanning.update(roomPlanning.id, {
      phase: newPhase,
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["room_planning", selectedProjectId] });
  };

  const handleStatusChange = async (roomPlanning, newStatus) => {
    await base44.entities.RoomProductionPlanning.update(roomPlanning.id, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["room_planning", selectedProjectId] });
  };

  const handleSaveNotes = async (roomPlanning) => {
    await base44.entities.RoomProductionPlanning.update(roomPlanning.id, {
      notes: editingNotes,
      updated_at: new Date().toISOString(),
    });
    setEditingRoomId(null);
    queryClient.invalidateQueries({ queryKey: ["room_planning", selectedProjectId] });
  };

  // Calculate project progress
  const calculateProjectProgress = () => {
    if (roomPlanning.length === 0) return 0;
    const weights = {
      planned: 0,
      prepping: 10,
      in_progress: 25,
      on_hold: 10,
      ready_for_delivery: 75,
      installed: 90,
      complete: 100,
    };
    const totalWeight = roomPlanning.reduce((sum, r) => sum + (weights[r.status] || 0), 0);
    return Math.round(totalWeight / roomPlanning.length);
  };

  if (!selectedProjectId) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Production Planning</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track room production progress and link to project completion
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects
              .filter((p) => !p.archived && p.rooms?.length > 0)
              .map((project) => (
                <Card
                  key={project.id}
                  className="p-4 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <h3 className="font-semibold text-slate-900">{project.project_name}</h3>
                  <p className="text-sm text-slate-500">{project.client_name || "No client"}</p>
                  <div className="mt-2 text-xs text-slate-500">
                    {project.rooms?.length || 0} room{project.rooms?.length !== 1 ? "s" : ""}
                  </div>
                  <Button
                    onClick={() => setSelectedProjectId(project.id)}
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                  >
                    Start Planning
                  </Button>
                </Card>
              ))}
          </div>
        )}
      </div>
    );
  }

  const projectProgress = calculateProjectProgress();

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedProjectId(null)}
          className="h-9 w-9"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{selectedProject?.project_name}</h1>
          <p className="text-sm text-slate-500">
            {selectedProject?.client_name} · {projectRooms.length} room{projectRooms.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-amber-600">{projectProgress}%</div>
          <p className="text-xs text-slate-500">Production Progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-amber-600 h-full transition-all"
          style={{ width: `${projectProgress}%` }}
        />
      </div>

      {/* Rooms Grid */}
      {roomPlanning.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Loading rooms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roomPlanning.map((room) => {
            const StatusIcon = STATUS_CONFIG[room.status]?.icon || Home;
            const isEditing = editingRoomId === room.id;

            const packet = jobPackets.find((p) => p.room_id === room.id);
            const isExpanded = expandedRoomId === room.id;
            const packetItems = packet?.production_item_ids || [];
            const packetProgress = packet
              ? Math.round((packet.sent_to_production_count / packet.total_count) * 100) || 0
              : 0;

            return (
              <Card key={room.id} className="p-4 border-l-4 border-l-slate-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{room.room_name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PHASE_CONFIG[room.phase]?.color}`}>
                        {PHASE_CONFIG[room.phase]?.label}
                      </span>
                    </div>
                    {room.planned_points > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Zap className="w-3 h-3" />
                        {room.completed_points} / {room.planned_points} pts
                      </div>
                    )}
                    {packet && packet.total_count > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        📦 {packet.sent_to_production_count} / {packet.total_count} cards
                      </div>
                    )}
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[room.status]?.color}`}>
                    <div className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {STATUS_CONFIG[room.status]?.label}
                    </div>
                  </div>
                </div>

                {/* Phase Selector */}
                <Select value={room.phase} onValueChange={(val) => handlePhaseChange(room, val)}>
                  <SelectTrigger className="mb-2 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PHASE_CONFIG).map(([phase, config]) => (
                      <SelectItem key={phase} value={phase}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Selector */}
                <Select value={room.status} onValueChange={(val) => handleStatusChange(room, val)}>
                  <SelectTrigger className="mb-3 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_WORKFLOW.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_CONFIG[status]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Job Packet Section */}
                {packet && packet.total_count > 0 && (
                  <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-200">
                    <button
                      onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                      className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900"
                    >
                      <span>Job Packet ({packetProgress}% sent to production)</span>
                      <span>{isExpanded ? "▼" : "▶"}</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 bg-white rounded border border-slate-200 max-h-48 overflow-y-auto">
                        <div className="space-y-1 p-2">
                          {packetItems.map((item, idx) => {
                            const prodItem = productionItems.find((p) => p.id === item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded">
                                <GripVertical className="w-3 h-3 text-slate-400" />
                                <span className="flex-1 truncate">{prodItem?.name || "Unknown"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add notes or blockers..."
                      className="min-h-16 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveNotes(room)}
                        size="sm"
                        className="flex-1 h-7 bg-amber-600 hover:bg-amber-700 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingRoomId(null)}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingRoomId(room.id);
                      setEditingNotes(room.notes || "");
                    }}
                    className="w-full text-left text-xs text-slate-500 hover:text-slate-700 p-2 rounded border border-dashed border-slate-200 hover:border-slate-300 min-h-12"
                  >
                    {room.notes || "Click to add notes or blockers..."}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}