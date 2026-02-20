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
  User, Calendar, AlertCircle, Coffee, Sun, Target, CheckCircle2,
  ChevronLeft, ChevronRight, Edit, Plus, Trash2, ChevronDown,
  Megaphone, BookOpen, ClipboardList, Briefcase, Zap, Crosshair, Link2, Upload, X
} from "lucide-react";
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
  // Announcements
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  // Teach Something New
  const [teachItems, setTeachItems] = useState([]);
  const [newTeachLabel, setNewTeachLabel] = useState("");
  const [newTeachUrl, setNewTeachUrl] = useState("");
  const [teachUploading, setTeachUploading] = useState(false);
  // Tasks
  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const dateString = format(selectedDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const { data: presenterData } = useQuery({
    queryKey: ["presenter", dateString],
    queryFn: async () => {
      const presenters = await base44.entities.MeetingPresenter.filter({ date: dateString });
      return presenters[0];
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", dateString],
    queryFn: () => base44.entities.MeetingTask.filter({ date: dateString })
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: pickupItems = [] } = useQuery({
    queryKey: ["pickupItems"],
    queryFn: () => base44.entities.PickupItem.list("-created_date", 20)
  });

  const { data: productionItems = [] } = useQuery({
    queryKey: ["productionItems"],
    queryFn: () => base44.entities.ProductionItem.list("-updated_date", 50)
  });

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

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", dateString] });
      setNewTask("");
      setNewAssignee("");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", dateString] })
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", dateString] })
  });

  const getDailyQuote = () => {
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((selectedDate - start) / 86400000);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  };

  const getPresenter = () => {
    if (presenterData?.presenter_name) return presenterData.presenter_name;
    return "Not Set";
  };

  const urgentProjects = projects.filter(p => p.priority === "urgent" && p.status !== "completed");
  const inProductionProjects = projects.filter(p => p.status === "in_production");
  const todaysFocusProjects = projects.filter(p => ["ready_for_install", "installing"].includes(p.status));
  const recentPickups = pickupItems.filter(p => p.status === "open").slice(0, 5);

  // Estimated pts from production items updated recently (last day)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const recentProductionUpdates = productionItems.filter(item => {
    if (!item.updated_date) return false;
    const updated = new Date(item.updated_date);
    return updated >= yesterday;
  });

  const handleAddAnnouncement = () => {
    if (newAnnouncement.trim()) {
      setAnnouncements(prev => [...prev, newAnnouncement.trim()]);
      setNewAnnouncement("");
    }
  };

  const handleAddTeachUrl = () => {
    if (newTeachLabel.trim() || newTeachUrl.trim()) {
      setTeachItems(prev => [...prev, { label: newTeachLabel.trim() || newTeachUrl, url: newTeachUrl.trim(), type: "link" }]);
      setNewTeachLabel("");
      setNewTeachUrl("");
    }
  };

  const handleTeachFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTeachUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setTeachItems(prev => [...prev, { label: file.name, url: file_url, type: "file" }]);
    setTeachUploading(false);
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      createTaskMutation.mutate({ task: newTask.trim(), date: dateString, assignee: newAssignee.trim() || undefined, completed: false });
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
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-2 text-white hover:bg-blue-700" onClick={() => { setPresenterName(presenterData?.presenter_name || ""); setShowPresenterDialog(true); }}>
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

          {/* 1. Announcements */}
          <SectionCard title="Announcements" icon={Megaphone} color="amber" count={announcements.length} defaultOpen={true}>
            <div className="space-y-2 mb-3">
              {announcements.length === 0 && <p className="text-slate-400 text-sm text-center py-2">No announcements yet.</p>}
              {announcements.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <p className="flex-1 text-slate-700 text-sm">{a}</p>
                  <button onClick={() => setAnnouncements(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
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

          {/* 2. 5-Minute Teach Something New */}
          <SectionCard title="5-Minute Teach Something New" icon={BookOpen} color="green" count={teachItems.length}>
            <div className="space-y-2 mb-3">
              {teachItems.length === 0 && <p className="text-slate-400 text-sm text-center py-2">Add a file or URL to present.</p>}
              {teachItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                  {item.type === "link" ? <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Upload className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">{item.label}</a>
                  <button onClick={() => setTeachItems(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Label (optional)" value={newTeachLabel} onChange={e => setNewTeachLabel(e.target.value)} className="flex-1 text-sm" />
                <Input placeholder="URL link..." value={newTeachUrl} onChange={e => setNewTeachUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTeachUrl()} className="flex-1 text-sm" />
                <Button size="sm" onClick={handleAddTeachUrl} disabled={!newTeachUrl.trim()} className="bg-green-600 hover:bg-green-700">
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleTeachFileUpload} />
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-green-300 text-green-700 text-sm hover:bg-green-50 transition ${teachUploading ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="w-4 h-4" /> {teachUploading ? "Uploading..." : "Upload File"}
                  </span>
                </label>
              </div>
            </div>
          </SectionCard>

          {/* 3. Previous Day Review */}
          <SectionCard title="Previous Day Review" icon={ClipboardList} color="blue" count={recentProductionUpdates.length + recentPickups.length}>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Recently Updated Production Items</p>
                {recentProductionUpdates.length === 0 ? (
                  <p className="text-slate-400 text-sm">No production updates from yesterday.</p>
                ) : (
                  <div className="space-y-1">
                    {recentProductionUpdates.slice(0, 8).map(item => {
                      const pts = (item.files || []).reduce((sum, f) => sum + (parseFloat(f.pts) || 0), 0);
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-1.5 text-sm">
                          <span className="text-slate-700">{item.name} <span className="text-slate-400 text-xs">({item.project_name})</span></span>
                          {pts > 0 && <span className="font-bold text-blue-700 text-xs">{pts} PTS</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">New Open Pickup Items</p>
                {recentPickups.length === 0 ? (
                  <p className="text-slate-400 text-sm">No open pickup items.</p>
                ) : (
                  <div className="space-y-1">
                    {recentPickups.map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-orange-50 rounded px-3 py-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                        <span className="text-slate-700">{item.title} <span className="text-slate-400 text-xs">– {item.project_name}</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* 4. Upcoming Work */}
          <SectionCard title="Upcoming Work" icon={Briefcase} color="slate" count={inProductionProjects.length}>
            {inProductionProjects.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">No projects currently in production.</p>
            ) : (
              <div className="space-y-2">
                {inProductionProjects.map(project => (
                  <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 hover:bg-slate-100 transition-all">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{project.project_name}</p>
                        <p className="text-xs text-slate-500">{project.client_name}</p>
                      </div>
                      {project.estimated_completion && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(project.estimated_completion), "MMM d")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 5. Urgent Items */}
          <SectionCard title="Urgent Items" icon={Zap} color="red" count={urgentProjects.length}>
            {urgentProjects.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                <CheckCircle2 className="w-4 h-4" /> <span className="text-sm">No urgent items!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentProjects.map(project => (
                  <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                    <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5 border border-red-200 hover:bg-red-100 transition-all">
                      <div>
                        <p className="font-semibold text-red-800 text-sm">{project.project_name}</p>
                        <p className="text-xs text-red-600">{project.client_name} · {project.status?.replace(/_/g, " ")}</p>
                      </div>
                      <Badge className="bg-red-200 text-red-800 text-xs">URGENT</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 6. Today's Focus */}
          <SectionCard title="Today's Focus" icon={Crosshair} color="orange" count={todaysFocusProjects.length}>
            {todaysFocusProjects.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">No installs or ready-for-install projects today.</p>
            ) : (
              <div className="space-y-2">
                {todaysFocusProjects.map(project => (
                  <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
                    <div className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-200 hover:bg-orange-100 transition-all">
                      <div>
                        <p className="font-semibold text-orange-800 text-sm">{project.project_name}</p>
                        <p className="text-xs text-orange-600">{project.client_name} · {project.status?.replace(/_/g, " ")}</p>
                      </div>
                      {project.address && <span className="text-xs text-orange-500 max-w-[120px] truncate">{project.address}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 7. Tasks, Action Items */}
          <SectionCard title="Tasks, Action Items" icon={CheckCircle2} color="purple" count={tasks.filter(t => !t.completed).length} defaultOpen={true}>
            <div className="mb-3 flex gap-2">
              <Input placeholder="Add a task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} className="flex-1 text-sm" />
              <Input placeholder="Assignee (optional)" value={newAssignee} onChange={e => setNewAssignee(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} className="w-40 text-sm" />
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.trim() || createTaskMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-sm">No tasks yet. Add one above!</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${task.completed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-purple-300"}`}>
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => updateTaskMutation.mutate({ id: task.id, data: { completed: !task.completed } })}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.task}</p>
                      {task.assignee && <p className="text-xs text-slate-500">→ {task.assignee}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteTaskMutation.mutate(task.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
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
              <Button onClick={() => { if (presenterName.trim()) savePresenterMutation.mutate(presenterName.trim()); }} disabled={!presenterName.trim() || savePresenterMutation.isPending}>
                {savePresenterMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}