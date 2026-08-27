import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Circle, Check, ChevronLeft, ChevronRight, Download, MessageSquare, Send, X, DollarSign, Image, FileText, Calendar, MapPin, User, ClipboardList, StickyNote, Clock, DoorOpen, Paperclip, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import GanttChart from "@/components/projects/GanttChart";
import SlideCard from "@/components/presentations/SlideCard";
import ClientPresentationViewer from "@/components/presentations/ClientPresentationViewer";
import JobPhotosSection from "@/components/projects/JobPhotosSection";
import RoomNotes from "@/components/projects/RoomNotes";
import RoomFileGallery from "@/components/projects/RoomFileGallery";
import ClientTasksMeetingsCard from "@/components/projects/ClientTasksMeetingsCard";
import BidClientView from "@/components/bidding/BidClientView";
import ClientFinancials from "@/components/projects/ClientFinancials";
import PortalTabBar from "@/components/portal/PortalTabBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getProgressStatus } from "@/components/projects/timelineStatus";
import { calcOrdersCompletion, ordersStatusFromPct } from "@/components/projects/ordersCompletion";
import { cn } from "@/lib/utils";

// ── Milestone tracker ──────────────────────────────────────────────────────
// Driven by the project's TimelineEvent records (Design, Orders, Prep,
// Production, Install, Complete). Each circle independently reflects its
// milestone's progress_status: not_started (grey) / in_progress (orange) /
// completed (green w/ check). Multiple milestones can be in progress at once.
function Milestones({ project }) {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!project?.id) return;
    let active = true;
    base44.entities.TimelineEvent.filter({ project_id: project.id }, "sort_order")
      .then(evts => { if (active) setEvents(evts.filter(e => e.is_client_visible !== false)); })
      .catch(() => {});
    return () => { active = false; };
  }, [project?.id]);

  // Live orders feed — the "Orders" stage reflects real ProjectOrder status.
  useEffect(() => {
    if (!project?.id) return;
    let active = true;
    const load = () => base44.entities.ProjectOrder.filter({ project_id: project.id }).then(o => { if (active) setOrders(o); }).catch(() => {});
    load();
    const unsub = base44.entities.ProjectOrder.subscribe((event) => {
      if (event?.data?.project_id === project.id) load();
    });
    return () => { active = false; unsub?.(); };
  }, [project?.id]);

  const stages = ["Design", "Orders", "Prep", "Production", "Install", "Complete"];
  const statusFor = (name) => {
    if (name === "Orders") {
      return ordersStatusFromPct(calcOrdersCompletion(orders));
    }
    const ev = events.find(e => e.event_name === name);
    return ev ? getProgressStatus(ev) : "not_started";
  };
  const stagesStatus = stages.map(name => ({ name, status: statusFor(name) }));
  const completedCount = stagesStatus.filter(s => s.status === "completed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {stagesStatus.map((s, i) => {
          const completed = s.status === "completed";
          const inProgress = s.status === "in_progress";
          const connectorColor = completed ? "bg-green-500" : inProgress ? "bg-orange-500" : "bg-slate-200";
          return (
            <div key={s.name} className="flex flex-col items-center flex-1">
              <div className="relative flex flex-col items-center">
                {i > 0 && (
                  <div className={`absolute right-1/2 top-4 h-0.5 -translate-y-1/2 ${connectorColor}`} style={{ width: "calc(100% - 2rem)" }} />
                )}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 transition-all ${completed ? "bg-green-500 border-green-500" : inProgress ? "bg-orange-500 border-orange-500" : "bg-white border-slate-200"}`}>
                  {completed ? <Check className="w-5 h-5 text-white" /> : inProgress ? <span className="w-2 h-2 rounded-full bg-white" /> : <Circle className="w-5 h-5 text-slate-300" />}
                </div>
              </div>
              <span className={`text-xs mt-2 font-medium text-center ${completed ? "text-green-600" : inProgress ? "text-orange-600" : "text-slate-400"}`}>{s.name}</span>
            </div>
          );
        })}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${(completedCount / stages.length) * 100}%` }} />
      </div>
      <p className="text-xs text-slate-500 text-center mt-2">{completedCount} of {stages.length} milestones complete</p>
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
function PresentationSlideshow({ projectId, presentationId }) {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    (async () => {
      let presId = presentationId;
      if (!presId) {
        const presentations = await base44.entities.Presentation.filter({ project_id: projectId });
        if (!presentations[0]) return;
        presId = presentations[0].id;
      }
      const s = await base44.entities.PresentationSlide.filter({ presentation_id: presId });
      setSlides(s.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    })();
  }, [projectId, presentationId]);
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
  const [gallery, setGallery] = useState(null); // { title, files, index }
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
    door_style: "Door Style", handles: "Handles / Hardware", drawer_glides: "Drawer Glides",
    hinges: "Hinges", molding: "Molding", cabs_to_height: "Cabs Finished to Height", cabinet_count: "Cabinet Count"
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
                {/* Selections (read-only — mirrors admin Selections modal) */}
                {(hasSelections || (room.custom_selections || []).length > 0 || room.notes) && (
                  <div className="pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Selections</p>
                    <div className="grid grid-cols-2 gap-2">
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
                          <p className="text-sm font-semibold text-slate-800">{cs.value || "Not yet selected"}</p>
                        </div>
                      ))}
                    </div>
                    {/* Room Notes (admin-set, read-only) */}
                    {room.notes && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 font-medium mb-0.5">Room Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{room.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Photos & Files */}
                {photos.length > 0 && (
                  <button
                    onClick={() => setGallery({ title: "Photos & Files", files: photos, index: 0 })}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Photos & Files</span>
                    <span className="text-sm text-amber-700 font-medium flex items-center gap-1.5">
                      View {photos.length} {photos.length === 1 ? "file" : "files"}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                )}

                {/* 3D files */}
                {(() => {
                  const files3d = photos.filter(f => f.category === "3d");
                  if (!files3d.length) return null;
                  return (
                    <button
                      onClick={() => setGallery({ title: "3D Files", files: files3d, index: 0 })}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-violet-50/50 border border-violet-100 hover:bg-violet-100/60 transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Box className="w-3.5 h-3.5 text-violet-500" />3D Files</span>
                      <span className="text-sm text-violet-700 font-medium flex items-center gap-1.5">
                        View {files3d.length} {files3d.length === 1 ? "file" : "files"}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  );
                })()}

                {/* 2D drawings */}
                {(() => {
                  const files2d = photos.filter(f => f.category === "2d");
                  if (!files2d.length) return null;
                  return (
                    <button
                      onClick={() => setGallery({ title: "2D Drawings", files: files2d, index: 0 })}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Image className="w-3.5 h-3.5 text-blue-500" />2D Drawings</span>
                      <span className="text-sm text-blue-700 font-medium flex items-center gap-1.5">
                        View {files2d.length} {files2d.length === 1 ? "file" : "files"}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  );
                })()}

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

      {gallery && (
        <RoomFileGallery
          title={gallery.title}
          files={gallery.files}
          index={gallery.index}
          onClose={() => setGallery(null)}
          onIndex={(i) => setGallery(g => ({ ...g, index: i }))}
        />
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

// ── Client-facing Proposal (estimates + presentations) ────────────────────
function ClientProposalSection({ projectId }) {
  const [bids, setBids] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewBid, setPreviewBid] = useState(null);
  useEffect(() => {
    Promise.all([
      base44.entities.Bid.filter({ project_id: projectId }),
      base44.entities.Presentation.filter({ project_id: projectId }),
    ]).then(([b, p]) => {
      setBids((b || []).filter(x => x.client_visible));
      setPresentations((p || []).filter(x => x.client_visible));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  );

  const hasEstimates = bids.length > 0;
  const hasPresentations = presentations.length > 0;

  if (!hasEstimates && !hasPresentations) {
    return (
      <Section title="Proposal" icon={FileText}>
        <p className="text-sm text-slate-400 text-center py-6">Your proposal will appear here once your project team shares it.</p>
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      {hasEstimates && (
        <Section title="Estimates" icon={FileText}>
          <div className="space-y-2">
            {bids.map(bid => (
              <button
                key={bid.id}
                type="button"
                onClick={() => setPreviewBid(bid)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-amber-300 hover:bg-amber-50 transition-all text-left"
              >
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{bid.project_name}{bid.bid_type && ` · ${bid.bid_type}`}</p>
                  <p className="text-xs text-slate-400">{bid.rooms?.length || 0} rooms{bid.total_lf ? ` · ${bid.total_lf} LF` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800">${(bid.total || 0).toLocaleString()}</p>
                  <span className="text-xs text-amber-600 font-medium">View estimate →</span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {previewBid && (
        <BidClientView
          open
          onClose={() => setPreviewBid(null)}
          bid={previewBid}
          bidType={previewBid.bid_type}
        />
      )}

      {hasPresentations && (
        <Section title="Presentations" icon={Image}>
          <div className="space-y-6">
            {presentations.map(p => (
              <div key={p.id}>
                <p className="text-sm font-semibold text-slate-700 mb-3">{p.project_name}</p>
                <ClientPresentationViewer presentationId={p.id} projectName={p.project_name} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
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
                <div className="h-32 relative" style={{ background: "linear-gradient(to bottom, #fdfaf3, #ffffff)" }}>
                  {photo ? (
                    <img src={photo.url} alt={p.project_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <img src="https://media.base44.com/images/public/6984bc8fae105e5a06a39d65/fa3f55b8e_image.png" alt="" className="max-h-full max-w-full object-contain" style={{ maxHeight: "5rem" }} />
                    </div>
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
    <ErrorBoundary
      key={selectedId}
      fallback={(msg, reset) => (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-bold text-slate-700 mb-2">This project couldn't load</h2>
            <p className="text-sm text-slate-500 mb-4">{msg}</p>
            <div className="flex gap-2 justify-center">
              {accessible.length > 1 && (
                <button onClick={() => { setSelectedId(null); reset(); }} className="text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-full">Switch Project</button>
              )}
              <button onClick={reset} className="text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full">Try again</button>
            </div>
          </div>
        </div>
      )}
    >
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
          { key: "presentations", label: "Proposal", show: settings?.show_presentations !== false },
          { key: "messages", label: "Messages", show: settings?.show_messages !== false },
          { key: "financials", label: "Financials", show: !!settings?.show_financials },
          { key: "notes", label: "Notes", show: settings?.show_notes !== false },
        ].filter(t => t.show);
        return <PortalTabBar tabs={tabs} activeKey={portalTab} onChange={setPortalTab} />;
      })()}

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {portalTab === "home" && (
          <>
            {settings?.show_status !== false && (
              <Section title="Tasks & Meetings" icon={ClipboardList}>
                <ClientTasksMeetingsCard project={project} user={user} />
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
          <ClientProposalSection projectId={project.id} />
        )}

        {portalTab === "messages" && settings?.show_messages !== false && (
          <Section title="Messages" icon={MessageSquare}>
            <Messages projectId={project.id} user={user} />
          </Section>
        )}

        {portalTab === "financials" && settings?.show_financials && (
          <Section title="Financials" icon={DollarSign}>
            <ClientFinancials project={project} />
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
    </ErrorBoundary>
  );
}