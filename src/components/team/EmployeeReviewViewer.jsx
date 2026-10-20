import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function EmployeeReviewViewer({ open, onOpenChange, review }) {
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list(),
    enabled: open
  });

  const answers = review?.answers || {};
  const entries = Object.entries(answers).filter(([, v]) => v !== "" && v !== null && v !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {review?.review_type === "manager" ? "Manager Review" : "Self Review"} — {review?.review_period} {review?.year}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No answers recorded.</p>
        ) : (
          <div className="space-y-3 py-2">
            {entries.map(([qid, value], idx) => {
              const q = questions.find(qq => qq.id === qid);
              const isRating = q && (q.question_type === "Rating 1-5" || q.question_type === "Rating 1-10");
              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-800">
                    {q?.question_text || "Question"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isRating ? (
                      <Badge className="border-0 bg-amber-100 text-amber-700">{value} / {q.question_type === "Rating 1-10" ? 10 : 5}</Badge>
                    ) : (
                      <span className="text-sm text-slate-600 whitespace-pre-wrap">{String(value)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}