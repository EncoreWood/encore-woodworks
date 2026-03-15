import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Download, MessageSquare, Send, X, DollarSign, Image, FileText, Calendar, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video mb-3">
        {slide.image_3d_url || slide.image_2d_url ? (
          <img src={slide.image_3d_url || slide.image_2d_url} alt={slide.slide_label} className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">No image</div>
        )}
        {slides.length > 1 && <>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
        </>}
      </div>
      {slide.slide_label && <p className="text-sm font-medium text-slate-700 text-center">{slide.slide_label}</p>}
      {slide.room_name && <p className="text-xs text-slate-400 text-center">{slide.room_name}</p>}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-amber-500 w-4" : "bg-slate-300"}`} />)}
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
  const bottomRef = useRef(null);

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

  const send = async () => {
    if (!text.trim() || !room) return;
    const msg = text.trim(); setText("");
    await base44.entities.ChatMessage.create({ room_id: room.id, message: msg, user_name: user?.full_name || "Client" });
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
                <p>{m.message}</p>
                <p className={`text-xs mt-0.5 ${mine ? "text-amber-100" : "text-slate-400"}`}>{m.created_date ? format(new Date(m.created_date), "h:mm a") : ""}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3 border-t pt-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="Type a message..." />
        <Button onClick={send} disabled={!text.trim()} size="sm" className="bg-amber-500 hover:bg-amber-600 rounded-xl h-10 w-10 p-0">
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

// ── Main portal ───────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (!u?.client_project_id) { setLoading(false); return; }
      const [projects, settingsList] = await Promise.all([
        base44.entities.Project.filter({ id: u.client_project_id }),
        base44.entities.ClientPortalSettings.filter({ project_id: u.client_project_id }),
      ]);
      setProject(projects[0] || null);
      setSettings(settingsList[0] || { is_active: true, show_status: true, show_milestones: true, show_presentations: true, show_documents: true, show_photos: true, show_financials: false, show_messages: true });
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center p-6">
      <div className="text-center">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-20 mx-auto mb-6 opacity-80" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Your portal is being set up</h2>
        <p className="text-slate-500 text-sm">Your project team will have this ready shortly.</p>
      </div>
    </div>
  );

  if (settings && !settings.is_active) return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center p-6">
      <div className="text-center">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-20 mx-auto mb-6 opacity-80" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Portal temporarily unavailable</h2>
        <p className="text-slate-500 text-sm">Please contact your project team.</p>
      </div>
    </div>
  );

  const statusLabels = {
    inquiry: "Inquiry", quoted: "Quoted", approved: "Approved", in_design: "In Design",
    in_production: "In Production", ready_for_install: "Ready for Install",
    installing: "Installing", completed: "Completed", on_hold: "On Hold"
  };
  const statusColors = {
    inquiry: "bg-slate-100 text-slate-600", quoted: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700", in_design: "bg-violet-100 text-violet-700",
    in_production: "bg-amber-100 text-amber-700", ready_for_install: "bg-cyan-100 text-cyan-700",
    installing: "bg-orange-100 text-orange-700", completed: "bg-emerald-100 text-emerald-700",
    on_hold: "bg-red-100 text-red-700"
  };

  const documents = (project.files || []).filter(f => !f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && f.tag !== "cad_dxf");
  const photos = (project.files || []).filter(f => f.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || f.tag === "job_photo");

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-14" />
          <div className="flex items-center gap-2">
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

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Status */}
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

        {/* Milestones */}
        {settings?.show_milestones !== false && (
          <Section title="Progress" icon={CheckCircle2}>
            <Milestones project={project} />
          </Section>
        )}

        {/* 3D Presentations */}
        {settings?.show_presentations !== false && (
          <Section title="3D Presentations" icon={Image}>
            <PresentationSlideshow projectId={project.id} />
          </Section>
        )}

        {/* Documents */}
        {settings?.show_documents !== false && documents.length > 0 && (
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

        {/* Photos */}
        {settings?.show_photos !== false && photos.length > 0 && (
          <Section title="Job Photos" icon={Image}>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                  <img src={f.url} alt={f.name} className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Financials */}
        {settings?.show_financials && (
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

        {/* Messages */}
        {settings?.show_messages !== false && (
          <Section title="Messages" icon={MessageSquare}>
            <Messages projectId={project.id} user={user} />
          </Section>
        )}

        <p className="text-center text-xs text-slate-300 pb-6">Powered by Encore Woodworks</p>
      </div>
    </div>
  );
}