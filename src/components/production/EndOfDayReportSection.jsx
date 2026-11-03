import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Award, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const REPORT_TYPES = {
  struggle: {
    label: "Struggle",
    Icon: AlertTriangle,
    button:
      "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/40",
    row: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
    icon: "text-amber-600",
  },
  compliment: {
    label: "Well Done",
    Icon: Award,
    button:
      "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40",
    row: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
    icon: "text-emerald-600",
  },
  mistake: {
    label: "Mistake",
    Icon: AlertCircle,
    button:
      "text-red-700 border-red-300 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:border-red-800 dark:bg-red-950/40",
    row: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20",
    icon: "text-red-600",
  },
};

/**
 * "Report something" — optional struggle / well done / mistake entries.
 * Each entry becomes its own record on submit (see eodReview.submitReview).
 */
export default function EndOfDayReportSection({ entries, onChange }) {
  const add = (type) =>
    onChange([...entries, { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, text: "", to: "" }]);

  const update = (id, patch) => onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id) => onChange(entries.filter((e) => e.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report something</label>
        {entries.length === 0 && <span className="text-[11px] text-slate-400">Optional — add any that apply</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(REPORT_TYPES).map(([type, cfg]) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
              cfg.button
            )}
          >
            <cfg.Icon className="w-4 h-4" />
            {cfg.label}
          </button>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-2 space-y-2">
          {entries.map((entry) => {
            const cfg = REPORT_TYPES[entry.type];
            return (
              <div key={entry.id} className={cn("rounded-lg border px-3 py-2", cfg.row)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <cfg.Icon className={cn("w-3.5 h-3.5", cfg.icon)} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cfg.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(entry.id)}
                    className="ml-auto h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    aria-label={`Remove ${cfg.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {entry.type === "compliment" && (
                  <Input
                    value={entry.to}
                    onChange={(e) => update(entry.id, { to: e.target.value })}
                    placeholder="Who was it for? (optional)"
                    className="mb-1.5 h-8 text-sm bg-white/80 dark:bg-slate-900/60"
                  />
                )}

                <Textarea
                  value={entry.text}
                  onChange={(e) => update(entry.id, { text: e.target.value })}
                  placeholder={
                    entry.type === "struggle"
                      ? "What got in the way?"
                      : entry.type === "compliment"
                        ? "What went well, or who deserves credit?"
                        : "What went wrong?"
                  }
                  className="resize-none h-16 text-sm bg-white/80 dark:bg-slate-900/60"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}