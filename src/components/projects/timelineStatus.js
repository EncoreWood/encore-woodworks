import { format } from "date-fns";

// Canonical progress-status values for TimelineEvent records.
export const STATUS_VALUES = ["not_started", "in_progress", "completed"];

// Resolve the effective status of an event, falling back to the legacy
// is_completed boolean when progress_status is not yet populated.
export function getProgressStatus(event) {
  if (!event) return "not_started";
  const s = event.progress_status;
  if (s === "not_started" || s === "in_progress" || s === "completed") return s;
  return event.is_completed ? "completed" : "not_started";
}

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

// Build the update fields to persist a status change, keeping is_completed
// and completed_date in sync with progress_status.
export function statusUpdateFields(status, prevEvent) {
  const completed = status === "completed";
  const wasCompleted = getProgressStatus(prevEvent) === "completed";
  return {
    progress_status: status,
    is_completed: completed,
    completed_date: completed && !wasCompleted ? todayISO() : (!completed ? null : prevEvent?.completed_date),
  };
}

// Tailwind classes for the small percentage pill in the admin Gantt view.
export const STATUS_BADGE_CLASSES = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
};

// Bar fill color override by status. null = use the event's own color.
export const STATUS_BAR_COLOR = {
  not_started: null,
  in_progress: "#f97316",
  completed: "#22c55e",
};