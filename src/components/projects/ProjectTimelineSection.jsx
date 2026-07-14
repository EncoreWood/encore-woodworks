import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays } from "date-fns";
import { Eye, Plus, ChevronDown, CheckCircle2, Trash2, X, Loader2 } from "lucide-react";

const DEFAULT_MILESTONES = [
  { event_name: "Design", event_type: "phase", color: "#3b82f6", sort_order: 0 },
  { event_name: "Orders", event_type: "phase", color: "#f59e0b", sort_order: 1 },
  { event_name: "Prep", event_type: "phase", color: "#8b5cf6", sort_order: 2 },
  { event_name: "Production", event_type: "phase", color: "#f97316", sort_order: 3 },
  { event_name: "Install", event_type: "phase", color: "#14b8a6", sort_order: 4 },
  { event_name: "Complete", event_type: "milestone", color: "#22c55e", sort_order: 5 },
];

const TYPE_COLORS = { phase: "#3b82f6", milestone: "#f59e0b", event: "#64748b" };
const COMPLETED_COLOR = "#22c55e";
const LABEL_COL_WIDTH = 140;

const DEFAULT_DATE_RANGES = [[0, 14], [14, 28], [28, 42], [42, 84], [84, 98], [98, 98]];

function parseChecklist(str) {
  if (!str) return [];
  try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; }
}

