import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Download, MessageSquare, DollarSign, Image, FileText, Calendar, MapPin, ClipboardList, StickyNote, X, DoorOpen } from "lucide-react";

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
                {i > 0 && <div className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= done ? "bg-amber-500" : "bg-slate-200"}`} style={{ width: "calc(100% - 2rem)" }} />}
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
  if (!slides.length) return <p className="text-sm text-slate-400 text-center py-4">No presentation available yet.</p>;
  const slide = slides[idx];
  return (
    <div>
      <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video mb-3">
        {slide.image_3d_url || slide.image_2d_url ? (
          <img src={slide.image_3d_url || slide.image_2d_url} alt={slide.slide_label} className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">No image</div>
        )}
        {slides.length > 1 && <>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </>}
      </div>
      {slide.slide_label && <p className="text-sm font-medium text-slate-700 text-center">{slide.slide_label}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
        <span className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-amber-600" /></span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ClientTasksPreview({ tasks }) {
  const statusColor = { Pending: "bg-slate-100 text-slate-600", "In Progress": "bg-blue-100 text-blue-700", Completed: "bg-emerald-100 text-emerald-700" };
  if (!tasks.length) return <p className="text-sm text-slate-400 text-center py-4">No tasks assigned yet.</p>;
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-sm font-semibold text-slate-800">{task.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[task.status] || statusColor.Pending}`}>{task.status}</span>
          </div>
          <p className="text-xs text-slate-500">{task.task_type}{task.due_date ? ` · Due ${format(new Date(task.due_date), "MMM d, yyyy")}` : ""}</p>
          {task.admin_notes && <p className="text-xs text-slate-500 mt-1 italic border-t border-slate-200 pt-1">{task.admin_notes}</p>}
        </div>
      ))}
    </div>
  );
}

