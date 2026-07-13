import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, XCircle, RotateCcw, Award, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getVideoEmbed(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (ytMatch) return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  return { type: "video", src: url };
}

export default function LeanTrainingViewer({ open, onOpenChange, training, currentUser }) {
  const [phase, setPhase] = useState("video");
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const queryClient = useQueryClient();

  const saveCompletion = useMutation({
    mutationFn: (data) => base44.entities.LeanTrainingCompletion.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leanCompletions"] }),
  });

  useEffect(() => {
    setPhase("video");
    setAnswers({});
    setScore(null);
  }, [training?.id, open]);

  if (!training) return null;

  const video = getVideoEmbed(training.video_url);
  const quiz = training.quiz || [];
  const passingScore = training.passing_score ?? 80;
  const hasQuiz = quiz.length > 0;

  const handleSubmit = () => {
    const correct = quiz.filter((q, i) => answers[i] === q.correct_answer).length;
    const pct = Math.round((correct / quiz.length) * 100);
    const passed = pct >= passingScore;
    setScore({ correct, total: quiz.length, pct, passed });
    setPhase("results");
    if (currentUser) {
      saveCompletion.mutate({
        training_id: training.id,
        training_title: training.title,
        employee_name: currentUser.full_name,
        employee_email: currentUser.email,
        score: pct,
        passed,
        answers: JSON.stringify(answers),
        completed_at: new Date().toISOString(),
      });
    }
  };

  const allAnswered = quiz.every((_, i) => answers[i] !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{training.title}</DialogTitle>
        </DialogHeader>

        {/* Video Phase */}
        {phase === "video" && (
          <div className="space-y-4">
            {training.description && (
              <p className="text-sm text-slate-600">{training.description}</p>
            )}
            {video ? (
              <div className="rounded-lg overflow-hidden bg-black aspect-video">
                {video.type === "iframe" ? (
                  <iframe src={video.src} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                ) : (
                  <video src={video.src} controls className="w-full h-full" />
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-100 aspect-video flex items-center justify-center text-slate-400">
                <Video className="w-12 h-12" />
              </div>
            )}
            {hasQuiz ? (
              <Button onClick={() => setPhase("quiz")} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Play className="w-4 h-4" /> Start Quiz ({quiz.length} questions)
              </Button>
            ) : (
              <p className="text-center text-sm text-slate-400">No quiz for this training</p>
            )}
          </div>
        )}

        {/* Quiz Phase */}
        {phase === "quiz" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Quiz</h3>
              <span className="text-sm text-slate-500">Passing score: {passingScore}%</span>
            </div>
            {quiz.map((q, qIdx) => (
              <div key={q.id || qIdx} className="space-y-2">
                <p className="font-medium text-slate-800 text-sm">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-2",
                        answers[qIdx] === oIdx
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                        answers[qIdx] === oIdx ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                      )}>
                        {answers[qIdx] === oIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={handleSubmit} disabled={!allAnswered} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Submit Quiz
            </Button>
            {!allAnswered && <p className="text-xs text-slate-400 text-center">Answer all questions to submit</p>}
          </div>
        )}

        {/* Results Phase */}
        {phase === "results" && score && (
          <div className="space-y-4">
            <div className={cn(
              "rounded-xl p-6 text-center",
              score.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              {score.passed ? (
                <Award className="w-12 h-12 mx-auto mb-2 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
              )}
              <p className={cn("text-2xl font-bold", score.passed ? "text-green-700" : "text-red-700")}>
                {score.passed ? "Passed!" : "Not Passed"}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Score: {score.correct}/{score.total} ({score.pct}%)
              </p>
            </div>

            <div className="space-y-2">
              {quiz.map((q, qIdx) => {
                const userAnswer = answers[qIdx];
                const isCorrect = userAnswer === q.correct_answer;
                return (
                  <div key={q.id || qIdx} className={cn(
                    "rounded-lg p-3 border text-sm",
                    isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                  )}>
                    <div className="flex items-start gap-2">
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-medium text-slate-800">{qIdx + 1}. {q.question}</p>
                        {!isCorrect && (
                          <p className="text-xs text-slate-500 mt-1">
                            Your answer: <span className="text-red-600">{q.options[userAnswer] || "No answer"}</span> · Correct: <span className="text-green-600">{q.options[q.correct_answer]}</span>
                          </p>
                        )}
                        {isCorrect && (
                          <p className="text-xs text-green-600 mt-1">Correct: {q.options[q.correct_answer]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              {!score.passed && (
                <Button onClick={() => { setAnswers({}); setScore(null); setPhase("quiz"); }} variant="outline" className="flex-1 gap-2">
                  <RotateCcw className="w-4 h-4" /> Retake Quiz
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}