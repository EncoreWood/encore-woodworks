import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "5s", label: "5S" },
  { value: "kaizen", label: "Kaizen" },
  { value: "value_stream", label: "Value Stream" },
  { value: "waste_elimination", label: "Waste Elimination" },
  { value: "standard_work", label: "Standard Work" },
  { value: "continuous_improvement", label: "Continuous Improvement" },
  { value: "other", label: "Other" },
];

export default function LeanTrainingForm({ open, onOpenChange, editingTraining, onSave }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "5s",
    video_url: "",
    passing_score: 80,
    status: "active",
    quiz: [],
  });

  useEffect(() => {
    if (editingTraining) {
      setForm({
        title: editingTraining.title || "",
        description: editingTraining.description || "",
        category: editingTraining.category || "5s",
        video_url: editingTraining.video_url || "",
        passing_score: editingTraining.passing_score ?? 80,
        status: editingTraining.status || "active",
        quiz: editingTraining.quiz || [],
      });
    } else {
      setForm({
        title: "",
        description: "",
        category: "5s",
        video_url: "",
        passing_score: 80,
        status: "active",
        quiz: [],
      });
    }
  }, [editingTraining, open]);

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      quiz: [...f.quiz, { id: Date.now().toString() + Math.random(), question: "", options: ["", ""], correct_answer: 0 }],
    }));
  };

  const updateQuestion = (qIdx, value) => {
    setForm(f => ({
      ...f,
      quiz: f.quiz.map((q, i) => i === qIdx ? { ...q, question: value } : q),
    }));
  };

  const addOption = (qIdx) => {
    setForm(f => ({
      ...f,
      quiz: f.quiz.map((q, i) => i === qIdx && q.options.length < 5
        ? { ...q, options: [...q.options, ""] }
        : q),
    }));
  };

  const updateOption = (qIdx, oIdx, value) => {
    setForm(f => ({
      ...f,
      quiz: f.quiz.map((q, i) => i === qIdx
        ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) }
        : q),
    }));
  };

  const removeOption = (qIdx, oIdx) => {
    setForm(f => ({
      ...f,
      quiz: f.quiz.map((q, i) => {
        if (i !== qIdx) return q;
        if (q.options.length <= 2) return q;
        const newOptions = q.options.filter((_, j) => j !== oIdx);
        const newCorrect = q.correct_answer >= newOptions.length ? 0 : (q.correct_answer > oIdx ? q.correct_answer - 1 : q.correct_answer);
        return { ...q, options: newOptions, correct_answer: newCorrect };
      }),
    }));
  };

  const setCorrect = (qIdx, oIdx) => {
    setForm(f => ({
      ...f,
      quiz: f.quiz.map((q, i) => i === qIdx ? { ...q, correct_answer: oIdx } : q),
    }));
  };

  const removeQuestion = (qIdx) => {
    setForm(f => ({ ...f, quiz: f.quiz.filter((_, i) => i !== qIdx) }));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.video_url.trim()) return;
    const cleanQuiz = form.quiz
      .filter(q => q.question.trim() && q.options.filter(o => o.trim()).length >= 2)
      .map(q => ({
        ...q,
        id: q.id || Date.now().toString() + Math.random(),
        question: q.question.trim(),
        options: q.options.filter(o => o.trim()).map(o => o.trim()),
        correct_answer: Math.min(q.correct_answer, q.options.filter(o => o.trim()).length - 1),
      }));
    onSave({ ...form, quiz: cleanQuiz });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTraining ? "Edit Lean Training" : "New Lean Training"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., 5S Fundamentals" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What this training covers" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input type="number" min="1" max="100" value={form.passing_score} onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 80 })} />
            </div>
          </div>
          <div>
            <Label>Video URL *</Label>
            <Input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="YouTube, Vimeo, or direct video file URL" />
          </div>

          {/* Quiz Editor */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-bold">Quiz Questions</Label>
              <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </Button>
            </div>
            <div className="space-y-4">
              {form.quiz.map((q, qIdx) => (
                <div key={q.id} className="border rounded-lg p-3 bg-slate-50 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-bold text-slate-400 mt-2">{qIdx + 1}.</span>
                    <Input value={q.question} onChange={e => updateQuestion(qIdx, e.target.value)} placeholder="Question text" className="flex-1" />
                    <button type="button" onClick={() => removeQuestion(qIdx)} className="mt-2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              {form.quiz.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No quiz questions yet. Click "Add Question" to create a quiz.</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.video_url.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {editingTraining ? "Save" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}