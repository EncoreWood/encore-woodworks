import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Eye, Trash2, CheckCircle2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import GanttChart from "./GanttChart";
import TimelineEventForm from "./TimelineEventForm";

const TYPE_COLORS = {
  phase: "#3b82f6",
  milestone: "#f59e0b",
  event: "#64748b",
};

export default function TimelineModal({ open, onOpenChange, project }) {
  const queryClient = useQueryClient();
  const [clientView, setClientView] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["timelineEvents", project?.id],
    queryFn: () => base44.entities.TimelineEvent.filter({ project_id: project.id }, "sort_order"),
    enabled: !!project?.id && open,
  });

  const visibleEvents = clientView ? events.filter(e => e.is_client_visible !== false) : events;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create({ ...data, project_id: project.id, project_name: project.project_name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }); setShowForm(false); setEditingEvent(null); },
  });

  const completeMutation = useMutation({
    mutationFn: (event) => base44.entities.TimelineEvent.update(event.id, { is_completed: true, completed_date: format(new Date(), "yyyy-MM-dd") }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }),
  });

  const handleBarClick = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleFormSubmit = (idOrData, data) => {
    if (editingEvent) {
      updateMutation.mutate({ id: idOrData, data });
    } else {
      createMutation.mutate(idOrData);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-200 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{project?.project_name} — Timeline</DialogTitle>
              {!isLoading && events.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                <Eye className={clientView ? "w-4 h-4 text-amber-600" : "w-4 h-4 text-slate-400"} />
                <span className="text-sm font-medium text-slate-700">Client View</span>
                <Switch checked={clientView} onCheckedChange={setClientView} />
              </div>
              {!clientView && (
                <Button onClick={() => { setEditingEvent(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
                  <Plus className="w-4 h-4" /> Add Event
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Chart */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : (
              <GanttChart events={visibleEvents} onBarClick={handleBarClick} readOnly={clientView} />
            )}

            {/* Action bar per event (admin mode only) */}
            {!clientView && !isLoading && visibleEvents.length > 0 && (
              <div className="mt-4 space-y-1 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Manage Events</p>
                {visibleEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-sm">
                    <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: event.is_completed ? "#22c55e" : (event.color || TYPE_COLORS[event.event_type] || "#64748b") }} />
                    <span className={event.is_completed ? "text-slate-400 line-through flex-1 truncate" : "text-slate-700 flex-1 truncate"}>{event.event_name}</span>
                    {!event.is_completed ? (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => completeMutation.mutate(event)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✅ Done</span>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleBarClick(event)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate(event.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Legend + Close */}
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: TYPE_COLORS.phase }} /> Phase</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45" style={{ backgroundColor: TYPE_COLORS.milestone }} /> Milestone</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} /> Completed</span>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <TimelineEventForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setEditingEvent(null); }}
        onSubmit={handleFormSubmit}
        editingEvent={editingEvent}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}