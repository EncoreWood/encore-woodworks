import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User, AlertCircle, Coffee, Target, CheckCircle2,
  ChevronLeft, ChevronRight, Edit, Plus, Trash2, ChevronDown,
  Megaphone, BookOpen, ClipboardList, Zap, Crosshair, Link2, Upload, X, Sparkles, AlertTriangle
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { startOfWeek } from "date-fns";
import CleaningScheduleWidget from "@/components/dashboard/CleaningScheduleWidget";
import { format, addDays, subDays } from "date-fns";

const motivationalQuotes = [
  "Excellence is not a skill, it's an attitude.",
  "Quality is not an act, it is a habit.",
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Do what you do so well that they will want to see it again.",
  "Strive for progress, not perfection.",
  "Great things are done by a series of small things brought together.",
  "The only way to do great work is to love what you do.",
  "Craftsmanship is a tradition of excellence.",
  "Precision and passion create perfection.",
  "Every project is an opportunity to exceed expectations.",
  "Build it right, build it once.",
  "Take pride in every cut, every joint, every finish.",
  "Attention to detail makes all the difference."
];

function SectionCard({ title, icon: Icon, color, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    red: { border: "border-l-red-500", header: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700" },
    amber: { border: "border-l-amber-500", header: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
    blue: { border: "border-l-blue-500", header: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
    green: { border: "border-l-green-500", header: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700" },
    purple: { border: "border-l-purple-500", header: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    slate: { border: "border-l-slate-500", header: "bg-slate-50", text: "text-slate-700", badge: "bg-slate-100 text-slate-700" },
    orange: { border: "border-l-orange-500", header: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  };
  const c = colors[color] || colors.slate;

  return (
    <Card className={`overflow-hidden border-l-4 ${c.border} shadow-md`}>
      <button
        className={`w-full flex items-center justify-between px-5 py-4 ${c.header} hover:brightness-95 transition-all`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${c.text}`} />
          <span className={`text-lg font-bold ${c.text}`}>{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {count !== undefined && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
          )}
          <ChevronDown className={`w-4 h-4 ${c.text} transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </Card>
  );
}

export default function MorningMeeting() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPresenterDialog, setShowPresenterDialog] = useState(false);
  const [presenterName, setPresenterName] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newTeachLabel, setNewTeachLabel] = useState("");
  const [newTeachUrl, setNewTeachUrl] = useState("");
  const [teachUploading, setTeachUploading] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [weeklyTopicLabel, setWeeklyTopicLabel] = useState("");
  const [weeklyTopicUrl, setWeeklyTopicUrl] = useState("");
  const [weeklyTopicNotes, setWeeklyTopicNotes] = useState("");
  const [weeklyTopicUploading, setWeeklyTopicUploading] = useState(false);

  const dateString = format(selectedDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  // --- Queries ---
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: presenterData } = useQuery({
    queryKey: ["presenter", dateString],
    queryFn: async () => {
      const list = await base44.entities.MeetingPresenter.filter({ date: dateString });
      return list[0];
    }
  });

  // MeetingTasks for selected date (created in meeting)
  const { data: meetingTasks = [] } = useQuery({
    queryKey: ["meetingTasks", dateString],
    queryFn: () => base44.entities.MeetingTask.filter({ date: dateString })
  });

  // All global tasks (from Task entity, not date-bound) that are not completed
  const { data: allTasks = [] } = useQuery({
    queryKey: ["allTasks"],
    queryFn: () => base44.entities.Task.filter({ status: "todo" })
  });
  const { data: inProgressTasks = [] } = useQuery({
    queryKey: ["inProgressTasks"],
    queryFn: () => base44.entities.Task.filter({ status: "in_progress" })
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: pickupItems = [] } = useQuery({
    queryKey: ["pickupItemsAll"],
    queryFn: () => base44.entities.PickupItem.list("-created_date", 100)
  });

  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItemsAll"],
    queryFn: () => base44.entities.ProductionItem.list("-updated_date", 200)
  });

  const { data: endOfDayReviews = [] } = useQuery({
    queryKey: ["endOfDayReviews"],
    queryFn: () => base44.entities.EndOfDayReview.list("-submitted_at", 100)
  });

  const { data: columnMoveLogs = [] } = useQuery({
    queryKey: ["columnMoveLogsAll"],
    queryFn: () => base44.entities.ColumnMoveLog.list("-moved_at", 500)
  });

  const { data: struggles = [] } = useQuery({
    queryKey: ["struggles"],
    queryFn: () => base44.entities.Struggle.list("-created_date", 50)
  });

  const { data: compliments = [] } = useQuery({
    queryKey: ["compliments"],
    queryFn: () => base44.entities.Compliment.list("-submitted_at", 50)
  });

  // Persistent announcements and teach items from DailyNote
  const { data: dailyNotes = [] } = useQuery({
    queryKey: ["dailyNotes", dateString],
    queryFn: () => base44.entities.DailyNote.filter({ date: dateString })
  });

  const announcements = dailyNotes.filter(n => n.type === "announcement");
  const teachItems = dailyNotes.filter(n => n.type === "teach_item");

  // Weekly topic — keyed by the Monday of the selected week
  const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStartDate, "yyyy-MM-dd");

  const { data: weeklyTopics = [] } = useQuery({
    queryKey: ["weeklyTopics", weekStartStr],
    queryFn: () => base44.entities.WeeklyTopic.filter({ week_start: weekStartStr })
  });

  // --- Mutations ---
  const savePresenterMutation = useMutation({
    mutationFn: async (name) => {
      if (presenterData?.id) {
        return base44.entities.MeetingPresenter.update(presenterData.id, { presenter_name: name, date: dateString });
      } else {
        return base44.entities.MeetingPresenter.create({ presenter_name: name, date: dateString });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presenter", dateString] });
      setShowPresenterDialog(false);
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyNote.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyNotes", dateString] })
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyNotes", dateString] })
  });

  const addWeeklyTopicMutation = useMutation({
    mutationFn: (data) => base44.entities.WeeklyTopic.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyTopics", weekStartStr] });
      queryClient.invalidateQueries({ queryKey: ["weeklyTopics"] });
      setWeeklyTopicLabel("");
      setWeeklyTopicUrl("");
      setWeeklyTopicNotes("");
    }
  });

  const updateWeeklyTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WeeklyTopic.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weeklyTopics", weekStartStr] })
  });

  const archiveWeeklyTopicMutation = useMutation({
    mutationFn: (id) => base44.entities.WeeklyTopic.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyTopics", weekStartStr] });
      queryClient.invalidateQueries({ queryKey: ["weeklyTopics"] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetingTasks", dateString] });
      setNewTask("");
      setNewAssignee("");
    }
  });

  const updateMeetingTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetingTasks", dateString] })
  });

  const deleteMeetingTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetingTasks", dateString] })
  });

  const updateGlobalTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["inProgressTasks"] });
    }
  });

  // --- Helpers ---
  const getDailyQuote = () => {
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((selectedDate - start) / 86400000);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  };

  // Auto-rotation: Mon(1)–Thu(4), cycle through hardcoded list
  const ROTATION_MEMBERS = ["Christian", "Sean", "Dan", "Ben Hunt", "Trason", "Paul"];
  const getAutoPresenter = () => {
    const sorted = ROTATION_MEMBERS;
    // Count Mon–Thu days since a fixed epoch (2024-01-01 was a Monday)
    const epoch = new Date("2024-01-01T00:00:00");
    const dayOfWeek = selectedDate.getDay(); // 0=Sun,1=Mon,...,6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) return null; // Fri/Sat/Sun no meeting
    // Count Mon–Thu occurrences from epoch to selectedDate
    const msPerDay = 86400000;
    const totalDays = Math.floor((selectedDate - epoch) / msPerDay);
    let meetingDayCount = 0;
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(epoch.getTime() + i * msPerDay).getDay();
      if (d >= 1 && d <= 4) meetingDayCount++;
    }
    return sorted[(meetingDayCount - 1) % sorted.length] || null;
  };

  const getPresenter = () => {
    if (presenterData?.presenter_name) return presenterData.presenter_name;
    return getAutoPresenter() || "Not Set";
  };

  // Urgent items: high-priority pickup items (not resolved/archived) + high-priority production items (not complete)
  const urgentPickups = pickupItems.filter(p => p.priority === "high" && p.status !== "resolved" && !p.archived);
  const urgentProduction = productionItems.filter(p => {
    // Check notes or name for high priority marker — ProductionItem doesn't have a priority field directly
    // but PickupItem does. Use linked pickup item priority or check if type === "pickup" with high priority pickup
    return false; // placeholder — see below
  });
  // Actually productionItems linked to high-priority pickup items
  const highPriorityPickupIds = new Set(urgentPickups.map(p => p.production_item_id).filter(Boolean));
  const urgentProductionCards = productionItems.filter(p =>
    highPriorityPickupIds.has(p.id) && p.stage !== "complete"
  );

  // Today's Focus: projects actively in production, with their active rooms
  const todaysFocusProjects = projects.filter(p => p.status === "in_production" && !p.archived);
  // Get active rooms for a project (rooms that have production items not yet complete)
  const getActiveRooms = (projectId) => {
    const ACTIVE_STAGES = ["cut", "face_frame", "spray", "build"];
    const activeItems = productionItems.filter(i =>
      i.project_id === projectId &&
      !i.is_job_info &&
      ACTIVE_STAGES.includes(i.stage) &&
      i.room_name
    );
    return [...new Set(activeItems.map(i => i.room_name))];
  };

  // Combined tasks: meeting tasks for this date + all global tasks not completed
  const globalActiveTasks = [...allTasks, ...inProgressTasks];

  const handleAddAnnouncement = () => {
    if (newAnnouncement.trim()) {
      addNoteMutation.mutate({ date: dateString, type: "announcement", content: newAnnouncement.trim() });
      setNewAnnouncement("");
    }
  };

  const handleAddTeachUrl = () => {
    if (newTeachLabel.trim() || newTeachUrl.trim()) {
      addNoteMutation.mutate({ date: dateString, type: "teach_item", label: newTeachLabel.trim() || newTeachUrl, url: newTeachUrl.trim(), item_type: "link" });
      setNewTeachLabel("");
      setNewTeachUrl("");
    }
  };

  const handleTeachFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeachUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    addNoteMutation.mutate({ date: dateString, type: "teach_item", label: file.name, url: file_url, item_type: "file" });
    setTeachUploading(false);
  };

  const handleAddWeeklyTopic = () => {
    if (!weeklyTopicLabel.trim()) return;
    addWeeklyTopicMutation.mutate({
      week_start: weekStartStr,
      label: weeklyTopicLabel.trim(),
      url: weeklyTopicUrl.trim() || undefined,
      item_type: weeklyTopicUrl.trim() ? "link" : undefined,
      notes: weeklyTopicNotes.trim() || undefined,
      presented_by: getPresenter(),
      presented_at: new Date().toISOString()
    });
  };

  const handleWeeklyTopicFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setWeeklyTopicUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    addWeeklyTopicMutation.mutate({
      week_start: weekStartStr,
      label: file.name,
      url: file_url,
      item_type: "file",
      notes: weeklyTopicNotes.trim() || undefined,
      presented_by: getPresenter(),
      presented_at: new Date().toISOString()
    });
    setWeeklyTopicUploading(false);
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      createTaskMutation.mutate({
        task: newTask.trim(),
        date: dateString,
        assignee: newAssignee.trim() || undefined,
        completed: false,
        source: "meeting",
        show_in_meeting: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md mb-4">
            <Coffee className="w-6 h-6 text-amber-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Daily Morning Meeting
            </h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center">
              <p className="text-lg text-slate-600 font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
              {format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="text-xs text-amber-600">
                  Back to Today
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Presenter */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg">
              <User className="w-5 h-5" />
              <span className="font-semibold">Presenter:</span>
              <span className="font-bold text-lg">{getPresenter()}</span>
              {!presenterData?.presenter_name && getAutoPresenter() && (
                <span className="text-xs bg-blue-400/50 px-2 py-0.5 rounded-full">auto</span>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 text-white hover:bg-blue-700"
                onClick={() => { setPresenterName(presenterData?.presenter_name || ""); setShowPresenterDialog(true); }}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quote */}
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-5 shadow-md border-l-4 border-amber-500 mb-6">
            <p className="text-xl font-semibold text-slate-700 italic">"{getDailyQuote()}"</p>
          </div>

          <Link to={createPageUrl("StretchingRoutine")}>
            <Button className="bg-blue-600 hover:bg-blue-700">✨ Quick Stretch Before Meeting</Button>
          </Link>
        </div>

        {/* Agenda Sections */}
        <div className="space-y-4">

          {/* 1. Announcements — persisted per date, carry forward if viewing same date */}
          <SectionCard title="Announcements" icon={Megaphone} color="amber" count={announcements.length} defaultOpen={true}>
            <div className="space-y-2 mb-3">
              {announcements.length === 0 && <p className="text-slate-400 text-sm text-center py-2">No announcements yet.</p>}
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <p className="flex-1 text-slate-700 text-sm">{a.content}</p>
                  <button onClick={() => deleteNoteMutation.mutate(a.id)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add announcement..."
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddAnnouncement()}
                className="flex-1 text-sm"
              />
              <Button size="sm" onClick={handleAddAnnouncement} disabled={!newAnnouncement.trim()} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </SectionCard>

          {/* 2. Weekly Topic — persisted per week, logged to admin */}
          <SectionCard title="Weekly Topic" icon={BookOpen} color="green" count={weeklyTopics.filter(t => !t.archived).length}>
            {/* Existing topics for this week */}
            <div className="space-y-3 mb-4">
              {weeklyTopics.filter(t => !t.archived).length === 0 && <p className="text-slate-400 text-sm text-center py-2">No topic added for this week yet.</p>}
              {weeklyTopics.filter(t => !t.archived).map((topic) => (
                <div key={topic.id} className="bg-green-50 rounded-lg border border-green-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    {topic.item_type === "file" ? <Upload className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    {topic.url
                      ? <a href={topic.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline font-medium truncate">{topic.label}</a>
                      : <span className="flex-1 text-sm font-medium text-slate-700">{topic.label}</span>
                    }
                    <button onClick={() => archiveWeeklyTopicMutation.mutate(topic.id)} className="text-slate-400 hover:text-amber-600 ml-2" title="Archive topic">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Notes for this topic */}
                  <div className="px-3 pb-2">
                    <Textarea
                      placeholder="Add notes for this topic..."
                      value={topic.notes || ""}
                      onChange={e => updateWeeklyTopicMutation.mutate({ id: topic.id, data: { notes: e.target.value } })}
                      className="text-sm min-h-[60px] bg-white border-green-200"
                    />
                    {topic.presented_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        Logged {format(new Date(topic.presented_at), "EEE MMM d 'at' h:mm a")}
                        {topic.presented_by && ` · ${topic.presented_by}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add new topic */}
            <div className="border-t border-green-100 pt-3 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Topic label..." value={weeklyTopicLabel} onChange={e => setWeeklyTopicLabel(e.target.value)} className="flex-1 text-sm" />
                <Input placeholder="URL (optional)" value={weeklyTopicUrl} onChange={e => setWeeklyTopicUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddWeeklyTopic()} className="flex-1 text-sm" />
                <Button size="sm" onClick={handleAddWeeklyTopic} disabled={!weeklyTopicLabel.trim() || addWeeklyTopicMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Pre-add notes (optional)..."
                value={weeklyTopicNotes}
                onChange={e => setWeeklyTopicNotes(e.target.value)}
                className="text-sm min-h-[60px] border-green-200"
              />
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleWeeklyTopicFileUpload} />
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-green-300 text-green-700 text-sm hover:bg-green-50 transition ${weeklyTopicUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4" /> {weeklyTopicUploading ? "Uploading..." : "Upload File"}
                </span>
              </label>
            </div>
          </SectionCard>

          {/* 3. Urgent Items — high priority pickup items + linked production cards */}
          <SectionCard title="Urgent Items" icon={Zap} color="red" count={urgentPickups.length + urgentProductionCards.length} defaultOpen={urgentPickups.length > 0 || urgentProductionCards.length > 0}>
            {urgentPickups.length === 0 && urgentProductionCards.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                <CheckCircle2 className="w-4 h-4" /> <span className="text-sm">No urgent items!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentPickups.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">High Priority Pickup Items</p>
                    {urgentPickups.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5 border border-red-200 mb-1.5">
                        <div>
                          <p className="font-semibold text-red-800 text-sm">{item.title}</p>
                          <p className="text-xs text-red-600">{item.project_name} · {item.room_name || item.type}</p>
                        </div>
                        <Badge className="bg-red-200 text-red-800 text-xs">HIGH</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {urgentProductionCards.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">High Priority Production Cards</p>
                    {urgentProductionCards.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-200 mb-1.5">
                        <div>
                          <p className="font-semibold text-orange-800 text-sm">{item.name}</p>
                          <p className="text-xs text-orange-600">{item.project_name} · {item.stage?.replace(/_/g, " ")}</p>
                        </div>
                        <Badge className="bg-orange-200 text-orange-800 text-xs">HIGH</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* 4. Previous Day Review */}
          <SectionCard title="Previous Day Review" icon={ClipboardList} color="blue" defaultOpen={true}>
            {(() => {
              const yesterday = format(subDays(selectedDate, 1), "yyyy-MM-dd");

              // --- End of Day Reviews ---
              const RATING_ORDER = ["great", "good", "fuck_alright", "okay", "bad", "terrible"];
              const RATING_LABELS = { great: "Great 🌟", good: "Good 😊", fuck_alright: "F*** Alright 😤", okay: "Okay 😐", bad: "Bad 😟", terrible: "Terrible 😣" };
              const RATING_SCORES = { great: 4, good: 3, fuck_alright: 2.5, okay: 2, bad: 1, terrible: 0 };
              const yesterdayReviews = endOfDayReviews.filter(r => r.date === yesterday);
              const avgScore = yesterdayReviews.length > 0
                ? yesterdayReviews.reduce((sum, r) => sum + (RATING_SCORES[r.day_rating] ?? 2), 0) / yesterdayReviews.length
                : null;
              const dominantRating = avgScore !== null
                ? RATING_ORDER[Math.max(0, Math.round(4 - avgScore))]
                : null;
              const cleanCount = yesterdayReviews.filter(r => r.area_clean).length;
              const blockers = yesterdayReviews.filter(r => r.blockers?.trim()).map(r => ({ who: r.submitted_by, text: r.blockers }));
              const accomplishments = yesterdayReviews.filter(r => r.accomplishments?.trim()).map(r => ({ who: r.submitted_by, text: r.accomplishments }));
              const tomorrowPlans = yesterdayReviews.filter(r => r.tomorrow_plan?.trim()).map(r => ({ who: r.submitted_by, text: r.tomorrow_plan }));

              // --- Production Points by Stage ---
              const STAGE_CONFIG = [
                { id: "face_frame", label: "Face Frame", color: "bg-blue-100 text-blue-800 border-blue-200" },
                { id: "spray",      label: "Spray",      color: "bg-purple-100 text-purple-800 border-purple-200" },
                { id: "build",      label: "Build",      color: "bg-amber-100 text-amber-800 border-amber-200" },
                { id: "complete",   label: "Complete",   color: "bg-green-100 text-green-800 border-green-200" },
                { id: "on_hold",    label: "On Hold",    color: "bg-red-100 text-red-800 border-red-200" },
              ];
              const stagePts = {};
              for (const log of columnMoveLogs) {
                if (!log.moved_at) continue;
                const logDate = format(new Date(log.moved_at), "yyyy-MM-dd");
                if (logDate !== yesterday) continue;
                const pts = parseFloat(log.points_awarded) || 0;
                if (pts === 0) continue;
                stagePts[log.to_column] = (stagePts[log.to_column] || 0) + pts;
              }
              const totalPts = Object.values(stagePts).reduce((s, v) => s + v, 0);
              const hasAnyData = yesterdayReviews.length > 0 || totalPts > 0;

              if (!hasAnyData) return (
                <p className="text-slate-400 text-sm text-center py-4">No data recorded for {format(subDays(selectedDate, 1), "MMMM d")}.</p>
              );

              return (
                <div className="space-y-5">
                  {/* Production Points */}
                  {totalPts > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📦 Points Produced by Stage</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {STAGE_CONFIG.map(({ id, label, color }) => {
                          const pts = stagePts[id] || 0;
                          return (
                            <div key={id} className={`rounded-lg border px-3 py-2.5 text-center ${color} ${pts === 0 ? "opacity-40" : ""}`}>
                              <p className="text-xs font-semibold mb-0.5">{label}</p>
                              <p className="text-xl font-bold">{pts}<span className="text-xs font-normal ml-0.5">pts</span></p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-right text-xs text-slate-400 mt-1">Total: <strong className="text-slate-700">{totalPts} pts</strong></p>
                    </div>
                  )}

                  {/* EOD Review Summary */}
                  {yesterdayReviews.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🌅 End of Day Reviews ({yesterdayReviews.length} submitted)</p>
                      {/* Overall Rating */}
                      <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Overall Day Rating</p>
                          <p className="text-lg font-bold text-slate-800">{dominantRating ? RATING_LABELS[dominantRating] : "—"}</p>
                          <p className="text-xs text-slate-400">Avg score: {avgScore?.toFixed(1)}/4 · {yesterdayReviews.length} review{yesterdayReviews.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-0.5">Area Clean</p>
                          <p className={`text-base font-bold ${cleanCount === yesterdayReviews.length ? "text-green-600" : "text-orange-500"}`}>
                            {cleanCount}/{yesterdayReviews.length}
                          </p>
                        </div>
                      </div>

                      {/* Individual ratings */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {yesterdayReviews.map(r => {
                          const ratingColors = { great: "bg-green-100 text-green-800", good: "bg-emerald-100 text-emerald-800", okay: "bg-yellow-100 text-yellow-800", bad: "bg-orange-100 text-orange-800", terrible: "bg-red-100 text-red-800" };
                          return (
                            <div key={r.id} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${ratingColors[r.day_rating] || "bg-slate-100 text-slate-600"}`}>
                              {r.submitted_by} — {RATING_LABELS[r.day_rating]}
                              {r.area_clean === false && <span className="ml-1 text-orange-500">⚠ Area</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Accomplishments */}
                      {accomplishments.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">✅ Accomplished</p>
                          <div className="space-y-1">
                            {accomplishments.map((a, i) => (
                              <div key={i} className="text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                <span className="font-semibold text-green-800 text-xs">{a.who}: </span>
                                <span className="text-slate-700">{a.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Blockers */}
                      {blockers.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">🚧 Blockers</p>
                          <div className="space-y-1">
                            {blockers.map((b, i) => (
                              <div key={i} className="text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <span className="font-semibold text-red-700 text-xs">{b.who}: </span>
                                <span className="text-slate-700">{b.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tomorrow's Plan */}
                      {tomorrowPlans.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">📅 Today's Plan</p>
                          <div className="space-y-1">
                            {tomorrowPlans.map((t, i) => (
                              <div key={i} className="text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <span className="font-semibold text-blue-700 text-xs">{t.who}: </span>
                                <span className="text-slate-700">{t.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </SectionCard>

          {/* Compliments */}
          {(() => {
            const todayCompliments = compliments.filter(c => c.date === dateString);
            const recentCompliments = compliments.filter(c => c.share_in_meeting).slice(0, 5);
            const displayCompliments = todayCompliments.length > 0 ? todayCompliments : recentCompliments;
            const isShowingToday = todayCompliments.length > 0;
            return (
              <SectionCard title="Well Done! 🎉" icon={Sparkles} color="amber" count={displayCompliments.length} defaultOpen={isShowingToday}>
                {displayCompliments.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                    <span className="text-sm">No compliments shared for today. Give one from the Production board!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!isShowingToday && (
                      <p className="text-xs text-slate-400 text-center mb-2">Showing recent compliments (none submitted for today)</p>
                    )}
                    {displayCompliments.map(c => (
                      <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{c.from}</span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{c.to}</span>
                          <span className="text-xs text-slate-400 ml-auto">{c.date}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">"{c.message}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* Struggles & Solutions */}
          {(() => {
            const openStruggles = struggles.filter(s => s.status !== "resolved" && !s.archived);
            return (
              <SectionCard title="Struggles & Solutions" icon={AlertTriangle} color="red" count={openStruggles.length}>
                {openStruggles.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                    <CheckCircle2 className="w-4 h-4" /> <span className="text-sm">No open struggles!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openStruggles.slice(0, 8).map(s => (
                      <div key={s.id} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-800 truncate">{s.problem}</p>
                          <p className="text-xs text-slate-500">
                            {s.reported_by && <span>{s.reported_by} · </span>}
                            {s.production_item_name && <span>{s.production_item_name} · </span>}
                            {s.created_date && format(new Date(s.created_date), "MMM d")}
                          </p>
                          {s.solution && <p className="text-xs text-green-700 mt-0.5">✅ {s.solution}</p>}
                          {(s.comments || []).length > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">💬 {s.comments.length} comment{s.comments.length !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${s.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {s.status?.replace("_", " ") || "open"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            );
          })()}

          {/* 5. Today's Focus */}
          <SectionCard title="Today's Focus" icon={Crosshair} color="orange" count={todaysFocusProjects.length}>
            {todaysFocusProjects.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">No projects currently in production.</p>
            ) : (
              <div className="space-y-2">
                {todaysFocusProjects.map(project => {
                  const activeRooms = getActiveRooms(project.id);
                  return (
                    <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                      <div className="bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-200 hover:bg-orange-100 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-orange-800 text-sm">{project.project_name}</p>
                          {project.address && <span className="text-xs text-orange-500 max-w-[120px] truncate">{project.address}</span>}
                        </div>
                        {activeRooms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {activeRooms.map(room => (
                              <span key={room} className="text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full">{room}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Cleaning Schedule */}
          <SectionCard title="Cleaning Schedule — This Week" icon={Sparkles} color="slate" defaultOpen={true}>
            <CleaningScheduleWidget showCheckboxes={false} />
          </SectionCard>

          {/* 6. Tasks, Action Items — meeting tasks + global tasks */}
          <SectionCard title="Tasks, Action Items" icon={CheckCircle2} color="purple"
            count={meetingTasks.filter(t => !t.completed).length + globalActiveTasks.length}
            defaultOpen={true}>
            {/* Add task form */}
            <div className="mb-4 flex gap-2">
              <Input placeholder="Add a task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} className="flex-1 text-sm" />
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No one</SelectItem>
                  {teamMembers.map(m => <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.trim() || createTaskMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {/* Meeting tasks for this date */}
              {meetingTasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Meeting Tasks — {format(selectedDate, "MMM d")}</p>
                  {meetingTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all mb-1.5 ${task.completed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-purple-300"}`}>
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => updateMeetingTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } })}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.task}</p>
                        {task.assignee && <p className="text-xs text-slate-500">→ {task.assignee}</p>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMeetingTaskMutation.mutate(task.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Global tasks from Task board */}
              {globalActiveTasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Assigned Tasks (All Active)</p>
                  {globalActiveTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-blue-100 bg-blue-50 mb-1.5">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => updateGlobalTaskMutation.mutate({ id: task.id, data: { status: task.status === "completed" ? "todo" : "completed" } })}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{task.title}</p>
                        <div className="flex gap-2 mt-0.5">
                          {task.assigned_to && <p className="text-xs text-slate-500">→ {task.assigned_to}</p>}
                          {task.project_name && <p className="text-xs text-blue-600">{task.project_name}</p>}
                          {task.due_date && <p className="text-xs text-amber-600">Due: {task.due_date}</p>}
                        </div>
                      </div>
                      <Badge className={`text-xs ${task.status === "in_progress" ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-700"}`}>
                        {task.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {meetingTasks.length === 0 && globalActiveTasks.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">No tasks yet. Add one above!</p>
              )}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* Presenter Dialog */}
      <Dialog open={showPresenterDialog} onOpenChange={setShowPresenterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Presenter for {format(selectedDate, "MMM d, yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Presenter Name</Label>
              <Select value={presenterName} onValueChange={setPresenterName}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPresenterDialog(false)}>Cancel</Button>
              <Button onClick={() => { if (presenterName.trim()) savePresenterMutation.mutate(presenterName.trim()); }}
                disabled={!presenterName.trim() || savePresenterMutation.isPending}>
                {savePresenterMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}