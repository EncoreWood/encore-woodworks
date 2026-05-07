import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Loader2, X, MessageSquare, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Notes slide-over panel ────────────────────────────────────────────────
function NotesPanel({ roomFile, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const queryKey = ["portalNotes", roomFile.id];

  const { data: notes = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.PortalNote.filter({ room_file_id: roomFile.id }),
    select: (all) => all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
  });

  const addNote = useMutation({
    mutationFn: (data) => base44.entities.PortalNote.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setNewNote(""); }
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, is_visible_to_client }) => base44.entities.PortalNote.update(id, { is_visible_to_client }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  const deleteNote = useMutation({
    mutationFn: (id) => base44.entities.PortalNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({
      project_id: roomFile.project_id,
      room_file_id: roomFile.id,
      note_text: newNote.trim(),
      author_name: currentUser?.full_name || "Admin",
      author_type: "admin",
      note_context: "room_file",
      is_visible_to_client: true
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-80 h-full bg-white shadow-2xl flex flex-col z-10">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div>
            <p className="text-sm font-semibold text-slate-800">Notes</p>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{roomFile.label || roomFile.file_name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notes.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No notes yet</p>}
          {notes.map(note => (
            <div key={note.id} className={`rounded-lg p-3 border text-sm ${note.is_visible_to_client ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-700">{(note.author_name || "A")[0].toUpperCase()}</span>
                </div>
                <span className="text-xs font-medium text-slate-700">{note.author_name}</span>
                <Badge className={`text-xs py-0 px-1.5 ${note.author_type === "admin" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {note.author_type === "admin" ? "Admin" : "Client"}
                </Badge>
                {note.created_date && (
                  <span className="text-xs text-slate-400 ml-auto">{format(new Date(note.created_date), "MMM d")}</span>
                )}
              </div>
              <p className="text-slate-700">{note.note_text}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => toggleVisibility.mutate({ id: note.id, is_visible_to_client: !note.is_visible_to_client })}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                  title={note.is_visible_to_client ? "Visible to client — click to hide" : "Hidden from client — click to show"}
                >
                  {note.is_visible_to_client ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {note.is_visible_to_client ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => { if (confirm("Delete note?")) deleteNote.mutate(note.id); }}
                  className="text-xs text-red-400 hover:text-red-600 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <Textarea
            rows={2}
            placeholder="Add a note..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            className="text-sm resize-none mb-2"
          />
          <Button
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 h-8 text-xs"
            onClick={handleAddNote}
            disabled={!newNote.trim() || addNote.isPending}
          >
            {addNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Note"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Task form modal ────────────────────────────────────────────────────
function AddTaskModal({ open, onOpenChange, project, roomName, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", task_type: "General", due_date: "", requires_signature: false, admin_notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await base44.entities.ClientTask.create({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      title: form.title.trim(),
      description: form.description,
      task_type: form.task_type,
      due_date: form.due_date || undefined,
      requires_signature: form.requires_signature,
      admin_notes: form.admin_notes,
      status: "Pending"
    });
    setSaving(false);
    onCreated();
    onOpenChange(false);
    setForm({ title: "", description: "", task_type: "General", due_date: "", requires_signature: false, admin_notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Client Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="Task title" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
          </div>
          <div>
            <Label className="text-xs">Task Type</Label>
            <select
              value={form.task_type}
              onChange={e => {
                const t = e.target.value;
                setForm(f => ({ ...f, task_type: t, requires_signature: t === "Room Sign-Off" ? true : f.requires_signature }));
              }}
              className="mt-1 w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {["Room Sign-Off", "Review & Approve", "Provide Info", "General"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="req_sig" checked={form.requires_signature} onChange={e => setForm(f => ({ ...f, requires_signature: e.target.checked }))} />
            <label htmlFor="req_sig" className="text-sm text-slate-700">Requires Signature</label>
          </div>
          <div>
            <Label className="text-xs">Admin Notes (internal)</Label>
            <Textarea value={form.admin_notes} onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))} className="mt-1" rows={2} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={!form.title.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PhotosTasksTab({ project, roomName, roomId, currentUser, readOnly = false }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [label, setLabel] = useState("");
  const [notesPanel, setNotesPanel] = useState(null); // roomFile object
  const [lightbox, setLightbox] = useState(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const filesQK = ["roomFiles", project.id, roomName, "client"];
  const tasksQK = ["clientTasks", project.id, roomName];

  const { data: files = [] } = useQuery({
    queryKey: filesQK,
    queryFn: () => base44.entities.RoomFile.filter({ project_id: project.id }),
    select: all => all.filter(f => f.room_name?.toLowerCase() === roomName?.toLowerCase() && !f.is_shop_file)
  });

  const { data: noteCounts = {} } = useQuery({
    queryKey: ["noteCountsRoom", project.id, roomName],
    queryFn: async () => {
      const notes = await base44.entities.PortalNote.filter({ project_id: project.id });
      const counts = {};
      notes.forEach(n => {
        if (n.room_file_id) counts[n.room_file_id] = (counts[n.room_file_id] || 0) + 1;
      });
      return counts;
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: tasksQK,
    queryFn: () => base44.entities.ClientTask.filter({ project_id: project.id }),
    select: all => all.filter(t => t.room_name === roomName)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: filesQK })
  });

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.RoomFile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: filesQK }); setPendingFile(null); setLabel(""); }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQK })
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQK })
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.toLowerCase().split(".").pop();
    const file_type = ext === "pdf" ? "pdf" : "image";
    setUploading(false);
    setPendingFile({ file_url, file_name: file.name, file_type });
    e.target.value = "";
  };

  const handleConfirmUpload = () => {
    if (!pendingFile) return;
    createFileMutation.mutate({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      room_id: roomId || "",
      file_url: pendingFile.file_url,
      file_name: pendingFile.file_name,
      file_type: pendingFile.file_type,
      label: label.trim() || "",
      is_shop_file: false
    });
  };

  const statusColors = {
    Pending: "bg-amber-100 text-amber-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700"
  };

  return (
    <div className="space-y-6">
      {/* Section A: Room 3Ds / Photos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Room 3Ds & Photos</p>
          {!readOnly && (
            <>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Photo / File
              </Button>
            </>
          )}
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No files yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {files.map(f => (
              <div key={f.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                {f.file_type === "image" ? (
                  <button className="w-full" onClick={() => setLightbox(f)}>
                    <img src={f.file_url} alt={f.label || f.file_name} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                  </button>
                ) : (
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="w-full h-20 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors block">
                    <FileText className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-slate-500 truncate px-1 w-full text-center">{f.label || f.file_name}</span>
                  </a>
                )}
                {f.label && f.file_type === "image" && (
                  <p className="text-xs text-slate-500 px-1 py-0.5 truncate text-center bg-white border-t border-slate-100">{f.label}</p>
                )}
                {/* Notes button */}
                {!readOnly && (
                  <button
                    className="absolute bottom-1 left-1 bg-white/90 border border-slate-200 rounded px-1.5 py-0.5 text-xs flex items-center gap-1 hover:bg-amber-50 transition-colors"
                    onClick={() => setNotesPanel(f)}
                  >
                    <MessageSquare className="w-3 h-3 text-slate-500" />
                    {noteCounts[f.id] > 0 && (
                      <span className="bg-amber-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center font-bold">{noteCounts[f.id]}</span>
                    )}
                  </button>
                )}
                {!readOnly && (
                  <button
                    className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { if (confirm("Delete this file?")) deleteMutation.mutate(f.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Client Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Client Tasks</p>
          {!readOnly && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddTaskOpen(true)}>
              <Plus className="w-3 h-3" /> Add Client Task
            </Button>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No tasks assigned for this room</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge className="text-xs py-0 px-1.5 bg-slate-100 text-slate-600">{task.task_type}</Badge>
                      {task.due_date && <span className="text-xs text-slate-400">Due {format(new Date(task.due_date), "MMM d")}</span>}
                      {task.requires_signature && <span className="text-xs text-violet-600">✍ Signature</span>}
                    </div>
                    {task.requires_signature && task.status === "Completed" && task.signature_data && (
                      <img src={task.signature_data} alt="Signature" className="mt-1 h-8 border border-slate-200 rounded bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status] || statusColors.Pending}`}>
                      {task.status === "Completed" && <CheckCircle2 className="w-3 h-3 inline mr-0.5" />}{task.status}
                    </span>
                    {!readOnly && (
                      <>
                        {task.status !== "Completed" && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-emerald-600 hover:text-emerald-700 px-2" onClick={() => updateTaskMutation.mutate({ id: task.id, data: { status: "Completed" } })}>
                            ✓
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => { if (confirm("Delete task?")) deleteTaskMutation.mutate(task.id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Label prompt dialog */}
      <Dialog open={!!pendingFile} onOpenChange={open => { if (!open) { setPendingFile(null); setLabel(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Label (optional)</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">{pendingFile?.file_name}</p>
          <Input placeholder='e.g. "Front Elevation"' value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConfirmUpload()} autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setPendingFile(null); setLabel(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleConfirmUpload} disabled={createFileMutation.isPending}>
              {createFileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.label || lightbox.file_name} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
            <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={() => setLightbox(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Notes panel */}
      {notesPanel && <NotesPanel roomFile={notesPanel} currentUser={currentUser} onClose={() => setNotesPanel(null)} />}

      {/* Add task modal */}
      <AddTaskModal open={addTaskOpen} onOpenChange={setAddTaskOpen} project={project} roomName={roomName} onCreated={() => queryClient.invalidateQueries({ queryKey: tasksQK })} />
    </div>
  );
}