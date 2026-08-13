import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare, Paperclip, X, FileText, Image as ImageIcon, Plus, Check, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url || "");

export default function ProjectChatTab({ project }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKeys, setSavedKeys] = useState(new Set());
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { base44.auth.me().then(u => setUser(u)).catch(() => {}); }, []);

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

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPendingFile({ name: file.name, url: file_url, type: isImage(file_url) ? "photo" : "file" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const send = async () => {
    const msg = text.trim();
    if ((!msg && !pendingFile) || !room || sending) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        room_id: room.id,
        message: msg || pendingFile?.name || "",
        user_name: user?.full_name || "Encore Team",
        attachments: pendingFile ? [pendingFile] : [],
      });
      setText("");
      setPendingFile(null);
    } catch (e) {
      console.error("Send message error:", e);
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const saveToProjectFiles = async (attachment, messageId) => {
    const key = messageId + attachment.url;
    setSavingKey(key);
    try {
      const fresh = await base44.entities.Project.filter({ id: project.id });
      const p = fresh[0];
      const files = [...(p.files || []), {
        name: attachment.name,
        url: attachment.url,
        tag: isImage(attachment.url) ? "job_photo" : "chat_attachment",
        uploaded_date: new Date().toISOString().split("T")[0],
      }];
      await base44.entities.Project.update(project.id, { files });
      setSavedKeys(s => new Set(s).add(key));
      toast({ title: isImage(attachment.url) ? "Added to Job Photos" : "Added to Project Files" });
    } catch (e) {
      console.error("Save to project files error:", e);
      toast({ title: "Failed to save to project", variant: "destructive" });
    } finally {
      setSavingKey(null);
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
                  {m.message && !(m.attachments?.length && m.message === m.attachments[0]?.name) && (
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  )}
                  {m.attachments?.length > 0 && (
                    <div className="space-y-1.5 mt-1">
                      {m.attachments.map((a, i) => {
                        const key = m.id + a.url;
                        const saved = savedKeys.has(key);
                        const saving = savingKey === key;
                        const img = a.type === "photo" || isImage(a.url);
                        return (
                          <div key={i} className="rounded-lg overflow-hidden bg-white/10">
                            {img ? (
                              <a href={a.url} target="_blank" rel="noopener noreferrer">
                                <img src={a.url} alt={a.name} className="max-h-48 w-full object-cover" />
                              </a>
                            ) : (
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1.5 text-sm underline">
                                <FileText className="w-4 h-4" /> {a.name}
                              </a>
                            )}
                            {!mine && (
                              <button
                                onClick={() => saveToProjectFiles(a, m.id)}
                                disabled={saving || saved}
                                className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1.5 transition-colors ${saved ? "text-emerald-600" : "text-amber-700 hover:bg-amber-50"}`}
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
                                {saved ? "Added to project" : saving ? "Saving…" : "Add to Project Files"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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

      {/* Pending attachment chip */}
      {pendingFile && (
        <div className="flex items-center gap-2 mx-4 mb-1 px-2.5 py-1.5 bg-amber-50 rounded-lg text-xs">
          {pendingFile.type === "photo" ? <ImageIcon className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-amber-600" />}
          <span className="flex-1 truncate text-slate-600">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-slate-100 p-3 flex gap-2 bg-white">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChosen} />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" className="rounded-xl h-10 w-10 p-0 flex-shrink-0">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message to your client..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <Button onClick={send} disabled={(!text.trim() && !pendingFile) || sending} className="bg-amber-600 hover:bg-amber-700 rounded-xl h-10 w-10 p-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}