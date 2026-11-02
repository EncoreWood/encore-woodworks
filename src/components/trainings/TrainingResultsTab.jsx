import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import TrainingResultDetailDialog from "./TrainingResultDetailDialog";

/**
 * Admin-only list of every saved quiz attempt, with per-employee drill-down.
 */
export default function TrainingResultsTab({ trainings = [] }) {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["trainingResults"],
    queryFn: () => base44.entities.TrainingResult.list("-taken_at", 300),
  });

  const filtered = results.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.employee_name || "").toLowerCase().includes(q) ||
      (r.training_name || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee or training..."
          className="pl-9"
        />
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quiz results yet</p>
          <p className="text-sm">Results appear here as soon as someone finishes a quiz.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-sm text-slate-400">No results match that search.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => setViewing(result)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900 truncate">{result.employee_name}</p>
                  {result.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {result.training_name}
                  {result.quiz_scope && result.quiz_scope !== "Main quiz" ? ` · ${result.quiz_scope}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    "text-sm font-bold",
                    result.passed ? "text-green-700" : "text-red-600"
                  )}
                >
                  {result.percentage}%
                </p>
                <p className="text-[10px] text-slate-400">
                  {result.correct_count}/{result.total_questions}
                  {result.taken_at ? ` · ${format(new Date(result.taken_at), "MMM d")}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <TrainingResultDetailDialog
        result={viewing}
        open={!!viewing}
        onOpenChange={(open) => { if (!open) setViewing(null); }}
      />
    </div>
  );
}