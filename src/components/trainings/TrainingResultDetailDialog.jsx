import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/**
 * Read-only breakdown of one saved quiz attempt.
 */
export default function TrainingResultDetailDialog({ result, open, onOpenChange }) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{result.training_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-slate-600 space-y-0.5">
            <p className="font-medium text-slate-900">{result.employee_name}</p>
            {result.quiz_scope && <p className="text-xs text-slate-500">{result.quiz_scope}</p>}
            <p className="text-xs text-slate-500">
              {result.taken_at ? format(new Date(result.taken_at), "MMM d, yyyy h:mm a") : ""}
            </p>
          </div>

          <div
            className={cn(
              "rounded-lg p-3 flex items-center gap-2",
              result.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}
          >
            {result.passed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={cn("font-bold", result.passed ? "text-green-700" : "text-red-700")}>
              {result.passed ? "Passed" : "Not passed"}
            </span>
            <span className="text-sm text-slate-600 ml-auto">
              {result.correct_count}/{result.total_questions} · {result.percentage}%
            </span>
          </div>

          <div className="space-y-2">
            {(result.answers || []).map((answer, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg p-2.5 border text-sm",
                  answer.is_correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                )}
              >
                <div className="flex items-start gap-1.5">
                  {answer.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {idx + 1}. {answer.question}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Answered: <span className={answer.is_correct ? "text-green-700" : "text-red-600"}>
                        {answer.chosen_text || "No answer"}
                      </span>
                    </p>
                    {!answer.is_correct && (
                      <p className="text-xs text-slate-500">
                        Correct: <span className="text-green-700">{answer.correct_text}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}