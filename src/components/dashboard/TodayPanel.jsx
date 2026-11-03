import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Briefcase, BookOpen, CalendarCheck, CheckSquare, Droplets, Pencil, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { denverDateStr } from "@/lib/stagePoints";
import TodayEditForm from "./TodayEditForm";

const todayStr = denverDateStr(new Date());

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
  const [editing, setEditing] = useState(false);

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

  const { data: dashboardSettings = [] } = useQuery({
    queryKey: ["dashboardSettings"],
    queryFn: () => base44.entities.DashboardSettings.list()
  });

  const bookSetting = dashboardSettings.find(s => s.section === "book_of_month");
  const projectSetting = dashboardSettings.find(s => s.section === "today_projects");

  // A per-day project override: only today's choice is remembered.
  let selectedProjectIds = null;
  try {
    const parsed = JSON.parse(projectSetting?.value || "null");
    if (parsed?.date === todayStr && Array.isArray(parsed.ids)) selectedProjectIds = parsed.ids;
  } catch (_) { /* unreadable override falls back to every project */ }

  const visibleProjects = selectedProjectIds
    ? inProductionProjects.filter(project => selectedProjectIds.includes(project.id))
    : inProductionProjects;
  const effectiveProjectIds = selectedProjectIds || inProductionProjects.map(project => project.id);

  const cleaningNames = Array.from(new Set(cleanings.flatMap(row => row.assigned_to || []))).join(", ");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Today — {format(new Date(`${todayStr}T12:00:00`), "EEEE, MMM d")}
        </h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
            title="Edit today"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <TodayEditForm
          todayStr={todayStr}
          projects={inProductionProjects}
          selectedProjectIds={effectiveProjectIds}
          presenters={presenters}
          cleanings={cleanings}
          meetings={meetings}
          tasks={tasks}
          bookSetting={bookSetting}
          projectSetting={projectSetting}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <Row icon={Briefcase} label="Active Projects" color="text-green-500">
            {visibleProjects.length > 0
              ? <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                  {visibleProjects.map(p => (
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
            {presenters.some(p => p.presenter_name)
              ? <p className="text-sm font-medium text-slate-800">{presenters.map(p => p.presenter_name).filter(Boolean).join(", ")}</p>
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

          <Row icon={BookOpen} label="Book of the Month" color="text-emerald-500">
            {bookSetting?.value
              ? <p className="text-sm font-medium text-slate-800 italic">"{bookSetting.value}"</p>
              : <None />}
          </Row>
        </>
      )}
    </div>
  );
}