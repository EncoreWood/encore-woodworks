import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Download, MessageSquare, Send, X, DollarSign, Image, FileText, Calendar, MapPin, User, ClipboardList, StickyNote, Clock, DoorOpen, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import GanttChart from "@/components/projects/GanttChart";
import SlideCard from "@/components/presentations/SlideCard";
import JobPhotosSection from "@/components/projects/JobPhotosSection";
import RoomNotes from "@/components/projects/RoomNotes";
import { cn } from "@/lib/utils";

// ── Milestone tracker ──────────────────────────────────────────────────────
function Milestones({ project }) {
  const steps = [
    { key: "design_complete", label: "Design" },
    { key: "materials_ordered", label: "Materials" },
    { key: "production_complete", label: "Production" },
    { key: "installation_complete", label: "Installation" },
  ];
  const done = steps.filter(s => project[s.key]).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, i) => {
          const completed = !!project[step.key];
          const active = !completed && i === done;
          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="relative flex flex-col items-center">
                {i > 0 && (
                  <div className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= done ? "bg-amber-500" : "bg-slate-200"}`} style={{ width: "calc(100% - 2rem)" }} />
                )}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 transition-all ${completed ? "bg-amber-500 border-amber-500" : active ? "bg-white border-amber-400 shadow-md" : "bg-white border-slate-200"}`}>
                  {completed ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Circle className={`w-5 h-5 ${active ? "text-amber-400" : "text-slate-300"}`} />}
                </div>
              </div>
              <span className={`text-xs mt-2 font-medium ${completed ? "text-amber-600" : active ? "text-slate-700" : "text-slate-400"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <p className="text-xs text-slate-500 text-center mt-2">{done} of {steps.length} milestones complete</p>
    </div>
  );
}

// ── Timeline chart ──────────────────────────────────────────────────────────
function TimelineSection({ projectId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.entities.TimelineEvent.filter({ project_id: projectId }, "sort_order").then(evts => {
      setEvents(evts.filter(e => e.is_client_visible !== false));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!events.length) return <p className="text-sm text-slate-400 text-center py-6">No timeline available yet.</p>;
  return <GanttChart events={events} readOnly />;
}

// ── Presentation slideshow ─────────────────────────────────────────────────
function PresentationSlideshow({ projectId }) {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    base44.entities.Presentation.filter({ project_id: projectId }).then(async presentations => {
      if (!presentations[0]) return;
      const s = await base44.entities.PresentationSlide.filter({ presentation_id: presentations[0].id });
      setSlides(s.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    });
  }, [projectId]);
  if (!slides.length) return <p className="text-sm text-slate-400 text-center py-6">No presentation available yet.</p>;
  const slide = slides[idx];
  return (
    <div>
      <div className="mb-3">
        <SlideCard key={slide.id} slide={slide} onUpdate={() => {}} editable={false} />
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="bg-slate-100 hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-sm text-slate-500 font-medium">{idx + 1} / {slides.length}</span>
          <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} className="bg-slate-100 hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Messages ───────────────────────────────────────────────────────────────
function Messages({ projectId, user }) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const isImg = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url || "");

  useEffect(() => {
    base44.entities.ChatRoom.filter({ project_id: projectId }).then(rooms => {
      if (rooms[0]) {
        setRoom(rooms[0]);
        base44.entities.ChatMessage.filter({ room_id: rooms[0].id }).then(msgs => {
          setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
          setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
        });
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (!room) return;
    const unsub = base44.entities.ChatMessage.subscribe(evt => {
      if (evt.data?.room_id === room.id) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === evt.id);
          if (evt.type === "delete") return prev.filter(m => m.id !== evt.id);
          if (exists) return prev.map(m => m.id === evt.id ? evt.data : m);
          return [...prev, evt.data].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    });
    return unsub;
  }, [room]);

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPendingFile({ name: file.name, url: file_url, type: isImg(file_url) ? "photo" : "file" });
    } catch (err) { console.error(err); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const send = async () => {
    const msg = text.trim();
    if ((!msg && !pendingFile) || !room || sending) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        room_id: room.id,
        message: msg || pendingFile?.name || "",
        user_name: user?.full_name || "Client",
        attachments: pendingFile ? [pendingFile] : [],
      });
      setText(""); setPendingFile(null);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  if (!room) return <p className="text-sm text-slate-400 text-center py-6">No message thread yet. Your project team will set one up soon.</p>;

  return (
    <div className="flex flex-col h-72">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map(m => {
          const mine = m.user_name === (user?.full_name || "Client") || m.created_by === user?.email;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-amber-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                {!mine && <p className="text-xs font-semibold mb-0.5 opacity-60">{m.user_name || "Team"}</p>}
                {m.message && !(m.attachments?.length && m.message === m.attachments[0]?.name) && <p>{m.message}</p>}
                {m.attachments?.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {m.attachments.map((a, i) => (
                      <div key={i}>
                        {a.type === "photo" || isImg(a.url) ? (
                          <a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="rounded-lg max-h-36 object-cover" /></a>
                        ) : (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                            <FileText className="w-4 h-4" /> {a.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-0.5 ${mine ? "text-amber-100" : "text-slate-400"}`}>{m.created_date ? format(new Date(m.created_date), "h:mm a") : ""}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {pendingFile && (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-amber-50 rounded-lg text-xs">
          {pendingFile.type === "photo" ? <Image className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-amber-600" />}
          <span className="flex-1 truncate text-slate-600">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
        </div>
      )}
      <div className="flex gap-2 mt-3 border-t pt-3">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChosen} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex-shrink-0 disabled:opacity-50">
          {uploading ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="Type a message..." />
        <Button onClick={send} disabled={(!text.trim() && !pendingFile) || sending} size="sm" className="bg-amber-500 hover:bg-amber-600 rounded-xl h-10 w-10 p-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
        <span className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center"><Icon className="w-4 h-4 text-amber-600" /></span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Tasks section ─────────────────────────────────────────────────────────
function ClientTasks({ projectId }) {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    base44.entities.ClientTask.filter({ project_id: projectId }).then(setTasks);
  }, [projectId]);

  const statusColor = { Pending: "bg-slate-100 text-slate-600", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-emerald-100 text-emerald-700" };

  if (!tasks.length) return <p className="text-sm text-slate-400 text-center py-6">No tasks assigned yet.</p>;

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800">{task.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[task.status] || statusColor.Pending}`}>{task.status}</span>
          </div>
          <p className="text-xs text-slate-500">{task.task_type}{task.due_date ? ` · Due ${format(new Date(task.due_date), "MMM d, yyyy")}` : ""}{task.requires_signature ? " · Signature required" : ""}</p>
          {task.admin_notes && <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-200 pt-2">{task.admin_notes}</p>}
          {task.signed_by && <p className="text-xs text-emerald-600 mt-1">✓ Signed by {task.signed_by}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Notes section ─────────────────────────────────────────────────────────
function PortalNotes({ projectId }) {
  const [notes, setNotes] = useState([]);
  useEffect(() => {
    base44.entities.PortalNote.filter({ project_id: projectId, is_visible_to_client: true }).then(setNotes);
  }, [projectId]);

  if (!notes.length) return <p className="text-sm text-slate-400 text-center py-6">No notes from your project team yet.</p>;

  return (
    <div className="space-y-3">
      {notes.map(note => (
        <div key={note.id} className="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-sm text-slate-700">{note.note_text}</p>
          <p className="text-xs text-slate-400 mt-2">{note.author_name || "Project Team"}</p>
        </div>
      ))}
    </div>
  );
}

// ── Rooms section ─────────────────────────────────────────────────────────
function RoomsSection({ project, user }) {
  const [roomFiles, setRoomFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [openRoom, setOpenRoom] = useState(null);

  useEffect(() => {
    base44.entities.RoomFile.filter({ project_id: project.id }).then(files => {
      setRoomFiles(files.filter(f => !f.is_shop_file));
    });
  }, [project.id]);

  const rooms = (project.rooms || []);
  if (!rooms.length) return <p className="text-sm text-slate-400 text-center py-6">No rooms added yet.</p>;

  const SELECTION_LABELS = {
    cabinet_style: "Cabinet Style", wood_species: "Wood Species", finish: "Finish",
    door_style: "Door Style", handles: "Hardware", drawer_glides: "Drawer Glides",
    hinges: "Hinges", molding: "Molding", cabs_to_height: "Cabs to Height", cabinet_count: "Cabinet Count"
  };

  return (
    <div className="space-y-3">
      {rooms.map((room, idx) => {
        const photos = roomFiles.filter(f => f.room_name?.toLowerCase() === room.room_name?.toLowerCase());
        const isOpen = openRoom === idx;
        const hasSelections = Object.keys(SELECTION_LABELS).some(k => room[k]);

        return (
          <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
              onClick={() => setOpenRoom(isOpen ? null : idx)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <DoorOpen className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{room.room_name || `Room ${idx + 1}`}</p>
                  {room.cabinet_count && <p className="text-xs text-slate-400">{room.cabinet_count} cabinets</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {photos.length > 0 && <span className="text-xs text-slate-400">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>}
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </div>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 bg-white border-t border-slate-100 space-y-4">
                {/* Selections */}
                {hasSelections && (
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    {Object.entries(SELECTION_LABELS).map(([key, label]) => {
                      if (!room[key]) return null;
                      return (
                        <div key={key} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-slate-800">{room[key]}</p>
                        </div>
                      );
                    })}
                    {(room.custom_selections || []).map((cs, ci) => (
                      <div key={ci} className="bg-amber-50 rounded-xl p-3">
                        <p className="text-xs text-amber-500 font-medium mb-0.5">{cs.label}</p>
                        <p className="text-sm font-semibold text-slate-800">{cs.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {room.notes && (
                  <p className="text-sm text-slate-600 bg-amber-50/50 rounded-xl p-3">{room.notes}</p>
                )}

                {/* Photos */}
                {photos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Photos & Files</p>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map(f => (
                        f.file_type === "image" ? (
                          <button key={f.id} onClick={() => setLightbox(f)} className="rounded-xl overflow-hidden border border-slate-100">
                            <img src={f.file_url} alt={f.label || f.file_name} className="w-full aspect-square object-cover hover:opacity-90 transition-opacity" />
                          </button>
                        ) : (
                          <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center gap-1 aspect-square bg-slate-50 rounded-xl border border-slate-100 hover:bg-amber-50 transition-colors">
                            <FileText className="w-6 h-6 text-red-400" />
                            <span className="text-xs text-slate-500 truncate px-1 w-full text-center">{f.label || f.file_name}</span>
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Client side notes */}
                <RoomNotes project={project} roomName={room.room_name || `Room ${idx + 1}`} user={user} />

                {!hasSelections && !room.notes && photos.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-3">No details added yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.label || lightbox.file_name} className="max-h-[90vh] max-w-full rounded-xl object-contain" />
            <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={() => setLightbox(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home highlights (attention items) ──────────────────────────────────────
function HomeHighlights({ project, user, onGoTab }) {
  const [tasks, setTasks] = useState([]);
  const [hasMessages, setHasMessages] = useState(false);
  useEffect(() => {
    base44.entities.ClientTask.filter({ project_id: project.id }).then(setTasks).catch(() => {});
    base44.entities.ChatRoom.filter({ project_id: project.id }).then(r => setHasMessages(r.length > 0)).catch(() => {});
  }, [project.id]);

  const pending = tasks.filter(t => t.status !== "Completed");
  const sigTasks = pending.filter(t => t.requires_signature);
  if (pending.length === 0 && !hasMessages) return null;

  return (
    <Section title="Needs Your Attention" icon={ClipboardList}>
      <div className="space-y-2">
        {pending.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <ClipboardList className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-slate-700">{pending.length} pending task{pending.length !== 1 ? "s" : ""}{sigTasks.length > 0 && ` · ${sigTasks.length} need${sigTasks.length === 1 ? "s" : ""} signature`} — see Your Tasks below</span>
          </div>
        )}
        {hasMessages && (
          <button onClick={() => onGoTab("messages")} className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
            <span className="text-sm text-slate-700 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" />Open your message thread</span>
            <ChevronRight className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </div>
    </Section>
  );
}

// ── Project picker (multi-project clients) ────────────────────────────────
function ProjectPicker({ projects, user, onPick }) {
  const statusLabels = {
    inquiry: "Inquiry", quoted: "Quoted", likely_approved: "Likely Approved", approved: "Approved", in_design: "In Design",
    in_production: "In Production", ready_for_install: "Ready for Install",
    installing: "Installing", completed: "Completed", on_hold: "On Hold"
  };
  const statusColors = {
    inquiry: "bg-slate-100 text-slate-600", quoted: "bg-blue-100 text-blue-700",
    likely_approved: "bg-teal-100 text-teal-700", approved: "bg-emerald-100 text-emerald-700",
    in_design: "bg-violet-100 text-violet-700", in_production: "bg-amber-100 text-amber-700",
    ready_for_install: "bg-cyan-100 text-cyan-700", installing: "bg-orange-100 text-orange-700",
    completed: "bg-emerald-100 text-emerald-700", on_hold: "bg-red-100 text-red-700"
  };
  const thumb = (p) => (p.files || []).find(f => f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || f.tag === "job_photo");

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/20">
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-14" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-amber-600" /></div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
              <button onClick={() => base44.auth.logout()} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Your Projects</h1>
        <p className="text-sm text-slate-500 mb-6">Select a project to view its portal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map(({ project: p }) => {
            const photo = thumb(p);
            return (
              <button key={p.id} onClick={() => onPick(p.id)}
                className="text-left bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:border-amber-300 hover:shadow-md transition-all">
                <div className="h-32 bg-gradient-to-br from-stone-200 to-amber-100/40 relative">
                  {photo ? (
                    <img src={photo.url} alt={p.project_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Image className="w-10 h-10 text-stone-300" /></div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 truncate">{p.project_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[p.status] || statusColors.inquiry}`}>{statusLabels[p.status] || p.status}</span>
                  </div>
                  {p.address && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.address}</p>}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-slate-300 pt-8">Powered by Encore Woodworks</p>
      </div>
    </div>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [accessible, setAccessible] = useState([]); // [{ project, settings }]
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalTab, setPortalTab] = useState("home");

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (!u?.email) { setLoading(false); return; }

      // Gather every project this client is associated with, from both sources.
      const idSet = new Set();
      try {
        const settingsMatches = await base44.entities.ClientPortalSettings.filter({ client_email: u.email });
        settingsMatches.forEach(s => { if (s.project_id) idSet.add(s.project_id); });
      } catch {}
      try {
        const projectMatches = await base44.entities.Project.filter({ client_email: u.email });
        projectMatches.forEach(p => { if (p.id) idSet.add(p.id); });
      } catch {}

      if (idSet.size === 0) { setLoading(false); return; }

      const entries = await Promise.all([...idSet].map(async id => {
        try {
          const [projs, sets] = await Promise.all([
            base44.entities.Project.filter({ id }),
            base44.entities.ClientPortalSettings.filter({ project_id: id }),
          ]);
          const p = projs[0];
          if (!p || p.archived) return null;
          const s = sets[0] || { is_active: true, show_status: true, show_milestones: true, show_presentations: true, show_documents: true, show_photos: true, show_financials: false, show_messages: true };
          // Only show projects whose portal is active
          if (s.is_active === false) return null;
          return { project: p, settings: s };
        } catch { return null; }
      }));

      const active = entries.filter(Boolean)
        .sort((a, b) => new Date(b.project.updated_date || 0) - new Date(a.project.updated_date || 0));
      setAccessible(active);
      // Single project: skip the picker and go straight in.
      if (active.length === 1) setSelectedId(active[0].project.id);
      setLoading(false);
    })();
  }, []);

  const selected = accessible.find(a => a.project.id === selectedId) || null;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (accessible.length === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center p-6">
      <div className="text-center">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-20 mx-auto mb-6 opacity-80" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Your portal is being set up</h2>
        <p className="text-slate-500 text-sm">Your project team will have this ready shortly.</p>
      </div>
    </div>
  );

  if (!selected) {
    return <ProjectPicker projects={accessible} user={user} onPick={setSelectedId} />;
  }

  const project = selected.project;
  const settings = selected.settings;

  const statusLabels = {
    inquiry: "Inquiry", quoted: "Quoted", likely_approved: "Likely to Be Approved", approved: "Approved", in_design: "In Design",
    in_production: "In Production", ready_for_install: "Ready for Install",
    installing: "Installing", completed: "Completed", on_hold: "On Hold"
  };
  const statusColors = {
    inquiry: "bg-slate-100 text-slate-600", quoted: "bg-blue-100 text-blue-700",
    likely_approved: "bg-teal-100 text-teal-700",
    approved: "bg-emerald-100 text-emerald-700", in_design: "bg-violet-100 text-violet-700",
    in_production: "bg-amber-100 text-amber-700", ready_for_install: "bg-cyan-100 text-cyan-700",
    installing: "bg-orange-100 text-orange-700", completed: "bg-emerald-100 text-emerald-700",
    on_hold: "bg-red-100 text-red-700"
  };

  const documents = (project.files || []).filter(f => !f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && f.tag !== "cad_dxf");
  const photos = (project.files || []).filter(f => f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || f.tag === "job_photo");

  return (
    <div key={selectedId} className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-14" />
          <div className="flex items-center gap-2">
            {accessible.length > 1 && (
              <button onClick={() => setSelectedId(null)} className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Switch Project
              </button>
            )}
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-amber-600" />
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
              <button onClick={() => base44.auth.logout()} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {settings?.welcome_message && <p className="text-amber-300 text-sm mb-2 font-medium">{settings.welcome_message}</p>}
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{project.project_name}</h1>
          {project.address && <p className="text-stone-300 text-sm flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{project.address}</p>}
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[project.status] || "bg-slate-100 text-slate-600"}`}>
              {statusLabels[project.status] || project.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      {(() => {
        const tabs = [
          { key: "home", label: "Home", show: true },
          { key: "rooms", label: "Rooms", show: (project.rooms?.length || 0) > 0 },
          { key: "photos", label: "Photos", show: settings?.show_photos !== false },
          { key: "documents", label: "Documents", show: settings?.show_documents !== false && documents.length > 0 },
          { key: "presentations", label: "Presentations", show: settings?.show_presentations !== false },
          { key: "messages", label: "Messages", show: settings?.show_messages !== false },
          { key: "financials", label: "Financials", show: !!settings?.show_financials },
          { key: "notes", label: "Notes", show: settings?.show_notes !== false },
        ].filter(t => t.show);
        return (
          <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
            <div className="max-w-2xl mx-auto px-2 flex gap-1 overflow-x-auto no-scrollbar">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setPortalTab(t.key)}
                  className={cn("px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    portalTab === t.key ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700")}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {portalTab === "home" && (
          <>
            {settings?.show_status !== false && (
              <Section title="Project Status" icon={Calendar}>
                <div className="grid grid-cols-2 gap-4">
                  {project.start_date && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Start Date</p>
                      <p className="text-sm font-semibold text-slate-700">{format(new Date(project.start_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  {project.estimated_completion && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Est. Completion</p>
                      <p className="text-sm font-semibold text-slate-700">{format(new Date(project.estimated_completion), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  {project.install_start_date && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Install Start</p>
                      <p className="text-sm font-semibold text-amber-700">{format(new Date(project.install_start_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  {project.install_end_date && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-0.5">Install End</p>
                      <p className="text-sm font-semibold text-amber-700">{format(new Date(project.install_end_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {settings?.show_milestones !== false && (
              <Section title="Progress" icon={CheckCircle2}>
                <Milestones project={project} />
              </Section>
            )}

            {settings?.show_timeline !== false && (
              <Section title="Project Timeline" icon={Clock}>
                <TimelineSection projectId={project.id} />
              </Section>
            )}

            <HomeHighlights project={project} user={user} onGoTab={setPortalTab} />

            {settings?.show_tasks !== false && (
              <Section title="Your Tasks" icon={ClipboardList}>
                <ClientTasks projectId={project.id} />
              </Section>
            )}
          </>
        )}

        {portalTab === "rooms" && (project.rooms?.length || 0) > 0 && (
          <Section title="Your Rooms" icon={DoorOpen}>
            <RoomsSection project={project} user={user} />
          </Section>
        )}

        {portalTab === "photos" && settings?.show_photos !== false && (
          <Section title="Job Photos" icon={Image}>
            <JobPhotosSection project={project} user={user} canDelete={false} extraPhotos={photos} />
          </Section>
        )}

        {portalTab === "documents" && settings?.show_documents !== false && documents.length > 0 && (
          <Section title="Documents" icon={FileText}>
            <div className="space-y-2">
              {documents.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-slate-700 font-medium flex-1 truncate">{f.name}</span>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {portalTab === "presentations" && settings?.show_presentations !== false && (
          <Section title="3D Presentations" icon={Image}>
            <PresentationSlideshow projectId={project.id} />
          </Section>
        )}

        {portalTab === "messages" && settings?.show_messages !== false && (
          <Section title="Messages" icon={MessageSquare}>
            <Messages projectId={project.id} user={user} />
          </Section>
        )}

        {portalTab === "financials" && settings?.show_financials && (
          <Section title="Financials" icon={DollarSign}>
            <div className="space-y-3">
              {project.estimated_budget && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-600">Project Total</span>
                  <span className="font-bold text-slate-800">${project.estimated_budget.toLocaleString()}</span>
                </div>
              )}
              {project.deposit_paid && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                  <span className="text-sm text-emerald-700">Deposit Paid</span>
                  <span className="font-bold text-emerald-700">${project.deposit_paid.toLocaleString()}</span>
                </div>
              )}
              {project.estimated_budget && project.deposit_paid && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <span className="text-sm text-amber-700">Balance Due</span>
                  <span className="font-bold text-amber-700">${(project.estimated_budget - project.deposit_paid).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {portalTab === "notes" && settings?.show_notes !== false && (
          <Section title="Project Notes" icon={StickyNote}>
            <PortalNotes projectId={project.id} />
          </Section>
        )}

        <p className="text-center text-xs text-slate-300 pb-6">Powered by Encore Woodworks</p>
      </div>
    </div>
  );
}