function PortalNotesPreview({ notes }) {
  const visible = notes.filter(n => n.is_visible_to_client);
  if (!visible.length) return <p className="text-sm text-slate-400 text-center py-4">No notes from your project team yet.</p>;
  return (
    <div className="space-y-2">
      {visible.map(note => (
        <div key={note.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-sm text-slate-700">{note.note_text}</p>
          <p className="text-xs text-slate-400 mt-1">{note.author_name || "Project Team"}</p>
        </div>
      ))}
    </div>
  );
}

function RoomsPreview({ project }) {
  const [roomFiles, setRoomFiles] = useState([]);
  const [openRoom, setOpenRoom] = useState(null);

  useEffect(() => {
    base44.entities.RoomFile.filter({ project_id: project.id }).then(files => {
      setRoomFiles(files.filter(f => !f.is_shop_file));
    });
  }, [project.id]);

  const rooms = project.rooms || [];
  if (!rooms.length) return <p className="text-sm text-slate-400 text-center py-4">No rooms added yet.</p>;

  const SELECTION_LABELS = {
    cabinet_style: "Cabinet Style", wood_species: "Wood Species", finish: "Finish",
    door_style: "Door Style", handles: "Hardware", drawer_glides: "Drawer Glides",
    hinges: "Hinges", molding: "Molding", cabs_to_height: "Cabs to Height", cabinet_count: "Cabinet Count"
  };

  return (
    <div className="space-y-2">
      {rooms.map((room, idx) => {
        const photos = roomFiles.filter(f => f.room_name?.toLowerCase() === room.room_name?.toLowerCase());
        const isOpen = openRoom === idx;
        const hasSelections = Object.keys(SELECTION_LABELS).some(k => room[k]);
        return (
          <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
              onClick={() => setOpenRoom(isOpen ? null : idx)}
            >
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-800">{room.room_name || `Room ${idx + 1}`}</span>
                {room.cabinet_count && <span className="text-xs text-slate-400">· {room.cabinet_count} cabinets</span>}
              </div>
              <div className="flex items-center gap-2">
                {photos.length > 0 && <span className="text-xs text-slate-400">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>}
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 bg-white border-t border-slate-100 space-y-3">
                {hasSelections && (
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    {Object.entries(SELECTION_LABELS).map(([key, label]) => {
                      if (!room[key]) return null;
                      return (
                        <div key={key} className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-slate-800">{room[key]}</p>
                        </div>
                      );
                    })}
                    {(room.custom_selections || []).map((cs, ci) => (
                      <div key={ci} className="bg-amber-50 rounded-lg p-2">
                        <p className="text-xs text-amber-500 mb-0.5">{cs.label}</p>
                        <p className="text-sm font-semibold text-slate-800">{cs.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
                {room.notes && <p className="text-sm text-slate-600 bg-amber-50/50 rounded-lg p-2">{room.notes}</p>}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map(f => (
                      f.file_type === "image" ? (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                          <img src={f.file_url} alt={f.label || f.file_name} className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-1 aspect-square bg-slate-50 rounded-lg border border-slate-100 hover:bg-amber-50 transition-colors">
                          <FileText className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-slate-500 truncate px-1 w-full text-center">{f.label || f.file_name}</span>
                        </a>
                      )
                    ))}
                  </div>
                )}
                {!hasSelections && !room.notes && photos.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">No details added yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ClientPortalPreview({ project, settings, tasks, notes, onClose }) {
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-stone-50 via-white to-amber-50/20 w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Preview header bar */}
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold">Client Portal Preview</span>
          <button onClick={onClose} className="hover:bg-amber-700 rounded-lg p-1 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Portal Header */}
          <div className="bg-white border-b border-slate-100 px-4 py-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png" alt="Encore Woodworks" className="h-10" />
          </div>

          {/* Hero */}
          <div className="bg-gradient-to-r from-stone-800 to-stone-700 text-white px-4 py-6">
            {settings?.welcome_message && <p className="text-amber-300 text-xs mb-1 font-medium">{settings.welcome_message}</p>}
            <h1 className="text-xl font-bold mb-1">{project.project_name}</h1>
            {project.address && <p className="text-stone-300 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{project.address}</p>}
            <div className="mt-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[project.status] || "bg-slate-100 text-slate-600"}`}>
                {statusLabels[project.status] || project.status}
              </span>
            </div>
          </div>

          {/* Sections */}
          <div className="px-4 py-4 space-y-4">
            {settings?.show_status !== false && (project.start_date || project.estimated_completion || project.install_start_date) && (
              <Section title="Project Status" icon={Calendar}>
                <div className="grid grid-cols-2 gap-3">
                  {project.start_date && <div><p className="text-xs text-slate-400 mb-0.5">Start Date</p><p className="text-sm font-semibold text-slate-700">{format(new Date(project.start_date), "MMM d, yyyy")}</p></div>}
                  {project.estimated_completion && <div><p className="text-xs text-slate-400 mb-0.5">Est. Completion</p><p className="text-sm font-semibold text-slate-700">{format(new Date(project.estimated_completion), "MMM d, yyyy")}</p></div>}
                  {project.install_start_date && <div><p className="text-xs text-slate-400 mb-0.5">Install Start</p><p className="text-sm font-semibold text-amber-700">{format(new Date(project.install_start_date), "MMM d, yyyy")}</p></div>}
                  {project.install_end_date && <div><p className="text-xs text-slate-400 mb-0.5">Install End</p><p className="text-sm font-semibold text-amber-700">{format(new Date(project.install_end_date), "MMM d, yyyy")}</p></div>}
                </div>
              </Section>
            )}

            {settings?.show_milestones !== false && (
              <Section title="Progress" icon={CheckCircle2}>
                <Milestones project={project} />
              </Section>
            )}

            {(project.rooms?.length > 0) && (
              <Section title="Your Rooms" icon={DoorOpen}>
                <RoomsPreview project={project} />
              </Section>
            )}

            {settings?.show_presentations !== false && (
              <Section title="3D Presentations" icon={Image}>
                <PresentationSlideshow projectId={project.id} />
              </Section>
            )}

            {settings?.show_documents !== false && documents.length > 0 && (
              <Section title="Documents" icon={FileText}>
                <div className="space-y-2">
                  {documents.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all">
                      <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-3.5 h-3.5 text-amber-600" /></div>
                      <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
                      <Download className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </Section>
            )}

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

            {settings?.show_financials && (
              <Section title="Financials" icon={DollarSign}>
                <div className="space-y-2">
                  {project.estimated_budget && <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"><span className="text-sm text-slate-600">Project Total</span><span className="font-bold text-slate-800">${project.estimated_budget.toLocaleString()}</span></div>}
                  {project.deposit_paid && <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl"><span className="text-sm text-emerald-700">Deposit Paid</span><span className="font-bold text-emerald-700">${project.deposit_paid.toLocaleString()}</span></div>}
                  {project.estimated_budget && project.deposit_paid && <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl"><span className="text-sm text-amber-700">Balance Due</span><span className="font-bold text-amber-700">${(project.estimated_budget - project.deposit_paid).toLocaleString()}</span></div>}
                </div>
              </Section>
            )}

            {settings?.show_tasks !== false && (
              <Section title="Your Tasks" icon={ClipboardList}>
                <ClientTasksPreview tasks={tasks} />
              </Section>
            )}

            {settings?.show_notes !== false && (
              <Section title="Project Notes" icon={StickyNote}>
                <PortalNotesPreview notes={notes} />
              </Section>
            )}

            {settings?.show_messages !== false && (
              <Section title="Messages" icon={MessageSquare}>
                <p className="text-sm text-slate-400 text-center py-4">Live messages not shown in preview.</p>
              </Section>
            )}

            <p className="text-center text-xs text-slate-300 pb-4">Powered by Encore Woodworks</p>
          </div>
        </div>
      </div>
    </div>
  );
}