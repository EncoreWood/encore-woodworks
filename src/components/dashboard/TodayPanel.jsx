import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { User, Droplets, CalendarCheck, Briefcase, CheckSquare, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const todayStr = format(new Date(), "yyyy-MM-dd");

function Row({ icon: Icon, label, children, color = "text-slate-500" }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="min-w-0">
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

  const cleaningNames = cleanings.flatMap(c => c.assigned_to || []).join(", ");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Today — {format(new Date(), "EEEE, MMM d")}
      </h3>

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
    </div>
  );
}