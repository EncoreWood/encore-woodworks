import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Briefcase, BookOpen, CalendarCheck, Check, CheckSquare, Droplets, Plus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function Field({ icon: Icon, label, color, children }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
        {children}
      </div>
    </div>
  );
}

const inputClass = "w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400";

// One edit session for the whole card: every row saves together, so a single toggle
// on an iPad is enough.
export default function TodayEditForm({
  todayStr, projects, selectedProjectIds, presenters, cleanings, meetings, tasks,
  bookSetting, projectSetting, onClose,
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState(() => ({
    projectIds: selectedProjectIds,
    presenter: presenters[0]?.presenter_name || "",
    cleaning: cleanings.flatMap(row => row.assigned_to || []),
    meetings: meetings.map(row => ({ id: row.id, time: row.time || "", name: row.client_name || "" })),
    tasks: tasks.map(row => ({ id: row.id, title: row.title || "" })),
    book: bookSetting?.value || "",
  }));

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });
  const teamNames = Array.from(new Set([
    ...employees.filter(employee => !employee.archived).map(employee => employee.full_name).filter(Boolean),
    ...(draft.presenter ? [draft.presenter] : []),
    ...draft.cleaning,
  ])).sort();

  const update = (patch) => setDraft(prev => ({ ...prev, ...patch }));
  const toggleProject = (id) => update({
    projectIds: draft.projectIds.includes(id)
      ? draft.projectIds.filter(value => value !== id)
      : [...draft.projectIds, id],
  });
  const toggleCleaning = (name) => update({
    cleaning: draft.cleaning.includes(name)
      ? draft.cleaning.filter(value => value !== name)
      : [...draft.cleaning, name],
  });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const writes = [];
      const entities = base44.entities;

      // Active projects — a per-day override, so tomorrow starts with all of them again.
      const projectValue = JSON.stringify({ date: todayStr, ids: draft.projectIds });
      writes.push(projectSetting
        ? entities.DashboardSettings.update(projectSetting.id, { value: projectValue })
        : entities.DashboardSettings.create({ section: "today_projects", value: projectValue }));

      // Morning presenter (today only)
      const presenter = draft.presenter.trim();
      if (presenter) {
        writes.push(presenters[0]
          ? entities.MeetingPresenter.update(presenters[0].id, { presenter_name: presenter })
          : entities.MeetingPresenter.create({ date: todayStr, presenter_name: presenter }));
      } else {
        presenters.forEach(row => writes.push(entities.MeetingPresenter.delete(row.id)));
      }

      // Bathroom cleaning (today only)
      const cleaning = draft.cleaning.filter(Boolean);
      if (cleaning.length) {
        writes.push(cleanings[0]
          ? entities.BathroomCleaning.update(cleanings[0].id, { assigned_to: cleaning })
          : entities.BathroomCleaning.create({ date: todayStr, assigned_to: cleaning }));
      } else {
        cleanings.forEach(row => writes.push(entities.BathroomCleaning.delete(row.id)));
      }

      // Design meetings (today only)
      for (const row of draft.meetings) {
        const name = row.name.trim();
        if (row.id) {
          writes.push(name
            ? entities.DesignMeeting.update(row.id, { client_name: name, time: row.time })
            : entities.DesignMeeting.delete(row.id));
        } else if (name) {
          writes.push(entities.DesignMeeting.create({ date: todayStr, client_name: name, time: row.time }));
        }
      }

      // Tasks due today — removing one takes it off today's list, the task itself stays.
      for (const row of draft.tasks) {
        const title = row.title.trim();
        if (row.id) {
          writes.push(title
            ? entities.Task.update(row.id, { title })
            : entities.Task.update(row.id, { due_date: null }));
        } else if (title) {
          writes.push(entities.Task.create({ title, due_date: todayStr }));
        }
      }

      // Book of the month
      const book = draft.book.trim();
      if (bookSetting) writes.push(entities.DashboardSettings.update(bookSetting.id, { value: book }));
      else if (book) writes.push(entities.DashboardSettings.create({ section: "book_of_month", value: book }));

      await Promise.all(writes);
      ["meetingPresenters", "bathroomCleaning", "designMeetings", "tasksDueToday", "dashboardSettings"]
        .forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      onClose();
    } catch (err) {
      setError(err?.message || "Could not save the card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Field icon={Briefcase} label="Active Projects" color="text-green-500">
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {projects.length === 0 && <p className="text-xs text-slate-400 italic">No projects in production</p>}
          {projects.map(project => (
            <label key={project.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.projectIds.includes(project.id)}
                onChange={() => toggleProject(project.id)}
                className="accent-amber-600"
              />
              <span className="truncate">{project.project_name}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field icon={User} label="Morning Presenter" color="text-violet-500">
        <select value={draft.presenter} onChange={event => update({ presenter: event.target.value })} className={inputClass}>
          <option value="">None</option>
          {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </Field>

      <Field icon={Droplets} label="Bathroom Cleaning" color="text-blue-400">
        <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
          {teamNames.map(name => (
            <label key={name} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.cleaning.includes(name)}
                onChange={() => toggleCleaning(name)}
                className="accent-amber-600"
              />
              <span className="truncate">{name}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field icon={CalendarCheck} label="Design Meetings" color="text-amber-500">
        <div className="space-y-1.5">
          {draft.meetings.map((row, index) => (
            <div key={row.id || `new-${index}`} className="flex items-center gap-1">
              <input
                type="time"
                value={row.time}
                onChange={event => update({
                  meetings: draft.meetings.map((item, i) => i === index ? { ...item, time: event.target.value } : item),
                })}
                className="w-24 text-sm border border-slate-200 rounded px-1.5 py-1"
              />
              <input
                value={row.name}
                onChange={event => update({
                  meetings: draft.meetings.map((item, i) => i === index ? { ...item, name: event.target.value } : item),
                })}
                placeholder="Person / description"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => update({ meetings: draft.meetings.filter((_, i) => i !== index) })}
                className="text-slate-300 hover:text-red-500 p-1"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ meetings: [...draft.meetings, { time: "", name: "" }] })}
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            <Plus className="w-3 h-3" /> Add meeting
          </button>
        </div>
      </Field>

      <Field icon={CheckSquare} label="Tasks Due Today" color="text-red-400">
        <div className="space-y-1.5">
          {draft.tasks.map((row, index) => (
            <div key={row.id || `new-${index}`} className="flex items-center gap-1">
              <input
                value={row.title}
                onChange={event => update({
                  tasks: draft.tasks.map((item, i) => i === index ? { ...item, title: event.target.value } : item),
                })}
                placeholder="Task"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => update({ tasks: draft.tasks.filter((_, i) => i !== index) })}
                className="text-slate-300 hover:text-red-500 p-1"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ tasks: [...draft.tasks, { title: "" }] })}
            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            <Plus className="w-3 h-3" /> Add task
          </button>
        </div>
      </Field>

      <Field icon={BookOpen} label="Book of the Month" color="text-emerald-500">
        <input
          value={draft.book}
          onChange={event => update({ book: event.target.value })}
          placeholder="Book title"
          className={inputClass}
        />
      </Field>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-700 gap-1">
          <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}