function checklistCompletion(items) {
  if (!items || items.length === 0) return 0;
  return Math.round((items.filter(i => i.done).length / items.length) * 100);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addDaysStr(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function ProjectTimelineSection({ project }) {
  const queryClient = useQueryClient();
  const [clientView, setClientView] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newChecklistText, setNewChecklistText] = useState({});
  const [seeded, setSeeded] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["timelineEvents", project?.id],
    queryFn: () => base44.entities.TimelineEvent.filter({ project_id: project.id }, "sort_order"),
    enabled: !!project?.id,
  });

  // Auto-seed default milestones if none exist
  const seedMutation = useMutation({
    mutationFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const startDate = project.start_date || todayStr;
      const records = DEFAULT_MILESTONES.map((dm, i) => ({
        project_id: project.id,
        project_name: project.project_name || "",
        event_name: dm.event_name,
        event_type: dm.event_type,
        start_date: addDaysStr(startDate, DEFAULT_DATE_RANGES[i][0]),
        end_date: addDaysStr(startDate, DEFAULT_DATE_RANGES[i][1]),
        color: dm.color,
        is_client_visible: true,
        is_completed: false,
        sort_order: dm.sort_order,
      }));
      return base44.entities.TimelineEvent.bulkCreate(records);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }),
  });

  useEffect(() => {
    if (!isLoading && events.length === 0 && project?.id && !seeded) {
      setSeeded(true);
      seedMutation.mutate();
    }
  }, [isLoading, events.length, project?.id, seeded]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create({ ...data, project_id: project.id, project_name: project.project_name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }); setShowForm(false); setEditingEvent(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timelineEvents", project.id] }); setShowForm(false); setEditingEvent(null); },
  });

  const sortedEvents = useMemo(() => [...events].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [events]);
  const visibleEvents = clientView ? sortedEvents.filter(e => e.is_client_visible !== false) : sortedEvents;

  const eventsWithCompletion = visibleEvents.map(e => {
    const checklist = parseChecklist(e.checklist);
    const completion = e.is_completed ? 100 : checklistCompletion(checklist);
    return { ...e, _checklist: checklist, _completion: completion };
  });

  // Overall progress = average across the 6 default milestones
  const defaultMilestoneNames = DEFAULT_MILESTONES.map(dm => dm.event_name);
  const defaultMilestones = eventsWithCompletion.filter(e => defaultMilestoneNames.includes(e.event_name));
  const overallProgress = defaultMilestones.length > 0
    ? Math.round(defaultMilestones.reduce((sum, e) => sum + e._completion, 0) / defaultMilestones.length)
    : 0;

  // Gantt date range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (eventsWithCompletion.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: addDays(today, 90), totalDays: 90 };
    }
    const dates = eventsWithCompletion
      .flatMap(e => [e.start_date, e.end_date].filter(Boolean).map(d => new Date(d)))
      .filter(d => !isNaN(d));
    if (dates.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: addDays(today, 90), totalDays: 90 };
    }
    let min = new Date(Math.min(...dates));
    let max = new Date(Math.max(...dates));
    min = addDays(min, -3);
    max = addDays(max, 3);
    if (min >= max) max = addDays(min, 30);
    return { minDate: min, maxDate: max, totalDays: Math.max(1, differenceInDays(max, min)) };
  }, [eventsWithCompletion]);

  const today = new Date();
  const todayPct = Math.max(0, Math.min(100, (differenceInDays(today, minDate) / totalDays) * 100));

  const monthLabels = useMemo(() => {
    const labels = [];
    const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cur <= maxDate) {
      const pct = (differenceInDays(cur, minDate) / totalDays) * 100;
      labels.push({ label: format(cur, "MMM"), pct });
      cur.setMonth(cur.getMonth() + 1);
    }
    return labels;
  }, [minDate, maxDate, totalDays]);

  const getBarStyle = (event) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date || event.start_date);
    const isDiamond = event.event_type === "milestone" || (event.start_date === event.end_date);
    const daysFromStart = differenceInDays(start, minDate);
    const duration = Math.max(1, differenceInDays(end, start) + 1);
    const leftPct = (daysFromStart / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;
    const color = event.is_completed ? COMPLETED_COLOR : (event.color || TYPE_COLORS[event.event_type] || TYPE_COLORS.event);
    return { leftPct, widthPct: Math.max(widthPct, 1.5), color, isDiamond };
  };

  const toggleExpand = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const saveChecklist = (event, newChecklist) => {
    const allDone = newChecklist.length > 0 && newChecklist.every(i => i.done);
    const wasCompleted = event.is_completed;
    updateMutation.mutate({
      id: event.id,
      data: {
        checklist: JSON.stringify(newChecklist),
        is_completed: allDone,
        completed_date: allDone && !wasCompleted ? format(new Date(), "yyyy-MM-dd") : (!allDone ? null : event.completed_date),
      },
    });
  };

  const handleChecklistToggle = (event, itemId) => {
    saveChecklist(event, event._checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done, done_at: !item.done ? new Date().toISOString() : null } : item
    ));
  };

  const handleAddChecklistItem = (event) => {
    const text = (newChecklistText[event.id] || "").trim();
    if (!text) return;
    saveChecklist(event, [...event._checklist, { id: makeId(), label: text, done: false, done_at: null }]);
    setNewChecklistText(prev => ({ ...prev, [event.id]: "" }));
  };

  const handleDeleteChecklistItem = (event, itemId) => {
    saveChecklist(event, event._checklist.filter(item => item.id !== itemId));
  };

  const handleBarClick = (event) => {
    if (clientView) return;
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleFormSubmit = (data) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      const maxSort = Math.max(0, ...events.map(e => e.sort_order ?? 0));
      createMutation.mutate({ ...data, sort_order: maxSort + 1 });
    }
  };

  const showSpinner = isLoading || (seedMutation.isPending && events.length === 0);

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Project Timeline</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
            <Eye className={clientView ? "w-4 h-4 text-amber-600" : "w-4 h-4 text-slate-400"} />
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">Client View</span>
            <Switch checked={clientView} onCheckedChange={setClientView} />
          </div>
          {!clientView && (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1" onClick={() => { setEditingEvent(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Overall Progress</span>
          <span className="text-sm font-semibold text-slate-700">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-3 bg-slate-100" />
      </div>

      {/* Gantt Chart */}
      {showSpinner ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : eventsWithCompletion.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No timeline events.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Rows + Today line overlay */}
            <div className="relative">
              <div className="space-y-0 relative z-10">
                {eventsWithCompletion.map(event => {
                  const style = getBarStyle(event);
                  const isExpanded = expandedRows[event.id];
                  return (
                    <div key={event.id} className="border-b border-slate-100">
                      <div className="flex items-stretch h-11">
                        {/* Label column */}
                        <div className="flex items-center pr-2 flex-shrink-0" style={{ width: LABEL_COL_WIDTH }}>
                          {!clientView && (
                            <ChevronDown
                              className={cn("w-3.5 h-3.5 flex-shrink-0 text-slate-400 cursor-pointer hover:text-slate-600 transition-transform", !isExpanded && "-rotate-90")}
                              onClick={() => toggleExpand(event.id)}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleBarClick(event)}
                            className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 truncate flex-1 text-left min-w-0"
                          >
                            <span className="truncate" title={event.event_name}>{event.event_name}</span>
                          </button>
                          <span className={cn(
                            "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                            event._completion === 100 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                          )}>{event._completion}%</span>
                          {event.is_completed && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                        </div>
                        {/* Bar area */}
                        <div className="flex-1 relative bg-slate-50/50">
                          {style.isDiamond ? (
                            <button
                              type="button"
                              disabled={clientView}
                              onClick={() => handleBarClick(event)}
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                              style={{ left: `${style.leftPct}%` }}
                            >
                              <div className="w-4 h-4 rotate-45 rounded-sm shadow-md transition-transform group-hover:scale-125" style={{ backgroundColor: style.color }} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={clientView}
                              onClick={() => handleBarClick(event)}
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm transition-all flex items-center px-2 z-10 overflow-hidden",
                                !clientView && "group hover:shadow-md hover:brightness-110 cursor-pointer"
                              )}
                              style={{ left: `${style.leftPct}%`, width: `${style.widthPct}%`, backgroundColor: style.color, height: "24px" }}
                            >
                              <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${event._completion}%` }} />
                              <span className="text-[10px] font-bold text-white truncate relative z-10 flex items-center gap-1">
                                {event.is_completed && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
                                {format(new Date(event.start_date), "M/d")}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable checklist */}
                      {isExpanded && (
                        <div className="mb-2 pl-2" style={{ paddingLeft: LABEL_COL_WIDTH + 8 }}>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                            {event._checklist.length === 0 && !clientView && (
                              <p className="text-xs text-slate-400">No checklist items yet.</p>
                            )}
                            {event._checklist.map(item => (
                              <div key={item.id} className="flex items-center gap-2 group text-sm">
                                {clientView ? (
                                  <span className="text-slate-500">{item.done ? "✅" : "○"}</span>
                                ) : (
                                  <Checkbox checked={item.done} onCheckedChange={() => handleChecklistToggle(event, item.id)} />
                                )}
                                <span className={cn("flex-1", item.done ? "text-slate-400 line-through" : "text-slate-700")}>{item.label}</span>
                                {item.done && item.done_at && (
                                  <span className="text-[10px] text-slate-400">{format(new Date(item.done_at), "M/d h:mm a")}</span>
                                )}
                                {!clientView && (
                                  <button onClick={() => handleDeleteChecklistItem(event, item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!clientView && (
                              <div className="flex items-center gap-2 pt-1">
                                <Input
                                  value={newChecklistText[event.id] || ""}
                                  onChange={e => setNewChecklistText(prev => ({ ...prev, [event.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(event); } }}
                                  placeholder="+ Add item..."
                                  className="h-7 text-xs"
                                />
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleAddChecklistItem(event)} disabled={!(newChecklistText[event.id] || "").trim()}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today line — spans full height of chart area */}
              {todayPct > 0 && todayPct < 100 && (
                <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none z-0">
                  <div style={{ width: LABEL_COL_WIDTH }} className="flex-shrink-0" />
                  <div className="flex-1 relative h-full">
                    <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500" style={{ left: `${todayPct}%` }}>
                      <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full text-[10px] font-bold text-red-500 bg-white px-1 rounded whitespace-nowrap">Today</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Month axis */}
            <div className="flex items-stretch border-t border-slate-200 mt-1">
              <div style={{ width: LABEL_COL_WIDTH }} className="flex-shrink-0" />
              <div className="flex-1 relative h-7">
                {monthLabels.map((m, i) => (
                  <span key={i} className="absolute text-xs font-medium text-slate-500 -translate-x-1/2" style={{ left: `${m.pct}%` }}>{m.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Event Dialog */}
      {showForm && (
        <EventEditDialog
          open={showForm}
          onOpenChange={(o) => { setShowForm(o); if (!o) setEditingEvent(null); }}
          onSubmit={handleFormSubmit}
          onDelete={editingEvent ? () => deleteMutation.mutate(editingEvent.id) : null}
          editingEvent={editingEvent}
          isLoading={updateMutation.isPending || createMutation.isPending || deleteMutation.isPending}
        />
      )}
    </Card>
  );
}

function EventEditDialog({ open, onOpenChange, onSubmit, onDelete, editingEvent, isLoading }) {
  const emptyForm = { event_name: "", event_type: "phase", start_date: "", end_date: "", color: "", is_client_visible: true, is_completed: false, notes: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(editingEvent ? {
        event_name: editingEvent.event_name || "",
        event_type: editingEvent.event_type || "phase",
        start_date: editingEvent.start_date || "",
        end_date: editingEvent.end_date || "",
        color: editingEvent.color || "",
        is_client_visible: editingEvent.is_client_visible !== false,
        is_completed: editingEvent.is_completed || false,
        notes: editingEvent.notes || "",
      } : emptyForm);
    }
  }, [open, editingEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.event_name.trim()) return;
    const wasCompleted = editingEvent?.is_completed || false;
    const data = {
      ...form,
      event_name: form.event_name.trim(),
      color: form.color || undefined,
      notes: form.notes || undefined,
      completed_date: form.is_completed && !wasCompleted ? format(new Date(), "yyyy-MM-dd") : (!form.is_completed ? null : editingEvent?.completed_date),
    };
    onSubmit(data);
  };

  const previewColor = form.color || TYPE_COLORS[form.event_type] || "#64748b";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit Event" : "Add Timeline Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Event Name <span className="text-red-500">*</span></Label>
            <Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="e.g., Cabinet Installation" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={previewColor} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" />
              <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder={`Default: ${TYPE_COLORS[form.event_type]}`} className="flex-1" />
              {form.color && <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, color: "" }))}>Reset</Button>}
            </div>
          </div>
          {editingEvent && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <div>
                <Label className="cursor-pointer">Completed</Label>
                <p className="text-xs text-slate-400">Mark this event as done</p>
              </div>
              <Switch checked={form.is_completed} onCheckedChange={v => setForm(f => ({ ...f, is_completed: v }))} />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <Label className="cursor-pointer">Client Visible</Label>
              <p className="text-xs text-slate-400">Show in client view</p>
            </div>
            <Switch checked={form.is_client_visible} onCheckedChange={v => setForm(f => ({ ...f, is_client_visible: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
          </div>
          <DialogFooter>
            {editingEvent && onDelete && (
              <Button type="button" variant="destructive" className="mr-auto" onClick={onDelete} disabled={isLoading}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !form.event_name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingEvent ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}