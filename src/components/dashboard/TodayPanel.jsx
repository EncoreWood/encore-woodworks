import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { User, Droplets, CalendarCheck, Briefcase, CheckSquare, BookOpen, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const todayStr = format(new Date(), "yyyy-MM-dd");

function Row({ icon: Icon, label, children, color = "text-slate-500" }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}

function None() {
  return <p className="text-sm text-slate-300 italic">None</p>;
}

export default function TodayPanel({ inProductionProjects }) {
  const queryClient = useQueryClient();
  const [editingBook, setEditingBook] = useState(false);
  const [bookDraft, setBookDraft] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useState(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: presenters = [] } = useQuery({
    queryKey: ["meetingPresenters", todayStr],
    queryFn: () => base44.entities.MeetingPresenter.filter({ date: todayStr })
  });

  const { data: cleanings = [] } = useQuery({
    queryKey: ["bathroomCleaning", todayStr],
    queryFn: () => base44.entities.BathroomCleaning.filter({ date: todayStr })
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["designMeetings", todayStr],
    queryFn: () => base44.entities.DesignMeeting.filter({ date: todayStr })
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasksDueToday", todayStr],
    queryFn: () => base44.entities.Task.filter({ due_date: todayStr })
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.Settings.list()
  });

  const bookSetting = settings.find(s => s.key === "book_of_month");

  const saveMutation = useMutation({
    mutationFn: async (value) => {
      if (bookSetting) {
        return base44.entities.Settings.update(bookSetting.id, { value });
      } else {
        return base44.entities.Settings.create({ key: "book_of_month", value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setEditingBook(false);
    }
  });

  const startEdit = () => {
    setBookDraft(bookSetting?.value || "");
    setEditingBook(true);
  };

  const cleaningNames = cleanings.flatMap(c => c.assigned_to || []).join(", ");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Today — {format(new Date(), "EEEE, MMM d")}
      </h3>

      <Row icon={Briefcase} label="Active Projects" color="text-green-500">
        {inProductionProjects.length > 0
          ? <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
              {inProductionProjects.map(p => (
                <Link key={p.id} to={createPageUrl("ProjectDetails") + "?id=" + p.id}>
                  <p className="text-sm font-medium hover:text-amber-600 transition-colors"
                     style={p.card_color ? { color: p.card_color } : { color: "#1e293b" }}>
                    {p.project_name}
                    {p.client_name ? <span className="text-slate-400 font-normal"> — {p.client_name}</span> : ""}
                  </p>
                </Link>
              ))}
            </div>
          : <None />}
      </Row>

      <Row icon={User} label="Morning Presenter" color="text-violet-500">
        {presenters.length > 0
          ? <p className="text-sm font-medium text-slate-800">{presenters.map(p => p.presenter_name).join(", ")}</p>
          : <None />}
      </Row>

      <Row icon={Droplets} label="Bathroom Cleaning" color="text-blue-400">
        {cleaningNames
          ? <p className="text-sm font-medium text-slate-800">{cleaningNames}</p>
          : <None />}
      </Row>

      <Row icon={CalendarCheck} label="Design Meetings" color="text-amber-500">
        {meetings.length > 0
          ? <div className="space-y-0.5">
              {meetings.map((m, i) => (
                <p key={i} className="text-sm font-medium text-slate-800">
                  {m.client_name}{m.project_name ? <span className="text-slate-400 font-normal"> — {m.project_name}</span> : ""}
                  {m.time ? <span className="text-slate-400 font-normal"> @ {m.time}</span> : ""}
                </p>
              ))}
            </div>
          : <None />}
      </Row>

      <Row icon={CheckSquare} label="Tasks Due Today" color="text-red-400">
        {tasks.length > 0
          ? <div className="space-y-0.5">
              {tasks.map((t, i) => (
                <p key={i} className="text-sm font-medium text-slate-800">
                  {t.title}
                  {t.assigned_to ? <span className="text-slate-400 font-normal"> — {t.assigned_to}</span> : ""}
                </p>
              ))}
            </div>
          : <None />}
      </Row>

      {/* Book of the Month */}
      <div className="flex items-start gap-3 py-2">
        <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Book of the Month</p>
            {!editingBook && (
              <button onClick={startEdit} className="text-slate-300 hover:text-slate-500 transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editingBook ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                value={bookDraft}
                onChange={e => setBookDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveMutation.mutate(bookDraft); if (e.key === "Escape") setEditingBook(false); }}
                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="Enter book title..."
              />
              <button onClick={() => saveMutation.mutate(bookDraft)} className="text-green-500 hover:text-green-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingBook(false)} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            bookSetting?.value
              ? <p className="text-sm font-medium text-slate-800 italic">"{bookSetting.value}"</p>
              : <p className="text-sm text-slate-300 italic">Not set</p>
          )}
        </div>
      </div>
    </div>
  );
}