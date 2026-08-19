import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { Calendar, Clock, MapPin, CheckCircle2, PenLine, Plus, X, Video, Phone, Store, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ICON = { in_person: MapPin, virtual: Video, phone: Phone, shop_visit: Store };
const STATUS_CLS = {
  requested: "bg-blue-100 text-blue-700",
  scheduled: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

function RequestForm({ project, user, onDone }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("in_person");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.PortalMeeting.create({
        project_id: project.id,
        project_name: project.project_name,
        client_email: user.email,
        client_name: user?.full_name || "",
        title: title.trim(),
        meeting_type: type,
        preferred_date: date || null,
        preferred_time: time || null,
        notes: notes.trim(),
        status: "requested",
        client_visible: true,
      });
      setTitle(""); setType("in_person"); setDate(""); setTime(""); setNotes("");
      setOpen(false);
      onDone?.();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors">
        <Plus className="w-3.5 h-3.5" /> Request a Meeting
      </button>
    );
  }
  return (
    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-800">Request a Meeting</p>
        <button onClick={() => setOpen(false)} className="text-slate-400"><X className="w-3.5 h-3.5" /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's this meeting about? *"
        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(TYPE_ICON).map(([k, Icon]) => (
          <button key={k} onClick={() => setType(k)}
            className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border",
              type === k ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200")}>
            <Icon className="w-3 h-3" />{k.replace("_", " ")}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Topics you'd like to cover…"
        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
      <Button onClick={submit} disabled={!title.trim() || saving} size="sm" className="w-full bg-amber-500 hover:bg-amber-600">
        {saving ? "Sending…" : "Send Request"}
      </Button>
    </div>
  );
}

export default function ClientTasksMeetingsCard({ project, user }) {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);

  const load = () => {
    base44.entities.ClientTask.filter({ project_id: project.id }).then(setTasks).catch(() => {});
    base44.entities.PortalMeeting.filter({ project_id: project.id })
      .then(m => setMeetings(m.filter(x => x.client_visible !== false && x.status !== "cancelled")))
      .catch(() => {});
  };
  useEffect(() => {
    load();
    const u1 = base44.entities.ClientTask.subscribe(load);
    const u2 = base44.entities.PortalMeeting.subscribe(load);
    return () => { u1?.(); u2?.(); };
  }, [project.id]);

  const openTasks = tasks.filter(t => t.status !== "Completed");

  const completeTask = async (t) => {
    await base44.entities.ClientTask.update(t.id, { status: "Completed" });
    load();
  };
  const signTask = async (t) => {
    await base44.entities.ClientTask.update(t.id, {
      status: "Completed",
      signed_by: user?.full_name || user?.email || "Client",
      signed_at: new Date().toISOString(),
    });
    load();
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = meetings
    .filter(m => (m.scheduled_date || m.preferred_date || "9999") >= today)
    .sort((a, b) => (a.scheduled_date || a.preferred_date || "").localeCompare(b.scheduled_date || b.preferred_date || ""));
  const recent = meetings
    .filter(m => (m.scheduled_date || m.preferred_date || "9999") < today)
    .sort((a, b) => (b.scheduled_date || b.preferred_date || "").localeCompare(a.scheduled_date || a.preferred_date || ""));

  const visibleTasks = expanded ? openTasks : openTasks.slice(0, 3);
  const visibleUpcoming = expanded ? upcoming : upcoming.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Tasks */}
      <div>
        <button onClick={() => setShowTasks(s => !s)} className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
          {showTasks ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}Your Tasks ({openTasks.length})
        </button>
        {showTasks && (
          openTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No pending tasks. You're all caught up!</p>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map(t => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                      <p className="text-xs text-slate-500">
                        {t.task_type}
                        {t.due_date ? ` · Due ${format(parseISO(t.due_date), "MMM d")}` : ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {t.requires_signature && !t.signed_by ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => signTask(t)}>
                          <PenLine className="w-3 h-3" /> Sign
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 gap-1" onClick={() => completeTask(t)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </Button>
                      )}
                    </div>
                  </div>
                  {t.signed_by && <p className="text-xs text-emerald-600 mt-1">✓ Signed by {t.signed_by}</p>}
                </div>
              ))}
              {openTasks.length > 3 && (
                <button onClick={() => setExpanded(e => !e)} className="text-xs text-amber-700 font-medium hover:underline">
                  {expanded ? "Show less" : `Show all ${openTasks.length} tasks`}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Meetings */}
      <div className="border-t border-slate-100 pt-3">
        <button onClick={() => setShowMeetings(s => !s)} className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
          {showMeetings ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}Meetings ({upcoming.length + recent.length})
        </button>
        {showMeetings && (
          <div className="space-y-2">
            {upcoming.length === 0 && recent.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">No meetings scheduled yet.</p>
            )}
            {visibleUpcoming.map(m => {
              const d = m.scheduled_date || m.preferred_date;
              const Icon = TYPE_ICON[m.meeting_type] || Calendar;
              return (
                <div key={m.id} className="p-3 rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0"><Icon className="w-3.5 h-3.5 text-amber-600" /></span>
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.title}</p>
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", STATUS_CLS[m.status] || STATUS_CLS.requested)}>{m.status}</span>
                  </div>
                  {d && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 pl-9"><Calendar className="w-3 h-3" />{format(parseISO(d), "EEE, MMM d")}{(m.scheduled_time || m.preferred_time) ? ` · ${m.scheduled_time || m.preferred_time}` : ""}</p>}
                  {m.location && <p className="text-xs text-slate-500 pl-9 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{m.location}</p>}
                  {m.summary && <p className="text-xs text-slate-600 italic mt-1 pl-9">"{m.summary}"</p>}
                </div>
              );
            })}
            {expanded && recent.slice(0, 3).map(m => {
              const d = m.scheduled_date || m.preferred_date;
              return (
                <div key={m.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 opacity-80">
                  <p className="text-sm font-semibold text-slate-700">{m.title}</p>
                  {d && <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(d), "MMM d, yyyy")}</p>}
                </div>
              );
            })}
            {upcoming.length > 3 && (
              <button onClick={() => setExpanded(e => !e)} className="text-xs text-amber-700 font-medium hover:underline">
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      <RequestForm project={project} user={user} onDone={load} />
    </div>
  );
}