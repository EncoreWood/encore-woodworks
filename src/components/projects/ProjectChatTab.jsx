import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectChatTab({ project }) {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Current user (admin) for sender name
  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  // Find or create the project's chat room (shared with the client portal)
  useEffect(() => {
    let unsub;
    (async () => {
      try {
        let rooms = await base44.entities.ChatRoom.filter({ project_id: project.id });
        if (!rooms[0]) {
          rooms = [await base44.entities.ChatRoom.create({
            name: project.project_name || "Project Chat",
            project_id: project.id,
          })];
        }
        setRoom(rooms[0]);

        const msgs = await base44.entities.ChatMessage.filter({ room_id: rooms[0].id });
        setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100);

        unsub = base44.entities.ChatMessage.subscribe(evt => {
          if (evt.data?.room_id !== rooms[0].id) return;
          setMessages(prev => {
            const exists = prev.find(m => m.id === evt.id);
            if (evt.type === "delete") return prev.filter(m => m.id !== evt.id);
            if (exists) return prev.map(m => m.id === evt.id ? evt.data : m);
            return [...prev, evt.data].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        });
      } catch (e) {
        console.error("Chat tab load error:", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => unsub && unsub();
  }, [project.id]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || !room || sending) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        room_id: room.id,
        message: msg,
        user_name: user?.full_name || "Encore Team",
      });
      setText("");
    } catch (e) {
      console.error("Send message error:", e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col" style={{ height: "70vh" }}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <MessageSquare className="w-4 h-4 text-amber-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Client Chat</h3>
        <span className="text-xs text-slate-400">· Shared with the client portal</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No messages yet. Start the conversation — your client will see it in their portal.</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.user_name === (user?.full_name || "Encore Team") || m.created_by === user?.email;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-amber-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                  {!mine && <p className="text-xs font-semibold mb-0.5 opacity-60">{m.user_name || "Client"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  {m.created_date && (
                    <p className={`text-xs mt-0.5 ${mine ? "text-amber-100" : "text-slate-400"}`}>
                      {format(new Date(m.created_date), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-100 p-3 flex gap-2 bg-white">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message to your client..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <Button onClick={send} disabled={!text.trim() || sending} className="bg-amber-600 hover:bg-amber-700 rounded-xl h-10 w-10 p-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}