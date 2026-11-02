import { base44 } from "@/api/base44Client";

/**
 * Saves one quiz attempt to the employee's record.
 * Returns the created result, or null when the quiz had no questions.
 */
export async function saveTrainingResult({ training, quizScope, quiz, answers, passingScore, employee, user }) {
  if (!training || !quiz?.length) return null;

  const breakdown = quiz.map((q, i) => {
    const chosen = answers[i];
    return {
      question: q.question || "",
      chosen_text: chosen === undefined || chosen === null ? "" : q.options?.[chosen] || "",
      correct_text: q.options?.[q.correct_answer] || "",
      is_correct: chosen === q.correct_answer,
    };
  });

  const correct = breakdown.filter((a) => a.is_correct).length;
  const total = breakdown.length;
  const percentage = total ? Math.round((correct / total) * 100) : 0;

  return base44.entities.TrainingResult.create({
    training_id: training.id,
    training_name: training.title,
    quiz_scope: quizScope,
    employee_id: employee?.id || "",
    employee_name: employee?.full_name || user?.full_name || user?.email || "Unknown",
    employee_email: employee?.email || user?.email || "",
    correct_count: correct,
    total_questions: total,
    percentage,
    passing_score: passingScore,
    passed: percentage >= passingScore,
    answers: breakdown,
    taken_at: new Date().toISOString(),
  });
}