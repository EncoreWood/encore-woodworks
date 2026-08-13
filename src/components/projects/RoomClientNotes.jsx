import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ChevronDown, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin view of client-submitted per-room notes (RoomNote entity).
 * Collapsible so it doesn't consume vertical space when not in use.
 */
export default function RoomClientNotes({ project, roomName }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const queryKey = ["room_client_notes", project.id, roomName];

  const { data: notes = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.RoomNote.filter({ project_id: project.id }, "-created_date")
      .then(all => (all || []).filter(n => n.room_name === roomName)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomNote.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Notes</span>
        {notes.length > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {notes.length}
          </span>
        )}
        <ChevronDown className={cn("w-4 h-4 text-slate-400 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {notes.length === 0 ? (
            <p className="text-xs text-slate-400">No client notes submitted for this room.</p>
          ) : notes.map(n => (
            <div key={n.id} className="p-2.5 rounded-lg bg-white border border-amber-100 group">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.note_text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-400">
                  {n.author_name}{n.created_date && ` · ${format(new Date(n.created_date), "MMM d, yyyy")}`}
                </p>
                <button
                  onClick={() => { if (confirm("Delete this client note?")) deleteMutation.mutate(n.id); }}
                  className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}