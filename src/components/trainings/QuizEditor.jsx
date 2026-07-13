import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Circle, CheckCircle2, Sparkles, Loader2, ImagePlus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function QuizEditor({ quiz, onChange, trainingTitle = "", trainingDescription = "", videoUrl = "" }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [uploadingFor, setUploadingFor] = useState(null);

  const addQuestion = () => {
    onChange([...quiz, { id: Date.now().toString() + Math.random(), question: "", options: ["", ""], correct_answer: 0, image_url: "" }]);
  };

  const updateQuestion = (qIdx, field, value) => {
    onChange(quiz.map((q, i) => i === qIdx ? { ...q, [field]: value } : q));
  };

  const addOption = (qIdx) => {
    onChange(quiz.map((q, i) => i === qIdx && q.options.length < 5 ? { ...q, options: [...q.options, ""] } : q));
  };

  const updateOption = (qIdx, oIdx, value) => {
    onChange(quiz.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q));
  };

  const removeOption = (qIdx, oIdx) => {
    onChange(quiz.map((q, i) => {
      if (i !== qIdx) return q;
      if (q.options.length <= 2) return q;
      const newOptions = q.options.filter((_, j) => j !== oIdx);
      const newCorrect = q.correct_answer >= newOptions.length ? 0 : (q.correct_answer > oIdx ? q.correct_answer - 1 : q.correct_answer);
      return { ...q, options: newOptions, correct_answer: newCorrect };
    }));
  };

  const setCorrect = (qIdx, oIdx) => {
    onChange(quiz.map((q, i) => i === qIdx ? { ...q, correct_answer: oIdx } : q));
  };

  const removeQuestion = (qIdx) => {
    onChange(quiz.filter((_, i) => i !== qIdx));
  };

  const handleImageUpload = async (qIdx, file) => {
    if (!file) return;
    setUploadingFor(qIdx);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateQuestion(qIdx, "image_url", file_url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingFor(null);
    }
  };

  const handleAIGenerate = async () => {
    if (!trainingTitle.trim()) return;
    setAiLoading(true);
    try {
      const prompt = `Generate ${aiCount} quiz questions for a training titled "${trainingTitle}".
      ${trainingDescription ? `Description: ${trainingDescription}` : ""}
      ${videoUrl ? `Reference video: ${videoUrl}. Generate questions based on the content of this video.` : ""}
      Each question should have 4 multiple-choice options with exactly one correct answer (0-indexed).
      Make the questions practical and relevant to the topic.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: !!videoUrl,
        model: videoUrl ? "gemini_3_flash" : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" }
                }
              }
            }
          }
        }
      });

      const newQuestions = (res.questions || []).map(q => ({
        id: Date.now().toString() + Math.random(),
        question: q.question,
        options: q.options.slice(0, 5),
        correct_answer: Math.min(q.correct_answer ?? 0, q.options.length - 1),
        image_url: ""
      }));

      onChange([...quiz, ...newQuestions]);
    } catch (err) {
      console.error("AI generation failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-base font-bold">Quiz Questions</Label>
        <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Question
        </Button>
      </div>

      {/* AI Generator */}
      <div className="mb-4 flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <Input
          type="number"
          min="1"
          max="20"
          value={aiCount}
          onChange={e => setAiCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
          className="w-16 h-8 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAIGenerate}
          disabled={aiLoading || !trainingTitle.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 gap-1"
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {aiLoading ? "Generating..." : "AI Generate"}
        </Button>
        {!trainingTitle.trim() && (
          <span className="text-xs text-slate-400">Enter a title first</span>
        )}
      </div>

      <div className="space-y-4">
        {quiz.map((q, qIdx) => (
          <div key={q.id} className="border rounded-lg p-3 bg-slate-50 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm font-bold text-slate-400 mt-2">{qIdx + 1}.</span>
              <Input value={q.question} onChange={e => updateQuestion(qIdx, "question", e.target.value)} placeholder="Question text" className="flex-1" />
              <button type="button" onClick={() => removeQuestion(qIdx)} className="mt-2 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Question Image */}
            <div className="ml-6">
              {q.image_url ? (
                <div className="relative inline-block">
                  <img src={q.image_url} alt="Question" className="max-h-40 rounded-lg border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => updateQuestion(qIdx, "image_url", "")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">
                  {uploadingFor === qIdx ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><ImagePlus className="w-3.5 h-3.5" /> Add Image to Question</>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageUpload(qIdx, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            <div className="space-y-1.5 ml-6">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button type="button" onClick={() => setCorrect(qIdx, oIdx)} className="flex-shrink-0 text-slate-400 hover:text-green-600">
                    {q.correct_answer === oIdx ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1 h-8 text-sm" />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 5 && (
                <button type="button" onClick={() => addOption(qIdx)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-6">
                  + Add Option
                </button>
              )}
              <p className="text-xs text-slate-400 ml-6">
                Correct answer: <span className="font-medium text-green-600">Option {q.correct_answer + 1}</span>
              </p>
            </div>
          </div>
        ))}
        {quiz.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No quiz questions yet. Add manually or use AI to generate.</p>
        )}
      </div>
    </div>
  );
}