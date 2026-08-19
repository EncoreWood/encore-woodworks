import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isToday, isPast, isFuture } from "date-fns";
import { Calendar, Clock, MapPin, Video, Phone, Store, Plus, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_META = {
  in_person: { label: "In Person", icon: MapPin },
  virtual:   { label: "Virtual",  icon: Video },
  phone:     { label: "Phone",    icon: Phone },
  shop_visit:{ label: "Shop Visit", icon: Store },
};

const STATUS_META = {
  requested:  { label: "Requested",  cls: "bg-blue-100 text-blue-700" },
  scheduled:  { label: "Scheduled",  cls: "bg-emerald-100 text-emerald-700" },
  completed:  { label: "Completed",  cls: "bg-slate-100 text-slate-600" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-100 text-red-700" },
};

function MeetingCard({ meeting }) {
  const status = STATUS_META[meeting.status] || STATUS_META.requested;
  const TypeIcon = (TYPE_META[meeting.meeting_type] || TYPE_META.in_person).icon;
  const dateStr = meeting.scheduled_date || meeting.preferred_date;
  const timeStr = meeting.scheduled_time || meeting.preferred_time;
  const isConfirmed = meeting.status === "scheduled" && meeting.scheduled_date;

  let whenLabel = "Date to be confirmed";
  if (dateStr) {
    try {
      const d = parseISO(dateStr);
      whenLabel = isToday(d) ? `Today${timeStr ? " · " + timeStr : ""}` : format(d, "EEE, MMM d, yyyy") + (timeStr ? " · " + timeStr : "");
    } catch { whenLabel = dateStr + (timeStr ? " · " + timeStr : ""); }
  }

  return (
    <div className={cn("p-4 rounded-xl border", meeting.status === "cancelled" ? "border-slate-100 bg-slate-50/50 opacity-70" : "border-slate-100 bg-white")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <TypeIcon className="w-4 h-4 text-amber-600" />
          </span>
          <p className="text-sm font-semibold text-slate-800 truncate">{meeting.title}</p>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", status.cls)}>{status.label}</span>
      </div>
      <div className="space-y-1.5 text-xs text-slate-500 pl-10">
        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{whenLabel}</p>
        {meeting.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{meeting.location}</p>}
        {meeting.notes && <p className="text-slate-600 italic border-t border-slate-100 pt-1.5 mt-1.5">"{meeting.notes}"</p>}
        {meeting.status === "requested" && (
          <p className="text-blue-600 flex items-center gap-1.5 pt-1"><AlertCircle className="w-3.5 h-3.5" />Your team will confirm the date &amp; time shortly.</p>
        )}
        {isConfirmed && (
          <p className="text-emerald-600 flex items-center gap-1.5 pt-1"><CheckCircle2 className="w-3.5 h-3.5" />Confirmed by your project team</p>
        )}
      </div>
    </div>
  );
}

function RequestForm({ project, user, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("in_person");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
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
        meeting_type: meetingType,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        notes: notes.trim(),
        status: "requested",
      });
      setTitle(""); setMeetingType("in_person"); setPreferredDate(""); setPreferredTime(""); setNotes("");
      setOpen(false);
      onSubmitted?.();
    } catch (e) {
      console.error("Failed to request meeting:", e);
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors text-sm font-semibold"
      >
        <Plus className="w-4 h-4" /> Request a Meeting
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">Request a Meeting</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's this meeting about? *"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
        <input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <button key={key} onClick={() => setMeetingType(key)}
            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors",
              meetingType === key ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300")}>
            <meta.icon className="w-3 h-3" />{meta.label}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any details or topics you'd like to cover…"
        rows={2}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
      <Button onClick={submit} disabled={!title.trim() || saving} className="w-full bg-amber-500 hover:bg-amber-600">
        {saving ? "Sending…" : "Send Request"}
      </Button>
    </div>
  );
}

export default function PortalMeetingsSection({ project, user }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.PortalMeeting.filter({ project_id: project.id })
      .then(m => setMeetings(m.sort((a, b) => {
        const da = a.scheduled_date || a.preferred_date || "";
        const db = b.scheduled_date || b.preferred_date || "";
        return da.localeCompare(db);
      })))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.PortalMeeting.subscribe(() => load());
    return unsub;
  }, [project.id]);

  if (loading) return (
    <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  );

  const active = meetings.filter(m => m.status === "scheduled" || m.status === "requested");
  const past = meetings.filter(m => m.status === "completed" || m.status === "cancelled");

  return (
    <div className="space-y-4">
      <RequestForm project={project} user={user} onSubmitted={load} />
      {active.length === 0 && past.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">No meetings scheduled yet. Use "Request a Meeting" above to set one up.</p>
      )}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Upcoming</p>
          {active.map(m => <MeetingCard key={m.id} meeting={m} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Past</p>
          {past.map(m => <MeetingCard key={m.id} meeting={m} />)}
        </div>
      )}
    </div>
  );
}