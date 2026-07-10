import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, ListTodo, Loader2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export default function UserAssignmentBoard() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["assignmentTasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignmentTasks"] }),
  });

  // Only tasks assigned to the current user
  const myTasks = tasks.filter(
    t => t.assigned_to_email === currentUser?.email || t.assigned_to === currentUser?.full_name
  );
  const pendingTasks = myTasks.filter(t => t.status !== "completed");
  const completedTasks = myTasks.filter(t => t.status === "completed");
  const badgeCount = pendingTasks.length;

  const handleToggle = (task) => {
    const next = task.status === "completed" ? "todo" : "completed";
    updateMutation.mutate({ id: task.id, data: { status: next } });
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <ListTodo className="w-5 h-5 text-indigo-600" />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white">
              {badgeCount}
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-900">My Assignments</h2>
        <span className="text-sm text-slate-500 ml-1">({badgeCount} pending)</span>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-slate-400">
          <Loader2 className="w-5 h-5 mx-auto animate-spin" />
        </div>
      ) : myTasks.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No assignments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingTasks.map(task => {
            const isOverdue = task.due_date && isPast(parseISO(task.due_date));
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                  isOverdue ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-slate-50/50"
                )}
              >
                <button
                  onClick={() => handleToggle(task)}
                  className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-green-600 transition-colors"
                  title="Mark as done"
                >
                  <Circle className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {task.due_date && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isOverdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {isOverdue && "⚠ "}Due {format(parseISO(task.due_date), "MMM d")}
                      </span>
                    )}
                    {task.project_name && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                        {task.project_name}
                      </span>
                    )}
                    {task.priority && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", PRIORITY_STYLES[task.priority])}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {completedTasks.length > 0 && (
            <>
              <div className="pt-2 pb-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Completed</p>
              </div>
              {completedTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/30 opacity-60"
                >
                  <button
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 flex-shrink-0 text-green-500 hover:text-green-600"
                    title="Mark as not done"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-500 line-through">{task.title}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}