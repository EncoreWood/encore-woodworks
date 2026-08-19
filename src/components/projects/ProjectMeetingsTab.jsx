import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Calendar, Clock, Eye, EyeOff, FileAudio, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CLS = {
  requested: "bg-blue-100 text-blue-700",
  scheduled: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

function MeetingForm({ project, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: "",
    status: "scheduled",
    scheduled_date: format(new Date(), "yyyy-MM-dd"),
    scheduled_time: "",
    meeting_type: "in_person",
    location: "",
    summary: "",
    audio_url: "",
    transcript_url: "",
    client_email: project.client_email || "",
    client_name: project.client_name || "",
    client_visible: false,
    notes: "",
  });
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Title *</Label>
          <Input value={form.title} onChange={e => up("title", e.target.value)} placeholder="Meeting title" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => up("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["requested", "scheduled", "completed", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.scheduled_date || ""} onChange={e => up("scheduled_date", e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={form.scheduled_time || ""} onChange={e => up("scheduled_time", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={form.meeting_type} onValueChange={v => up("meeting_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["in_person", "virtual", "phone", "shop_visit"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Location / Link</Label>
          <Input value={form.location || ""} onChange={e => up("location", e.target.value)} placeholder="Address or Zoom link" />
        </div>
      </div>
      <div>
        <Label>Summary (client-visible notes)</Label>
        <Textarea value={form.summary || ""} onChange={e => up("summary", e.target.value)} placeholder="Short summary of the meeting…" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Audio URL (Plaud)</Label>
          <Input value={form.audio_url || ""} onChange={e => up("audio_url", e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label>Transcript URL</Label>
          <Input value={form.transcript_url || ""} onChange={e => up("transcript_url", e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Client Email</Label>
          <Input value={form.client_email || ""} onChange={e => up("client_email", e.target.value)} placeholder="client@email.com" />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={!!form.client_visible} onCheckedChange={v => up("client_visible", v)} id="cv" />
          <Label htmlFor="cv" className="cursor-pointer">Visible to client</Label>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title} className="bg-amber-600 hover:bg-amber-700">Save</Button>
      </div>
    </div>
  );
}

export default function ProjectMeetingsTab({ project }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["portalMeetings", project.id],
    queryFn: () => base44.entities.PortalMeeting.filter({ project_id: project.id }),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.PortalMeeting.create({
      ...data,
      project_id: project.id,
      project_name: project.project_name,
      client_name: data.client_name || project.client_name || "",
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portalMeetings", project.id] }); setShowForm(false); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PortalMeeting.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portalMeetings", project.id] }); setEditing(null); }
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.PortalMeeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portalMeetings", project.id] }),
  });

  const sorted = [...meetings].sort((a, b) => (b.scheduled_date || b.preferred_date || "").localeCompare(a.scheduled_date || a.preferred_date || ""));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /> Meetings & Notes</h2>
          <p className="text-xs text-slate-500">Recorded meetings, Plaud notes, and client-requested meetings for this project.</p>
        </div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Meeting
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No meetings recorded for this project yet.</p>
          <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add one
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(m => {
            const d = m.scheduled_date || m.preferred_date;
            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{m.title}</p>
                    {m.client_name && <p className="text-xs text-slate-500">{m.client_name}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      title={m.client_visible ? "Visible to client" : "Hidden from client"}
                      onClick={() => updateMut.mutate({ id: m.id, data: { client_visible: !m.client_visible } })}
                      className={cn("p-1.5 rounded-lg", m.client_visible ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100")}
                    >
                      {m.client_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-600" onClick={() => setEditing(m)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => { if (confirm("Delete this meeting?")) deleteMut.mutate(m.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                  <span className={cn("px-1.5 py-0.5 rounded-full font-medium", STATUS_CLS[m.status] || STATUS_CLS.requested)}>{m.status}</span>
                  {d && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(d), "MMM d, yyyy")}</span>}
                  {(m.scheduled_time || m.preferred_time) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.scheduled_time || m.preferred_time}</span>}
                  {m.location && <span className="truncate">{m.location}</span>}
                </div>
                {m.summary && <p className="text-sm text-slate-600 bg-slate-50 rounded px-2.5 py-1.5 mb-2">{m.summary}</p>}
                <div className="flex flex-wrap gap-2">
                  {m.audio_url && (
                    <a href={m.audio_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
                      <FileAudio className="w-3.5 h-3.5" /> Audio
                    </a>
                  )}
                  {m.transcript_url && (
                    <a href={m.transcript_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                      <FileText className="w-3.5 h-3.5" /> Transcript
                    </a>
                  )}
                </div>
                {m.notes && <p className="text-xs text-slate-400 italic mt-2">Client note: "{m.notes}"</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Meeting</DialogTitle></DialogHeader>
          <MeetingForm project={project} onSave={(data) => createMut.mutate(data)} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Meeting</DialogTitle></DialogHeader>
          {editing && <MeetingForm project={project} initial={editing} onSave={(data) => updateMut.mutate({ id: editing.id, data })} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}