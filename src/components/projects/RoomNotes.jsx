import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Trash2, Loader2, MessageSquarePlus, Reply } from "lucide-react";

// Client-side per-room notes. Clients add questions/requests/preferences for the
// project team to see; each client can delete their own notes. Team replies
// (stored on the note's `replies` array) are shown threaded under each note.
export default function RoomNotes({ project, roomName, user }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const queryKey = ["room_notes", project.id, roomName];

  const { data: notes = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.RoomNote.filter({ project_id: project.id }, "-created_date")
      .then(all => (all || []).filter(n => n.room_name === roomName)),
  });

  const addMutation = useMutation({
    mutationFn: (note_text) => base44.entities.RoomNote.create({
      project_id: project.id,
      project_name: project.project_name,
      room_name: roomName,
      note_text,
      author_name: user?.full_name || "Client",
      author_email: user?.email || "",
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setText(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomNote.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const submit = () => {
    if (!text.trim() || addMutation.isPending) return;
    addMutation.mutate(text.trim());
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Your Side Notes</p>
      <div className="space-y-2 mb-3">
        {notes.length === 0 ? (
          <p className="text-xs text-slate-400">Add a side note for the {roomName} team to see — questions, requests, or preferences.</p>
        ) : notes.map(n => (
          <div key={n.id} className="p-3 rounded-xl bg-blue-50 border border-blue-100 group">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.note_text}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                {n.author_name}{n.created_date && ` · ${format(new Date(n.created_date), "MMM d, yyyy")}`}
              </p>
              {user?.email && n.author_email === user.email && (
                <button
                  onClick={() => { if (confirm("Delete this note?")) deleteMutation.mutate(n.id); }}
                  className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
            {/* Team replies */}
            {Array.isArray(n.replies) && n.replies.length > 0 && (
              <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-amber-200">
                {n.replies.map(r => (
                  <div key={r.id} className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.text}</p>
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Reply className="w-3 h-3" />
                      {r.author_name || "Encore Team"}{r.created_date && ` · ${format(new Date(r.created_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          placeholder="Add a side note..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || addMutation.isPending}
          className="px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1 self-start mt-0.5"
        >
          {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
          Add
        </button>
      </div>
    </div>
  );
}