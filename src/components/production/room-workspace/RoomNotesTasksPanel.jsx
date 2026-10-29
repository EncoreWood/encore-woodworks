import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Square, CheckSquare, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Light-theme notes + task checklist editor for a room, used in the Room
 * Workspace right pane. Notes live on project.rooms[idx].notes, tasks on
 * project.rooms[idx].room_tasks — same data as the production Room Info view.
 */
export default function RoomNotesTasksPanel({ project, roomName }) {
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
    mutationFn: ({ patch }) => {
      const rooms = [...(project.rooms || [])];
      rooms[roomIndex] = { ...(rooms[roomIndex] || {}), ...patch };
      return base44.entities.Project.update(project.id, { rooms });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditing(false);
    },
    onError: (err) => {
      console.error("Failed to save room notes/tasks:", err);
      toast.error("Failed to save");
    },
  });

  const save = (patch) => saveMutation.mutate({ patch });
  const canEdit = roomIndex >= 0 && !!project?.id;

  const addTask = () => {
    const val = newTask.trim();
    if (!val || saveMutation.isPending) return;
    save({ room_tasks: [...tasks, { id: `t_${Date.now()}`, text: val, done: false }] });
    setNewTask("");
  };

  const toggleTask = (task) => {
    if (saveMutation.isPending) return;
    save({ room_tasks: tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t) });
  };

  const deleteTask = (task) => {
    if (saveMutation.isPending) return;
    save({ room_tasks: tasks.filter(t => t.id !== task.id) });
  };

  return (
    <div className="space-y-3">
      {/* Notes */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Notes for this room..."
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setText(""); }}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save({ notes: text.trim() })}
                disabled={saveMutation.isPending}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {notes ? (
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-xs text-slate-400">No notes for this room yet.</p>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => { setText(notes); setEditing(true); }}
                className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-medium mt-1.5"
              >
                <Pencil className="w-3 h-3" /> {notes ? "Edit" : "Add note"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div>
        {tasks.length > 0 && (
          <div className="space-y-1 mb-2">
            {tasks.map(t => (
              <div key={t.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleTask(t)}
                  disabled={!canEdit}
                  className={cn("flex-shrink-0", t.done ? "text-emerald-600" : "text-slate-400 hover:text-amber-600")}
                  title={t.done ? "Mark as not done" : "Mark as done"}
                >
                  {t.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span className={cn("text-xs flex-1 min-w-0 break-words", t.done ? "line-through text-slate-400" : "text-slate-700")}>
                  {t.text}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteTask(t)}
                    className="flex-shrink-0 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
              placeholder="Add a task for this room..."
              className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="button"
              onClick={addTask}
              disabled={!newTask.trim() || saveMutation.isPending}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
              title="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}