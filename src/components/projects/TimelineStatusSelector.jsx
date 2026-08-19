import { cn } from "@/lib/utils";

// 3-state segmented control for TimelineEvent progress_status.
// Not Started (grey) | In Progress (orange) | Completed (green).
const OPTIONS = [
  { value: "not_started", label: "Not Started", active: "bg-slate-200 text-slate-800 border-slate-300" },
  { value: "in_progress", label: "In Progress", active: "bg-orange-500 text-white border-orange-500" },
  { value: "completed", label: "Completed", active: "bg-green-500 text-white border-green-500" },
];

export default function TimelineStatusSelector({ value, onChange, size = "md" }) {
  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden w-full">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 border font-medium transition-colors",
              pad,
              active ? opt.active : "bg-white text-slate-500 border-transparent hover:bg-slate-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}