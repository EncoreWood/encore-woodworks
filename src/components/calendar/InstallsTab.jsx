import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isToday, isFuture } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, Clock, MapPin, Users, Hammer, User, ExternalLink, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyForm = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  time: "",
  project_id: "",
  project_name: "",
  client_name: "",
  address: "",
  crew: [],
  tasks: [],
  notes: "",
  status: "scheduled",
});

function InstallEventForm({ projects, employees, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || emptyForm());
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleCrew = (name) => {
    setForm(p => ({
      ...p,
      crew: p.crew?.includes(name) ? p.crew.filter(n => n !== name) : [...(p.crew || []), name],
    }));
  };

  const selectProject = (id) => {
    const p = projects.find(x => x.id === id);
    if (p) {
      update("project_id", p.id);
      update("project_name", p.project_name);
      update("client_name", p.client_name || p.home_owner?.name || "");
      update("address", p.address || "");
    } else {
      update("project_id", "");
    }
  };

  const updateTask = (idx, key, value) => {
    update("tasks", form.tasks.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };
  const addTask = () => update("tasks", [...(form.tasks || []), { id: genId(), text: "", assignee: "", done: false }]);
  const removeTask = (idx) => update("tasks", form.tasks.filter((_, i) => i !== idx));

  const submit = () => {
    onSave({
      ...form,
      tasks: (form.tasks || [])
        .filter(t => t.text?.trim())
        .map(t => ({ id: t.id || genId(), text: t.text.trim(), assignee: t.assignee || "", done: !!t.done })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={form.date || ""} onChange={e => update("date", e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={form.time || ""} onChange={e => update("time", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Attach Job (Project)</Label>
        <Select value={form.project_id || ""} onValueChange={selectProject}>
          <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-slate-400 mt-1">
          If a job is attached, this install event also shows on the project's card.
        </p>
      </div>

      <div>
        <Label>Event Title *</Label>
        <Input value={form.project_name || ""} onChange={e => update("project_name", e.target.value)} placeholder="Install event name / project name" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Client</Label>
          <Input value={form.client_name || ""} onChange={e => update("client_name", e.target.value)} placeholder="Client name" />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address || ""} onChange={e => update("address", e.target.value)} placeholder="Address" />
        </div>
      </div>

      <div>
        <Label>Crew (assigned to the event)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5 border rounded-lg p-2 bg-slate-50">
          {employees.map(emp => {
            const sel = form.crew?.includes(emp.full_name);
            return (
              <button key={emp.id} type="button"
                onClick={() => toggleCrew(emp.full_name)}
                className={cn("px-2.5 py-1 rounded-full text-xs border transition-all",
                  sel ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-600 border-slate-300 hover:border-orange-400")}
              >{emp.full_name}</button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="mb-0">Tasks</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTask}>
            <Plus className="w-3 h-3" /> Add Task
          </Button>
        </div>
        <div className="space-y-2">
          {(form.tasks || []).length === 0 && (
            <p className="text-xs text-slate-400">No tasks — use "Add Task" to add install tasks and assign a team member to each.</p>
          )}
          {(form.tasks || []).map((t, idx) => (
            <div key={t.id || idx} className="flex gap-2 items-center">
              <Input placeholder="Task description" value={t.text || ""} onChange={e => updateTask(idx, "text", e.target.value)} className="flex-1 h-8" />
              <Select value={t.assignee || ""} onValueChange={v => updateTask(idx, "assignee", v)}>
                <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => <SelectItem key={emp.id} value={emp.full_name}>{emp.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeTask(idx)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select value={form.status || "scheduled"} onValueChange={v => update("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} placeholder="Additional notes..." className="min-h-[70px]" />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!form.project_name || !form.date} className="bg-orange-600 hover:bg-orange-700">
          Save
        </Button>
      </div>
    </div>
  );
}

function InstallEventCard({ appt, onEdit, onDelete, onToggleTask }) {
  const statusColor = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
  const visibleTasks = (appt.tasks || []).filter(t => t.text);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate">{appt.project_name}</span>
            </span>
            {appt.client_name && <span className="text-xs text-slate-500">{appt.client_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className={cn("text-xs border", statusColor)}>{appt.status?.replace("_", " ")}</Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-600" onClick={() => onEdit(appt)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => onDelete(appt.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{appt.date ? format(parseISO(appt.date), "EEE, MMM d yyyy") : "—"}</span>
        {appt.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time}</span>}
        {appt.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{appt.address}</span>}
        {appt.crew?.length > 0 && (
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{appt.crew.join(", ")}</span>
        )}
      </div>

      {appt.project_id && (
        <Link to={`/ProjectDetails?id=${appt.project_id}`}
          className="inline-flex items-center gap-1 text-xs text-orange-700 hover:text-orange-800 font-medium mt-2">
          <ExternalLink className="w-3 h-3" /> View project
        </Link>
      )}

      {visibleTasks.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {visibleTasks.map(t => (
            <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={!!t.done}
                onCheckedChange={() => onToggleTask(appt, t.id)}
              />
              <span className={cn("text-slate-700", t.done && "line-through text-slate-400")}>{t.text}</span>
              {t.assignee && (
                <span className="ml-auto flex items-center gap-1 text-slate-400 flex-shrink-0">
                  <User className="w-3 h-3" />{t.assignee}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {appt.notes && <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1">{appt.notes}</p>}
    </div>
  );
}

export default function InstallsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [filter, setFilter] = useState("upcoming");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["InstallAppointment"],
    queryFn: () => base44.entities.InstallAppointment.list("date", 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InstallAppointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["InstallAppointment"] }); setShowForm(false); setPrefill(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InstallAppointment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["InstallAppointment"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InstallAppointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["InstallAppointment"] }),
  });

  const toggleTask = (appt, taskId) => {
    const tasks = (appt.tasks || []).map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    updateMutation.mutate({ id: appt.id, data: { ...appt, tasks } });
  };

  const today = format(new Date(), "yyyy-MM-dd");

  // Projects whose install timelines carry a date — surfaced automatically from project cards
  const installTimelineProjects = projects
    .filter(p => !p.archived && (p.install_start_date || p.install_end_date))
    .sort((a, b) =>
      (a.install_start_date || a.install_end_date || "9999").localeCompare(b.install_start_date || b.install_end_date || "9999")
    );

  const filtered = appointments.filter(a => {
    if (filter === "upcoming") return a.date >= today && a.status !== "cancelled";
    if (filter === "past") return a.date < today || a.status === "completed";
    if (filter === "cancelled") return a.status === "cancelled";
    return true;
  }).sort((a, b) => (filter === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  const upcomingCount = appointments.filter(a => a.date >= today && a.status !== "cancelled").length;

  const openPrefilled = (p) => {
    setEditing(null);
    setPrefill({
      ...emptyForm(),
      date: p.install_start_date || p.install_end_date || format(new Date(), "yyyy-MM-dd"),
      project_id: p.id,
      project_name: p.project_name,
      client_name: p.client_name || p.home_owner?.name || "",
      address: p.address || "",
    });
    setShowForm(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          {["upcoming", "past", "all", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
                filter === f ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {f}{f === "upcoming" && upcomingCount > 0 ? ` (${upcomingCount})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => { setPrefill(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Schedule Install
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Project install timelines — auto-linked from project cards */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Project Install Timelines ({installTimelineProjects.length})
          </h3>
          {installTimelineProjects.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
              No projects have install dates set on their cards yet.
            </p>
          ) : (
            <div className="space-y-2">
              {installTimelineProjects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                  <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Install: {p.install_start_date ? format(parseISO(p.install_start_date), "MMM d") : "?"}
                      {p.install_end_date ? ` – ${format(parseISO(p.install_end_date), "MMM d, yyyy")}` : ""}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{p.project_name}</p>
                  </div>
                  <Link to={`/ProjectDetails?id=${p.id}`}
                    className="text-xs text-slate-500 hover:text-orange-700 flex items-center gap-1 flex-shrink-0">
                    <ExternalLink className="w-3 h-3" /> Open
                  </Link>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-shrink-0" onClick={() => openPrefilled(p)}>
                    <Plus className="w-3 h-3" /> Schedule Install
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled install events */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Hammer className="w-3.5 h-3.5" /> Install Events ({filtered.length})
          </h3>
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Hammer className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {filter} install events</p>
              <Button size="sm" className="mt-3 bg-orange-600 hover:bg-orange-700" onClick={() => { setPrefill(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Schedule one
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const groups = filtered.reduce((acc, a) => {
                  const k = a.date || "Unknown";
                  if (!acc[k]) acc[k] = [];
                  acc[k].push(a);
                  return acc;
                }, {});
                return Object.entries(groups).map(([date, items]) => {
                  let label = date;
                  try {
                    const d = parseISO(date);
                    label = isToday(d) ? `Today — ${format(d, "MMM d")}` : format(d, "EEEE, MMMM d, yyyy");
                  } catch {}
                  return (
                    <div key={date}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                      <div className="space-y-2">
                        {items.map(a => (
                          <InstallEventCard key={a.id} appt={a}
                            onEdit={(a) => { setPrefill(null); setEditing(a); }}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onToggleTask={toggleTask}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setPrefill(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Install</DialogTitle>
          </DialogHeader>
          <InstallEventForm projects={projects} employees={employees}
            initial={prefill}
            onSave={(data) => createMutation.mutate(data)}
            onClose={() => { setShowForm(false); setPrefill(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Install</DialogTitle>
          </DialogHeader>
          {editing && (
            <InstallEventForm projects={projects} employees={employees}
              initial={editing}
              onSave={(data) => updateMutation.mutate({ id: editing.id, data })}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}