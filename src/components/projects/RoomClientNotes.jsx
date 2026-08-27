import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ChevronDown, Trash2, MessageSquare, Reply, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin view of client-submitted per-room notes (RoomNote entity).
 * Collapsible. Admins can reply to a note — replies are threaded and
 * visible to the client in their portal RoomNotes view.
 */
export default function RoomClientNotes({ project, roomName }) {
  const [open, setOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const qc = useQueryClient();
  const queryKey = ["room_client_notes", project.id, roomName];

  const { data: notes = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.RoomNote.filter({ project_id: project.id }, "-created_date")
      .then(all => (all || []).filter(n => n.room_name === roomName)),
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoomNote.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ note, text }) => {
      const replies = Array.isArray(note.replies) ? note.replies : [];
      const newReply = {
        id: `r_${Date.now()}`,
        text,
        author_name: me?.full_name || "Encore Team",
        author_email: me?.email || "",
        created_date: new Date().toISOString(),
      };
      return base44.entities.RoomNote.update(note.id, { replies: [...replies, newReply] });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setReplyText(""); setReplyingTo(null); },
  });

  const submitReply = (note) => {
    if (!replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate({ note, text: replyText.trim() });
  };

  const startReply = (id) => {
    setReplyingTo(replyingTo === id ? null : id);
    setReplyText("");
  };

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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startReply(n.id)}
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this client note?")) deleteMutation.mutate(n.id); }}
                    className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>

              {/* Replies (admin responses) */}
              {Array.isArray(n.replies) && n.replies.length > 0 && (
                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-amber-100">
                  {n.replies.map(r => (
                    <div key={r.id} className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.text}</p>
                      <p className="text-xs text-amber-600 mt-1">
                        {r.author_name || "Encore Team"}{r.created_date && ` · ${format(new Date(r.created_date), "MMM d, yyyy")}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === n.id && (
                <div className="mt-2 flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Write a reply to this client..."
                    className="flex-1 border border-amber-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => submitReply(n)}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {replyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Reply className="w-3.5 h-3.5" />} Send
                    </button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}