import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isFuture, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, Clock, MapPin, User, Users, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  scheduled:   "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed:   "bg-green-100 text-green-800 border-green-200",
  delivered:   "bg-green-100 text-green-800 border-green-200",
  cancelled:   "bg-red-100 text-red-700 border-red-200",
};

function AppointmentForm({ type, projects, employees, initial, onSave, onClose }) {
  const isInstall = type === "install";
  const [form, setForm] = useState(initial || {
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    project_name: "",
    project_id: "",
    client_name: "",
    address: "",
    notes: "",
    status: "scheduled",
    ...(isInstall ? { crew: [] } : { driver: "" })
  });

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleCrew = (name) => {
    setForm(p => ({
      ...p,
      crew: p.crew?.includes(name) ? p.crew.filter(n => n !== name) : [...(p.crew || []), name]
    }));
  };

  const selectProject = (id) => {
    const p = projects.find(x => x.id === id);
    if (p) update("project_id", p.id), update("project_name", p.project_name), update("client_name", p.client_name || ""), update("address", p.address || "");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={form.time || ""} onChange={e => update("time", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Project</Label>
        <Select value={form.project_id || ""} onValueChange={selectProject}>
          <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Project Name *</Label>
        <Input value={form.project_name} onChange={e => update("project_name", e.target.value)} placeholder="Project name" />
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

      {isInstall ? (
        <div>
          <Label>Crew</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5 border rounded-lg p-2 bg-slate-50">
            {employees.map(emp => {
              const sel = form.crew?.includes(emp.full_name);
              return (
                <button key={emp.id} type="button"
                  onClick={() => toggleCrew(emp.full_name)}
                  className={cn("px-2.5 py-1 rounded-full text-xs border transition-all", sel ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-300 hover:border-amber-400")}
                >{emp.full_name}</button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <Label>Driver / Responsible</Label>
          <Select value={form.driver || ""} onValueChange={v => update("driver", v)}>
            <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Status</Label>
        <Select value={form.status || "scheduled"} onValueChange={v => update("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {isInstall ? (
              <>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} placeholder="Additional notes..." className="min-h-[70px]" />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.project_name || !form.date}
          className={isInstall ? "bg-orange-600 hover:bg-orange-700" : "bg-teal-600 hover:bg-teal-700"}>
          Save
        </Button>
      </div>
    </div>
  );
}

function AppointmentCard({ appt, type, onDelete, onEdit }) {
  const isInstall = type === "install";
  const dateStr = appt.date ? format(parseISO(appt.date), "EEE, MMM d yyyy") : "—";
  const isPast = appt.date && !isToday(parseISO(appt.date)) && !isFuture(parseISO(appt.date));
  const statusColor = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;

  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 shadow-sm", isPast && appt.status === "completed" && "opacity-60")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900">{appt.project_name}</span>
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
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
        {appt.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time}</span>}
        {appt.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{appt.address}</span>}
        {isInstall && appt.crew?.length > 0 && (
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{appt.crew.join(", ")}</span>
        )}
        {!isInstall && appt.driver && (
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{appt.driver}</span>
        )}
      </div>
      {appt.notes && <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1">{appt.notes}</p>}
    </div>
  );
}

export default function AppointmentTab({ type }) {
  const isInstall = type === "install";
  const entityName = isInstall ? "InstallAppointment" : "DeliveryAppointment";
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("upcoming");
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list("-date", 200),
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
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [entityName] }); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [entityName] }); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = appointments.filter(a => {
    if (filter === "upcoming") return a.date >= today && a.status !== "cancelled";
    if (filter === "past") return a.date < today || a.status === "completed" || a.status === "delivered";
    if (filter === "cancelled") return a.status === "cancelled";
    return true;
  }).sort((a, b) => {
    if (filter === "past") return b.date.localeCompare(a.date);
    return a.date.localeCompare(b.date);
  });

  const upcomingCount = appointments.filter(a => a.date >= today && a.status !== "cancelled").length;

  const accentColor = isInstall ? "bg-orange-600 hover:bg-orange-700" : "bg-teal-600 hover:bg-teal-700";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          {["upcoming", "past", "all", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
                filter === f ? (isInstall ? "bg-orange-600 text-white border-orange-600" : "bg-teal-600 text-white border-teal-600")
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {f}{f === "upcoming" && upcomingCount > 0 ? ` (${upcomingCount})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" className={accentColor} onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Schedule
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No {filter} {isInstall ? "installs" : "deliveries"}</p>
            <Button size="sm" className={cn("mt-3", accentColor)} onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Schedule one
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Group by date */}
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
                  if (isToday(d)) label = "Today — " + format(d, "MMM d");
                  else label = format(d, "EEEE, MMMM d, yyyy");
                } catch {}
                return (
                  <div key={date}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                    <div className="space-y-2">
                      {items.map(a => (
                        <AppointmentCard key={a.id} appt={a} type={type}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onEdit={(a) => setEditing(a)}
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

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule {isInstall ? "Install" : "Delivery"}</DialogTitle>
          </DialogHeader>
          <AppointmentForm type={type} projects={projects} employees={employees}
            onSave={(data) => createMutation.mutate(data)}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {isInstall ? "Install" : "Delivery"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <AppointmentForm type={type} projects={projects} employees={employees}
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