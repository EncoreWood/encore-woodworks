import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Send, MessageSquare, Paperclip, X, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCTION_CHAT_MESSAGES_KEY } from "./useProductionChatUnread";
import ChatTaskDialog from "./ChatTaskDialog";
import { SignedImage, SignedFileLink } from "./SignedFileViews";

// Highlights @Name tokens inside a message bubble
function renderMessage(text, mentions, highlightClass) {
  if (!mentions?.length) return text;
  let segments = [{ text, hl: false }];
  mentions.forEach(m => {
    const token = `@${m.name}`;
    segments = segments.flatMap(seg => {
      if (seg.hl || !seg.text.includes(token)) return [seg];
      const idx = seg.text.indexOf(token);
      return [
        { text: seg.text.slice(0, idx), hl: false },
        { text: token, hl: true },
        { text: seg.text.slice(idx + token.length), hl: false },
      ];
    });
  });
  return segments.map((s, i) => s.hl
    ? <span key={i} className={highlightClass}>{s.text}</span>
    : <span key={i}>{s.text}</span>);
}

export default function ProductionChatTab({ currentUser }) {
  const queryClient = useQueryClient();
  const email = currentUser?.email;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pendingMentions, setPendingMentions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const dismissedMentionText = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [taskSource, setTaskSource] = useState(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: PRODUCTION_CHAT_MESSAGES_KEY,
    queryFn: () => base44.entities.ProductionChatMessage.list("-created_date", 200),
    staleTime: 30_000,
    enabled: !!email,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 60_000,
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

  // ── @mention picker ──
  const mentionMatch = /(^|\s)@(\S*)$/.exec(text);
  const mentionSearch = mentionMatch ? mentionMatch[2].toLowerCase() : null;
  const mentionOptions = (mentionSearch !== null && text !== dismissedMentionText.current)
    ? employees
        .filter(e => (e.full_name || "").toLowerCase().includes(mentionSearch))
        .slice(0, 6)
    : [];
  const showMentions = mentionOptions.length > 0;

  useEffect(() => { setMentionIndex(0); }, [mentionSearch]);

  const insertMention = (emp) => {
    setText(prev => prev.replace(/@(\S*)$/, `@${emp.full_name} `));
    setPendingMentions(prev => [
      ...prev.filter(m => m.email !== (emp.user_email || emp.email)),
      { name: emp.full_name, email: emp.user_email || emp.email },
    ]);
    dismissedMentionText.current = null;
  };

  // ── attachments ──
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const isPhoto = file.type.startsWith("image/");
        setAttachments(prev => [...prev, { name: file.name, url: file_uri, type: isPhoto ? "photo" : "file" }]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || sending || !email) return;
    setSending(true);
    try {
      await base44.entities.ProductionChatMessage.create({
        message: trimmed,
        user_name: currentUser?.full_name || email,
        user_email: email,
        mentions: pendingMentions.filter(m => trimmed.includes(`@${m.name}`)),
        attachments,
      });
      setText("");
      setAttachments([]);
      setPendingMentions([]);
      queryClient.invalidateQueries({ queryKey: PRODUCTION_CHAT_MESSAGES_KEY });
      markRead();
    } catch (e) {
      console.error("Failed to send chat message:", e);
      toast.error("Message failed to send");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (showMentions) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionOptions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionOptions.length) % mentionOptions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionOptions[mentionIndex]); return; }
      if (e.key === "Escape") { dismissedMentionText.current = text; return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
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
              <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                  mine
                    ? "bg-amber-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!mine && (
                    <p className="text-xs font-bold text-slate-500 mb-0.5">{m.user_name}</p>
                  )}
                  {m.message && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {renderMessage(m.message, m.mentions, mine ? "font-bold underline" : "font-bold text-amber-700 underline")}
                    </p>
                  )}

                  {/* Attachments */}
                  {(m.attachments || []).length > 0 && (
                    <div className={`flex flex-wrap gap-2 mt-2 ${m.message ? "" : "mt-0"}`}>
                      {m.attachments.map((att, i) => att.type === "photo" ? (
                        <SignedImage
                          key={i}
                          fileUri={att.url}
                          alt={att.name}
                          className="max-w-[220px] max-h-[160px] rounded-lg object-cover cursor-zoom-in border"
                          onClick={() => setLightboxUrl(att.url)}
                        />
                      ) : (
                        <SignedFileLink key={i} fileUri={att.url} name={att.name}
                          className={`text-xs underline ${mine ? "text-amber-100" : "text-slate-600"}`} />
                      ))}
                    </div>
                  )}

                  {/* Linked task badge */}
                  {m.task_id && (
                    <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${mine ? "bg-amber-700/40 text-amber-50" : "bg-white border border-slate-200 text-slate-600"}`}>
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>Task · {m.task_summary || "Created"}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-[10px] ${mine ? "text-amber-200" : "text-slate-400"}`}>
                      {m.created_date ? format(new Date(m.created_date), "MMM d, h:mm a") : ""}
                    </p>
                    <button
                      onClick={() => setTaskSource(m)}
                      title="Create task from this message"
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${mine ? "hover:bg-amber-700/50 text-amber-100" : "hover:bg-slate-200 text-slate-500"}`}
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending attachments preview */}
      {attachments.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.type === "photo" ? (
                <SignedImage fileUri={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[9px] text-center px-1 truncate">{att.name}</div>
              )}
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white rounded-full p-0.5 shadow"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* @mention picker */}
      {showMentions && (
        <div className="mx-3 mb-2 border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {mentionOptions.map((emp, i) => (
            <button
              key={emp.id}
              onClick={() => insertMention(emp)}
              className={`w-full text-left px-3 py-2 text-sm ${i === mentionIndex ? "bg-amber-50" : "bg-white hover:bg-slate-50"}`}
            >
              <span className="font-medium text-slate-700">{emp.full_name}</span>
              {emp.user_email || emp.email ? <span className="ml-2 text-xs text-slate-400">{emp.user_email || emp.email}</span> : null}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-200 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.txt,.csv,.xlsx,.docx"
          className="hidden"
          onChange={handleFiles}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          title="Attach photos or files"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message the team… use @ to tag someone"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
        />
        <Button onClick={send} disabled={(!text.trim() && attachments.length === 0) || sending} className="bg-amber-600 hover:bg-amber-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Full-screen image viewer */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <SignedImage fileUri={lightboxUrl} alt="Attachment" className="max-w-full max-h-full rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <ChatTaskDialog
        open={!!taskSource}
        onOpenChange={(o) => { if (!o) setTaskSource(null); }}
        message={taskSource}
        employees={employees}
        onTaskCreated={() => queryClient.invalidateQueries({ queryKey: PRODUCTION_CHAT_MESSAGES_KEY })}
      />
    </div>
  );
}