import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, X, Check, RotateCcw } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getWeekMonday(date) {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

function getDateForDayName(weekStart, dayName) {
  const days = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };
  const offset = days[dayName] ?? 0;
  const base = new Date(weekStart + "T00:00:00");
  return format(addDays(base, offset), "MMM d");
}

export default function CleaningScheduleEditor() {
  const queryClient = useQueryClient();
  const MST_TZ = "America/Denver";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: MST_TZ }));
  const weekMonday = getWeekMonday(now);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const activeEmployees = employees.filter(e => !e.archived);
  const archivedNames = new Set(employees.filter(e => e.archived).map(e => e.full_name));

  const { data: schedules = [] } = useQuery({
    queryKey: ["cleaningSchedules"],
    queryFn: () => base44.entities.CleaningSchedule.list("-week_start", 20),
  });

  // Build the rotating pool from all stored schedules
  const rotatingPool = [];
  schedules.forEach(cs => {
    if (cs.rotating_person) {
      cs.rotating_person.split(", ").map(s => s.trim()).filter(Boolean).forEach(p => {
        if (!rotatingPool.includes(p) && !archivedNames.has(p)) rotatingPool.push(p);
      });
    }
  });

  // Find or project this week's schedule
  let thisWeek = schedules.find(s => s.week_start === weekMonday);

  if (!thisWeek && schedules.length > 0) {
    const sorted = [...schedules].filter(s => s.week_start).sort((a, b) => a.week_start.localeCompare(b.week_start));
    const lastCs = sorted[sorted.length - 1];
    if (lastCs) {
      const lastMon = new Date(lastCs.week_start + "T00:00:00");
      const thisMon = new Date(weekMonday + "T00:00:00");
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksAhead = Math.round((thisMon - lastMon) / msPerWeek);
      if (weeksAhead > 0 && rotatingPool.length >= 2) {
        const lastRotPair = lastCs.rotating_person
          ? lastCs.rotating_person.split(", ").map(s => s.trim()).filter(Boolean)
          : [];
        const lastP1Idx = rotatingPool.indexOf(lastRotPair[0]);
        const globalIdx = (lastP1Idx < 0 ? 0 : lastP1Idx) + weeksAhead * 2;
        const p1 = rotatingPool[globalIdx % rotatingPool.length];
        const p2 = rotatingPool[(globalIdx + 1) % rotatingPool.length];
        thisWeek = {
          id: null,
          week_start: weekMonday,
          permanent_pair: lastCs.permanent_pair || [],
          rotating_person: p1 === p2 ? p1 : `${p1}, ${p2}`,
          day1_of_week: lastCs.day1_of_week,
          day2_of_week: lastCs.day2_of_week,
          notes: lastCs.notes,
          completed_day1: false,
          completed_day2: false,
        };
      } else if (lastCs) {
        thisWeek = {
          id: null,
          week_start: weekMonday,
          permanent_pair: lastCs.permanent_pair || [],
          rotating_person: lastCs.rotating_person || "",
          day1_of_week: lastCs.day1_of_week,
          day2_of_week: lastCs.day2_of_week,
          notes: lastCs.notes,
          completed_day1: false,
          completed_day2: false,
        };
      }
    }
  }

  // Edit state
  const [editDay1People, setEditDay1People] = useState([]);
  const [editDay2People, setEditDay2People] = useState([]);
  const [editDay1OfWeek, setEditDay1OfWeek] = useState("");
  const [editDay2OfWeek, setEditDay2OfWeek] = useState("");

  const startEdit = () => {
    const day1People = thisWeek?.permanent_pair || [];
    const day2People = thisWeek?.rotating_person
      ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean)
      : [];
    setEditDay1People(day1People.length > 0 ? day1People : [""]);
    setEditDay2People(day2People.length > 0 ? day2People : [""]);
    setEditDay1OfWeek(thisWeek?.day1_of_week || "Monday");
    setEditDay2OfWeek(thisWeek?.day2_of_week || "Friday");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (thisWeek?.id) {
        return base44.entities.CleaningSchedule.update(thisWeek.id, data);
      } else {
        return base44.entities.CleaningSchedule.create({ week_start: weekMonday, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] });
      setEditing(false);
      setSaving(false);
    },
    onError: () => setSaving(false),
  });

  const handleSave = () => {
    setSaving(true);
    const permanentPair = editDay1People.filter(Boolean);
    const rotatingPair = editDay2People.filter(Boolean);
    saveMutation.mutate({
      permanent_pair: permanentPair,
      rotating_person: rotatingPair.join(", "),
      day1_of_week: editDay1OfWeek,
      day2_of_week: editDay2OfWeek,
    });
  };

  // Pool management — add/remove from rotating pool by updating the current week
  const poolMutation = useMutation({
    mutationFn: async ({ rotating_person, permanent_pair }) => {
      if (thisWeek?.id) {
        return base44.entities.CleaningSchedule.update(thisWeek.id, { rotating_person, permanent_pair });
      } else {
        return base44.entities.CleaningSchedule.create({
          week_start: weekMonday,
          rotating_person,
          permanent_pair,
          day1_of_week: thisWeek?.day1_of_week || "Monday",
          day2_of_week: thisWeek?.day2_of_week || "Friday",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] }),
  });

  const addToPool = (name) => {
    if (!name || rotatingPool.includes(name)) return;
    const currentRot = thisWeek?.rotating_person
      ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean)
      : [];
    const newRot = [...currentRot, name].join(", ");
    poolMutation.mutate({
      rotating_person: newRot,
      permanent_pair: thisWeek?.permanent_pair || [],
    });
  };

  const removeFromPool = (name) => {
    const currentRot = thisWeek?.rotating_person
      ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean)
      : [];
    // Remove from current week's rotating_person
    const newRot = currentRot.filter(p => p !== name).join(", ");
    poolMutation.mutate({
      rotating_person: newRot,
      permanent_pair: thisWeek?.permanent_pair || [],
    });
  };

  if (!thisWeek) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-400 italic">No cleaning schedule found. Create one below.</p>
        <Button onClick={startEdit} size="sm" variant="outline" className="text-xs">
          <Plus className="w-3.5 h-3.5" /> Create Schedule
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        {/* Day 1 editor */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={editDay1OfWeek} onValueChange={setEditDay1OfWeek}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs font-semibold text-teal-700">({getDateForDayName(weekMonday, editDay1OfWeek)})</span>
          </div>
          {editDay1People.map((person, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select value={person || "none"} onValueChange={v => {
                setEditDay1People(prev => prev.map((p, i) => i === idx ? (v === "none" ? "" : v) : p));
              }}>
                <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select person..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {activeEmployees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {editDay1People.length > 1 && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setEditDay1People(prev => prev.filter((_, i) => i !== idx))}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-teal-600" onClick={() => setEditDay1People(prev => [...prev, ""])}>
            <Plus className="w-3 h-3" /> Add person
          </Button>
        </div>

        {/* Day 2 editor */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={editDay2OfWeek} onValueChange={setEditDay2OfWeek}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs font-semibold text-purple-700">({getDateForDayName(weekMonday, editDay2OfWeek)})</span>
          </div>
          {editDay2People.map((person, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select value={person || "none"} onValueChange={v => {
                setEditDay2People(prev => prev.map((p, i) => i === idx ? (v === "none" ? "" : v) : p));
              }}>
                <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select person..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {activeEmployees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {editDay2People.length > 1 && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setEditDay2People(prev => prev.filter((_, i) => i !== idx))}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-600" onClick={() => setEditDay2People(prev => [...prev, ""])}>
            <Plus className="w-3 h-3" /> Add person
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  }

  // Read-only display with edit button
  const day1People = (thisWeek.day1_sub
    ? [...(thisWeek.permanent_pair || []).filter(n => n !== thisWeek.day1_sub_for), thisWeek.day1_sub]
    : (thisWeek.permanent_pair || [])
  ).filter(n => !archivedNames.has(n));

  const day2People = (thisWeek.day2_sub
    ? [...(thisWeek.rotating_person ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean) : []).filter(n => n !== thisWeek.day2_sub_for), thisWeek.day2_sub]
    : (thisWeek.rotating_person ? thisWeek.rotating_person.split(", ").map(s => s.trim()).filter(Boolean) : [])
  ).filter(n => !archivedNames.has(n));

  return (
    <div className="space-y-3">
      {/* This week's schedule */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">This Week</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={startEdit}>
            <Pencil className="w-3 h-3" /> Edit / Swap
          </Button>
        </div>

        <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day1 ? "bg-green-50 border-green-200" : "bg-teal-50 border-teal-200"}`}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-700">
              {thisWeek.day1_of_week || "Day 1"} ({getDateForDayName(thisWeek.week_start, thisWeek.day1_of_week)})
            </p>
            <p className="text-sm font-medium text-slate-800">
              {day1People.join(" · ") || "—"}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${thisWeek.completed_day2 ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"}`}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-700">
              {thisWeek.day2_of_week || "Day 2"} ({getDateForDayName(thisWeek.week_start, thisWeek.day2_of_week)})
            </p>
            <p className="text-sm font-medium text-slate-800">
              {day2People.join(" · ") || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Rotating pool management */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rotation Pool</span>
          <span className="text-xs text-slate-400">{rotatingPool.length} members</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rotatingPool.length === 0 && (
            <p className="text-xs text-slate-400 italic">No one in the rotation pool yet.</p>
          )}
          {rotatingPool.map(name => (
            <div key={name} className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1">
              <span className="text-xs font-medium text-slate-700">{name}</span>
              <button
                onClick={() => removeFromPool(name)}
                className="w-4 h-4 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center"
                title={`Remove ${name} from pool`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {/* Add to pool */}
        <AddToPoolButton employees={activeEmployees} rotatingPool={rotatingPool} onAdd={addToPool} />
      </div>
    </div>
  );
}

function AddToPoolButton({ employees, rotatingPool, onAdd }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() => setOpen(true)}>
        <Plus className="w-3 h-3" /> Add member to pool
      </Button>
    );
  }

  const available = employees.filter(e => !rotatingPool.includes(e.full_name));

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select employee..." /></SelectTrigger>
        <SelectContent>
          {available.length === 0 && <SelectItem value="none" disabled>No more employees</SelectItem>}
          {available.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-xs" disabled={!selected} onClick={() => { onAdd(selected); setSelected(""); setOpen(false); }}>
        <Check className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setSelected(""); setOpen(false); }}>
        Cancel
      </Button>
    </div>
  );
}