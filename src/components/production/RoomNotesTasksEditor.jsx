import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { StickyNote, Plus, Trash2, Square, CheckSquare, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Dark-theme notes + task checklist editor for a room, used in the Room Info
 * view (RoomFilesModal). Notes are stored on project.rooms[idx].notes and
 * tasks on project.rooms[idx].room_tasks.
 */
export default function RoomNotesTasksEditor({ project, roomName }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [newTask, setNewTask] = useState("");

  const roomIndex = (project?.rooms || []).findIndex(
    r => (r.room_name || "").toLowerCase().trim() === (roomName || "").toLowerCase().trim()
  );
  const room = roomIndex >= 0 ? project.rooms[roomIndex] : {};
  const notes = room?.notes || "";
  const tasks = Array.isArray(room?.room_tasks) ? room.room_tasks : [];

  const saveMutation = useMutation({
    mutationFn: ({ patch, message }) => {
      const rooms = [...(project.rooms || [])];
      rooms[roomIndex] = { ...(rooms[roomIndex] || {}), ...patch };
      return base44.entities.Project.update(project.id, { rooms });
    },
    onSuccess: (_res, { message }) => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditing(false);
      toast.success(message);
    },
    onError: (err) => {
      console.error("Failed to save room notes/tasks:", err);
      toast.error("Failed to save");
    },
  });

  const save = (patch, message) => saveMutation.mutate({ patch, message });

  const addTask = () => {
    const val = newTask.trim();
    if (!val || saveMutation.isPending) return;
    save(
      { room_tasks: [...tasks, { id: `t_${Date.now()}`, text: val, done: false }] },
      "Task added"
    );
    setNewTask("");
  };

  const toggleTask = (task) => {
    if (saveMutation.isPending) return;
    save(
      { room_tasks: tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t) },
      task.done ? "Task reopened" : "Task completed"
    );
  };

  const deleteTask = (task) => {
    if (saveMutation.isPending) return;
    save({ room_tasks: tasks.filter(t => t.id !== task.id) }, "Task deleted");
  };

  return (
    <div>
      {/* Note */}
      <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Notes for this room..."
              className="w-full bg-black/30 border border-white/20 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => { setEditing(false); setText(""); }}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => save({ notes: text.trim() }, "Room notes saved")}
                disabled={saveMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {notes ? (
              <p className="text-white/90 text-sm whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-white/40 text-sm">No notes for this room yet.</p>
            )}
            <button
              onClick={() => { setText(notes); setEditing(true); }}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium mt-2"
            >
              <Pencil className="w-3 h-3" /> {notes ? "Edit" : "Add note"}
            </button>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="mt-3">
        {tasks.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {tasks.map(t => (
              <div key={t.id} className="group flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleTask(t)}
                  className={cn("flex-shrink-0", t.done ? "text-emerald-400" : "text-white/40 hover:text-amber-300")}
                  title={t.done ? "Mark as not done" : "Mark as done"}
                >
                  {t.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span className={cn("text-sm flex-1 min-w-0 break-words", t.done ? "line-through text-white/40" : "text-white/90")}>
                  {t.text}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTask(t)}
                  className="flex-shrink-0 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
            placeholder="Add a task for this room..."
            className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={addTask}
            disabled={!newTask.trim() || saveMutation.isPending}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}