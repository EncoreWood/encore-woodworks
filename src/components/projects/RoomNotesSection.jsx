import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, StickyNote, Loader2, Plus, Trash2, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Collapsible per-room internal notes + task checklist section on the room card.
 * Notes are stored on the room object (project.rooms[roomIndex].notes) and
 * tasks on project.rooms[roomIndex].room_tasks — both edited inline.
 */
export default function RoomNotesSection({ project, roomIndex }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [newTask, setNewTask] = useState("");
  const qc = useQueryClient();

  const room = project?.rooms?.[roomIndex] || {};
  const notes = room.notes || "";
  const tasks = Array.isArray(room.room_tasks) ? room.room_tasks : [];
  const doneCount = tasks.filter(t => t.done).length;

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
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/40" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <StickyNote className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Notes</span>
        {notes && (
          <span className="ml-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">
            ✓
          </span>
        )}
        {tasks.length > 0 && (
          <span className={cn(
            "min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold",
            doneCount === tasks.length ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
          )}>
            {doneCount}/{tasks.length}
          </span>
        )}
        <ChevronDown className={cn("w-4 h-4 text-slate-400 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3">
          {editing ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Notes for this room..."
                autoFocus
                className="w-full border border-indigo-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => { setEditing(false); setText(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate({ patch: { notes: text.trim() }, message: "Room notes saved" })}
                  disabled={saveMutation.isPending}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white border border-indigo-100 p-2.5">
              {notes ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
              ) : (
                <p className="text-xs text-slate-400">No notes for this room yet.</p>
              )}
              <button
                onClick={() => { setText(notes); setEditing(true); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-2"
              >
                {notes ? "Edit" : "+ Add Notes"}
              </button>
            </div>
          )}

          {/* Tasks checklist for this room */}
          <div className="mt-2">
            {tasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {tasks.map(t => (
                  <div key={t.id} className="group flex items-center gap-2 rounded-lg bg-white border border-indigo-100 px-2.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleTask(t)}
                      className={cn("flex-shrink-0", t.done ? "text-emerald-500" : "text-slate-300 hover:text-indigo-400")}
                      title={t.done ? "Mark as not done" : "Mark as done"}
                    >
                      {t.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span className={cn("text-sm flex-1 min-w-0 break-words", t.done ? "line-through text-slate-400" : "text-slate-700")}>
                      {t.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTask(t)}
                      className="flex-shrink-0 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="flex-1 min-w-0 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!newTask.trim() || saveMutation.isPending}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-40"
                title="Add task"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}