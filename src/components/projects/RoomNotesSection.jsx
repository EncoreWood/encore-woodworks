import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, StickyNote, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Collapsible per-room internal notes section on the room card.
 * Notes are stored on the room object (project.rooms[roomIndex].notes)
 * and can be added/edited inline.
 */
export default function RoomNotesSection({ project, roomIndex }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const qc = useQueryClient();

  const room = project?.rooms?.[roomIndex] || {};
  const notes = room.notes || "";

  const saveMutation = useMutation({
    mutationFn: (newNotes) => {
      const rooms = [...(project.rooms || [])];
      rooms[roomIndex] = { ...(rooms[roomIndex] || {}), notes: newNotes };
      return base44.entities.Project.update(project.id, { rooms });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditing(false);
      toast.success("Room notes saved");
    },
    onError: (err) => {
      console.error("Failed to save room notes:", err);
      toast.error("Failed to save room notes");
    },
  });

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
                  onClick={() => saveMutation.mutate(text.trim())}
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
        </div>
      )}
    </div>
  );
}