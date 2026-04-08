import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, CheckCircle2, Circle, Clock, AlertTriangle, User, Filter } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  high: { label: "High", color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "text-slate-400" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-500" },
  completed: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};

function TaskForm({ employees, projects, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    assigned_to_email: "",
    due_date: "",
    project_id: "",
    project_name: "",
    notes: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAssignee = (empId) => {
    if (!empId || empId === "unassigned") {
      set("assigned_to", ""); set("assigned_to_email", "");
      return;
    }
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      set("assigned_to", emp.full_name);
      set("assigned_to_email", emp.user_email || emp.email || "");
    }
  };

  const handleProject = (projId) => {
    if (!projId || projId === "none") { set("project_id", ""); set("project_name", ""); return; }
    const proj = projects.find(p => p.id === projId);
    if (proj) { set("project_id", proj.id); set("project_name", proj.project_name); }
  };

  const currentEmp = employees.find(e => e.full_name === form.assigned_to);

  return (
    <div className="space-y-4">
      <div>
        <Label>Task Title *</Label>
        <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Details..." className="min-h-[60px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Assigned To</Label>
          <Select value={currentEmp?.id || "unassigned"} onValueChange={handleAssignee}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set("priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Project (optional)</Label>
        <Select value={form.project_id || "none"} onValueChange={handleProject}>
          <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects.filter(p => !p.archived).map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700">Save Task</Button>
      </div>
    </div>
  );
}

function TaskCard({ task, isAdmin, onEdit, onDelete, onToggle }) {
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const Icon = sc.icon;
  const isOverdue = task.due_date && task.status !== "completed" && isPast(parseISO(task.due_date));

  return (
    <div className={cn(
      "bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md",
      task.status === "completed" && "opacity-60",
      isOverdue && "border-red-200 bg-red-50/30"
    )}>
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0">
          <Icon className={cn("w-5 h-5", sc.color)} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm", task.status === "completed" && "line-through text-slate-400")}>
            {task.title}
          </p>
          {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {task.assigned_to && (
              <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                <User className="w-2.5 h-2.5" />{task.assigned_to}
              </span>
            )}
            {task.due_date && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full", isOverdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>
                {isOverdue && "⚠ "}Due {format(parseISO(task.due_date), "MMM d")}
              </span>
            )}
            {task.project_name && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full truncate max-w-[120px]">{task.project_name}</span>
            )}
            <Badge className={cn("text-xs border-0", PRIORITY_CONFIG[task.priority]?.color)}>
              {PRIORITY_CONFIG[task.priority]?.label}
            </Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => onEdit(task)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => onDelete(task.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assignments() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["assignmentTasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assignmentTasks"] }); setShowForm(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assignmentTasks"] }); setEditing(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignmentTasks"] }),
  });

  const handleToggle = (task) => {
    const next = task.status === "completed" ? "todo" : "completed";
    updateMutation.mutate({ id: task.id, data: { status: next } });
  };

  // Filter: non-admins only see their own tasks
  const visibleTasks = tasks.filter(t => {
    if (!isAdmin) {
      return t.assigned_to_email === currentUser?.email;
    }
    if (filterAssignee !== "all") {
      return t.assigned_to_email === filterAssignee || t.assigned_to === filterAssignee;
    }
    return true;
  }).filter(t => filterStatus === "all" || t.status === filterStatus);

  const todoCount = visibleTasks.filter(t => t.status === "todo").length;
  const inProgressCount = visibleTasks.filter(t => t.status === "in_progress").length;
  const completedCount = visibleTasks.filter(t => t.status === "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin ? "Assign and track tasks for your team" : "Your assigned tasks"}
            </p>
          </div>
          {isAdmin && (
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Assign Task
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "To Do", count: todoCount, color: "bg-slate-100 text-slate-700" },
            { label: "In Progress", count: inProgressCount, color: "bg-blue-100 text-blue-700" },
            { label: "Completed", count: completedCount, color: "bg-green-100 text-green-700" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl px-4 py-3 text-center", s.color)}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1">
            {["all", "todo", "in_progress", "completed"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
                  filterStatus === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          {isAdmin && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All assignees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.user_email || e.email || e.full_name}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading tasks...</div>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks found</p>
            {isAdmin && (
              <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Assign first task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(task => (
              <TaskCard key={task.id} task={task} isAdmin={isAdmin}
                onEdit={(t) => setEditing(t)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign New Task</DialogTitle></DialogHeader>
          <TaskForm employees={employees} projects={projects}
            onSave={(data) => createMutation.mutate(data)}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editing && (
            <TaskForm employees={employees} projects={projects} initial={editing}
              onSave={(data) => updateMutation.mutate({ id: editing.id, data })}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}