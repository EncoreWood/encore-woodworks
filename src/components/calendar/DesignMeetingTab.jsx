import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isFuture, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, Clock, User, Edit2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function DesignMeetingForm({ contacts, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    client_name: "",
    project_name: "",
    notes: "",
  });
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
        <Label>Client Name *</Label>
        <div className="flex gap-2">
          <Input value={form.client_name} onChange={e => update("client_name", e.target.value)} placeholder="Client name" className="flex-1" />
          {contacts.length > 0 && (
            <Select value="" onValueChange={(id) => {
              const c = contacts.find(x => x.id === id);
              if (c) update("client_name", c.name);
            }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="From contacts" /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div>
        <Label>Project Name</Label>
        <Input value={form.project_name || ""} onChange={e => update("project_name", e.target.value)} placeholder="Project name (optional)" />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} placeholder="Meeting notes..." className="min-h-[70px]" />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.client_name || !form.date}
          className="bg-violet-600 hover:bg-violet-700">Save</Button>
      </div>
    </div>
  );
}

function MeetingCard({ meeting, onDelete, onEdit }) {
  const dateStr = meeting.date ? format(parseISO(meeting.date), "EEE, MMM d yyyy") : "—";
  const isPast = meeting.date && !isToday(parseISO(meeting.date)) && !isFuture(parseISO(meeting.date));
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 shadow-sm", isPast && "opacity-60")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{meeting.client_name}</p>
          {meeting.project_name && <p className="text-xs text-violet-600">{meeting.project_name}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-violet-600" onClick={() => onEdit(meeting)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => onDelete(meeting.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
        {meeting.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{meeting.time}</span>}
      </div>
      {meeting.notes && <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1">{meeting.notes}</p>}
    </div>
  );
}

export default function DesignMeetingTab() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("upcoming");
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["designMeetings"],
    queryFn: () => base44.entities.DesignMeeting.list("-date", 200),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DesignMeeting.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["designMeetings"] }); setShowForm(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DesignMeeting.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["designMeetings"] }); setEditing(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DesignMeeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["designMeetings"] }),
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = meetings.filter(m => {
    if (filter === "upcoming") return m.date >= today;
    if (filter === "past") return m.date < today;
    return true;
  }).sort((a, b) => filter === "past" ? b.date?.localeCompare(a.date) : a.date?.localeCompare(b.date));

  const upcomingCount = meetings.filter(m => m.date >= today).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          {["upcoming", "past", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
                filter === f ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {f}{f === "upcoming" && upcomingCount > 0 ? ` (${upcomingCount})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Schedule
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No {filter} design meetings</p>
            <Button size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Schedule one
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const groups = filtered.reduce((acc, m) => {
                const k = m.date || "Unknown";
                if (!acc[k]) acc[k] = [];
                acc[k].push(m);
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
                      {items.map(m => (
                        <MeetingCard key={m.id} meeting={m}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onEdit={(m) => setEditing(m)}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Design Meeting</DialogTitle></DialogHeader>
          <DesignMeetingForm contacts={contacts} onSave={(data) => createMutation.mutate(data)} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Design Meeting</DialogTitle></DialogHeader>
          {editing && (
            <DesignMeetingForm contacts={contacts} initial={editing}
              onSave={(data) => updateMutation.mutate({ id: editing.id, data })}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}