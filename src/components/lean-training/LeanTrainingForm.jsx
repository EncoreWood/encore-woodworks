import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuizEditor from "@/components/trainings/QuizEditor";

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

          <QuizEditor
            quiz={form.quiz}
            onChange={(quiz) => setForm({ ...form, quiz })}
            trainingTitle={form.title}
            trainingDescription={form.description}
            videoUrl={form.video_url}
          />
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