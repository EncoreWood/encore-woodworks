import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCTION_CHAT_MESSAGES_KEY } from "./useProductionChatUnread";

export default function ProductionChatTab({ currentUser }) {
  const queryClient = useQueryClient();
  const email = currentUser?.email;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: PRODUCTION_CHAT_MESSAGES_KEY,
    queryFn: () => base44.entities.ProductionChatMessage.list("-created_date", 200),
    staleTime: 30_000,
    enabled: !!email,
  });

  // Oldest first for display
  const sorted = [...messages].reverse();
  const latestId = sorted.length ? sorted[sorted.length - 1].id : null;

  // Real-time updates while viewing the chat
  useEffect(() => {
    const unsub = base44.entities.ProductionChatMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_CHAT_MESSAGES_KEY });
    });
    return unsub;
  }, [queryClient]);

  // Clear the unread badge: mark everything seen now, and again on each new message
  const markRead = useCallback(async () => {
    if (!email) return;
    try {
      const rows = await base44.entities.ProductionChatRead.filter({ user_email: email });
      const now = new Date().toISOString();
      if (rows[0]) {
        await base44.entities.ProductionChatRead.update(rows[0].id, { last_read_at: now });
      } else {
        await base44.entities.ProductionChatRead.create({ user_email: email, last_read_at: now });
      }
      queryClient.invalidateQueries({ queryKey: ["productionChatRead", email] });
    } catch (e) {
      console.error("Failed to mark chat read:", e);
    }
  }, [email, queryClient]);

  useEffect(() => { markRead(); }, [markRead, latestId]);

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestId]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !email) return;
    setSending(true);
    try {
      await base44.entities.ProductionChatMessage.create({
        message: trimmed,
        user_name: currentUser?.full_name || email,
        user_email: email,
      });
      setText("");
      queryClient.invalidateQueries({ queryKey: PRODUCTION_CHAT_MESSAGES_KEY });
      markRead();
    } catch (e) {
      console.error("Failed to send chat message:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col" style={{ height: "calc(100vh - 320px)" }}>
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-amber-600" />
        <h3 className="font-semibold text-slate-800">Production Chat</h3>
        <span className="text-xs text-slate-400">Everyone in the shop sees this chat</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No messages yet — say hi to the team 👋</p>
          </div>
        ) : (
          sorted.map(m => {
            const mine = m.user_email === email;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                  mine
                    ? "bg-amber-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!mine && (
                    <p className="text-xs font-bold text-slate-500 mb-0.5">{m.user_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-amber-200" : "text-slate-400"}`}>
                    {m.created_date ? format(new Date(m.created_date), "MMM d, h:mm a") : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the team…"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
        />
        <Button onClick={send} disabled={!text.trim() || sending} className="bg-amber-600 hover:bg-amber-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}