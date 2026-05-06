import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Globe, GlobeLock, Copy, Check, Plus, Trash2, StickyNote, ClipboardList, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SECTIONS = [
  { key: "show_status",        label: "Project Status",      desc: "Status, dates, and address" },
  { key: "show_milestones",    label: "Progress Milestones", desc: "Design → Materials → Production → Install" },
  { key: "show_presentations", label: "3D Presentations",    desc: "Visual slideshow of renderings" },
  { key: "show_documents",     label: "Documents",           desc: "Downloadable project files" },
  { key: "show_photos",        label: "Job Photos",          desc: "Photo gallery" },
  { key: "show_financials",    label: "Financials",          desc: "Budget, deposit, and balance due" },
  { key: "show_messages",      label: "Messages",            desc: "Chat thread with project team" },
  { key: "show_tasks",         label: "Client Tasks",        desc: "Tasks assigned for the client to complete" },
  { key: "show_notes",         label: "Project Notes",       desc: "Notes from the project team" },
];

const TASK_TYPES = ["General", "Room Sign-Off", "Review & Approve", "Provide Info"];
const TASK_STATUSES = ["Pending", "In Progress", "Completed"];

export default function ClientPortalTab({ project }) {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", task_type: "General", due_date: "", admin_notes: "", requires_signature: false });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newNote, setNewNote] = useState({ note_text: "", is_visible_to_client: true });
  const [showNoteForm, setShowNoteForm] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["client_portal_settings", project.id],
    queryFn: () => base44.entities.ClientPortalSettings.filter({ project_id: project.id }).then(r => r[0] || null),
  });

  const { data: clientUser } = useQuery({
    queryKey: ["client_user", project.id],
    queryFn: async () => {
      if (!settings?.client_email) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.email === settings.client_email && u.role === "client") || null;
    },
    enabled: !!settings?.client_email,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["client_tasks", project.id],
    queryFn: () => base44.entities.ClientTask.filter({ project_id: project.id }),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["portal_notes", project.id],
    queryFn: () => base44.entities.PortalNote.filter({ project_id: project.id }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) return base44.entities.ClientPortalSettings.update(settings.id, data);
      return base44.entities.ClientPortalSettings.create({ project_id: project.id, ...data });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_portal_settings", project.id] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientTask.create({ ...data, project_id: project.id, project_name: project.project_name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_tasks", project.id] });
      setNewTask({ title: "", task_type: "General", due_date: "", admin_notes: "", requires_signature: false });
      setShowTaskForm(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientTask.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tasks", project.id] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientTask.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tasks", project.id] }),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.PortalNote.create({ ...data, project_id: project.id, author_name: "Admin", author_type: "admin" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal_notes", project.id] });
      setNewNote({ note_text: "", is_visible_to_client: true });
      setShowNoteForm(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.PortalNote.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal_notes", project.id] }),
  });

  const toggleNoteVisibility = (note) => {
    base44.entities.PortalNote.update(note.id, { is_visible_to_client: !note.is_visible_to_client })
      .then(() => qc.invalidateQueries({ queryKey: ["portal_notes", project.id] }));
  };

  const handleToggle = (key, value) => saveMutation.mutate({ [key]: value });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), "client");
      await new Promise(r => setTimeout(r, 1500));
      const users = await base44.entities.User.list();
      const newUser = users.find(u => u.email === inviteEmail.trim());
      if (newUser) await base44.entities.User.update(newUser.id, { client_project_id: project.id });
      await saveMutation.mutateAsync({ client_email: inviteEmail.trim() });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["client_user", project.id] });
    } catch (err) {
      toast.error("Failed to invite client: " + err.message);
    }
    setInviting(false);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/ClientPortal");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>;

  const isActive = settings?.is_active !== false;

  return (
    <div className="space-y-6">
      {/* Portal Status */}
      <div className={`rounded-xl p-4 border flex items-center justify-between ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          {isActive ? <Globe className="w-5 h-5 text-emerald-600" /> : <GlobeLock className="w-5 h-5 text-slate-400" />}
          <div>
            <p className="text-sm font-semibold text-slate-800">Client Portal {isActive ? "Active" : "Inactive"}</p>
            <p className="text-xs text-slate-500">{isActive ? "Client can log in and view their project" : "Portal is hidden from the client"}</p>
          </div>
        </div>
        <Switch checked={isActive} onCheckedChange={v => handleToggle("is_active", v)} />
      </div>

      {/* Invite Client */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500" />Client Access</h3>
        {clientUser ? (
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">{clientUser.full_name || clientUser.email}</p>
              <p className="text-xs text-slate-500">{clientUser.email} · Client role</p>
            </div>
            <button onClick={copyPortalLink} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Invite the client by email. They will receive an invitation and see their portal when they log in.</p>
            <div className="flex gap-2">
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="client@email.com" className="h-9 text-sm" onKeyDown={e => e.key === "Enter" && handleInvite()} />
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="bg-amber-600 hover:bg-amber-700 h-9 px-4" size="sm">
                {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invite"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">Portal URL:</p>
              <button onClick={copyPortalLink} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {window.location.origin}/ClientPortal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Welcome Message */}
      <div className="rounded-xl border border-slate-200 p-4">
        <Label className="text-sm font-bold text-slate-700 mb-2 block">Welcome Message</Label>
        <input
          defaultValue={settings?.welcome_message || ""}
          onBlur={e => { if (e.target.value !== (settings?.welcome_message || "")) saveMutation.mutate({ welcome_message: e.target.value }); }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="e.g. Welcome to your project portal, we're excited to work with you!"
        />
      </div>

      {/* Section Toggles */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Portal Sections</h3>
        <div className="space-y-3">
          {SECTIONS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-700">{s.label}</p>
                <p className="text-xs text-slate-400">{s.desc}</p>
              </div>
              <Switch
                checked={settings ? (settings[s.key] !== false) : s.key !== "show_financials"}
                onCheckedChange={v => handleToggle(s.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Client Tasks */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-500" />Client Tasks</h3>
          <Button size="sm" variant="outline" onClick={() => setShowTaskForm(v => !v)} className="h-8 gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add Task
          </Button>
        </div>

        {showTaskForm && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} className="h-8 text-sm" />
            <div className="flex gap-2">
              <Select value={newTask.task_type} onValueChange={v => setNewTask(t => ({ ...t, task_type: v }))}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(ty => <SelectItem key={ty} value={ty}>{ty}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={newTask.due_date} onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))} className="h-8 text-xs flex-1" />
            </div>
            <Textarea placeholder="Admin notes (optional)" value={newTask.admin_notes} onChange={e => setNewTask(t => ({ ...t, admin_notes: e.target.value }))} rows={2} className="text-xs" />
            <div className="flex items-center gap-2">
              <Switch checked={newTask.requires_signature} onCheckedChange={v => setNewTask(t => ({ ...t, requires_signature: v }))} />
              <span className="text-xs text-slate-600">Requires signature</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-7 text-xs" disabled={!newTask.title.trim() || createTaskMutation.isPending} onClick={() => createTaskMutation.mutate(newTask)}>
                {createTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create Task"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowTaskForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {tasksLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" /> : tasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No client tasks yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${task.status === "Completed" ? "bg-emerald-100 text-emerald-700" : task.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{task.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{task.task_type}{task.due_date ? ` · Due ${format(new Date(task.due_date), "MMM d")}` : ""}{task.requires_signature ? " · ✍ Signature" : ""}</p>
                  {task.admin_notes && <p className="text-xs text-slate-400 mt-1 italic">{task.admin_notes}</p>}
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <Select value={task.status} onValueChange={v => updateTaskMutation.mutate({ id: task.id, data: { status: v } })}>
                    <SelectTrigger className="h-6 w-24 text-xs px-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => { if (confirm("Delete this task?")) deleteTaskMutation.mutate(task.id); }} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Portal Notes */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-500" />Project Notes</h3>
          <Button size="sm" variant="outline" onClick={() => setShowNoteForm(v => !v)} className="h-8 gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add Note
          </Button>
        </div>

        {showNoteForm && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <Textarea placeholder="Note text..." value={newNote.note_text} onChange={e => setNewNote(n => ({ ...n, note_text: e.target.value }))} rows={3} className="text-sm" />
            <div className="flex items-center gap-2">
              <Switch checked={newNote.is_visible_to_client} onCheckedChange={v => setNewNote(n => ({ ...n, is_visible_to_client: v }))} />
              <span className="text-xs text-slate-600">Visible to client</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-7 text-xs" disabled={!newNote.note_text.trim() || createNoteMutation.isPending} onClick={() => createNoteMutation.mutate(newNote)}>
                {createNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Note"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNoteForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No notes yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className={`p-3 rounded-lg border ${note.is_visible_to_client ? "bg-slate-50 border-slate-200" : "bg-slate-100 border-slate-300 opacity-75"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-700 flex-1">{note.note_text}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleNoteVisibility(note)} title={note.is_visible_to_client ? "Hide from client" : "Show to client"} className="text-slate-400 hover:text-amber-600 p-1">
                      {note.is_visible_to_client ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { if (confirm("Delete note?")) deleteNoteMutation.mutate(note.id); }} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">{note.is_visible_to_client ? "👁 Visible to client" : "🔒 Hidden from client"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}