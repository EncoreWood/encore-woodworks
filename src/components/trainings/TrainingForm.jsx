import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuizEditor from "@/components/trainings/QuizEditor";

const CATEGORIES = [
  { value: "area", label: "Area" },
  { value: "machine", label: "Machine" },
  { value: "custom_build", label: "Custom Build" },
  { value: "safety", label: "Safety" },
  { value: "process", label: "Process" },
  { value: "other", label: "Other" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function TrainingForm({ open, onOpenChange, editingTraining, employees, onSave }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "machine",
    difficulty: "beginner",
    estimated_time: "",
    video_url: "",
    content: "",
    assigned_to: [],
    quiz: [],
    passing_score: 80,
    status: "active",
  });

  useEffect(() => {
    if (editingTraining) {
      setForm({
        title: editingTraining.title || "",
        description: editingTraining.description || "",
        category: editingTraining.category || "machine",
        difficulty: editingTraining.difficulty || "beginner",
        estimated_time: editingTraining.estimated_time || "",
        video_url: editingTraining.video_url || "",
        content: editingTraining.content || "",
        assigned_to: editingTraining.assigned_to || [],
        quiz: editingTraining.quiz || [],
        passing_score: editingTraining.passing_score ?? 80,
        status: editingTraining.status || "active",
      });
    } else {
      setForm({
        title: "",
        description: "",
        category: "machine",
        difficulty: "beginner",
        estimated_time: "",
        video_url: "",
        content: "",
        assigned_to: [],
        quiz: [],
        passing_score: 80,
        status: "active",
      });
    }
  }, [editingTraining, open]);

  const toggleEmployee = (name) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(name)
        ? prev.assigned_to.filter(n => n !== name)
        : [...prev.assigned_to, name]
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTraining ? "Edit Training" : "New Training"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Table Saw Operation" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of what this training covers" rows={2} />
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
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated Time</Label>
              <Input value={form.estimated_time} onChange={e => setForm({ ...form, estimated_time: e.target.value })} placeholder="e.g., 30 min" />
            </div>
            <div>
              <Label>Video URL</Label>
              <Input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label>Training Content / Steps</Label>
            <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Detailed training material, steps, safety notes, etc." rows={4} />
          </div>
          <div>
            <Label>Passing Score (%)</Label>
            <Input type="number" min="1" max="100" value={form.passing_score} onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 80 })} />
          </div>

          <QuizEditor
            quiz={form.quiz}
            onChange={(quiz) => setForm({ ...form, quiz })}
            trainingTitle={form.title}
            trainingDescription={form.description}
            videoUrl={form.video_url}
          />

          <div>
            <Label>Assigned To</Label>
            <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-0.5">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                  <input type="checkbox" checked={form.assigned_to.includes(emp.full_name)} onChange={() => toggleEmployee(emp.full_name)} className="rounded" />
                  <span className="text-sm">{emp.full_name}</span>
                </label>
              ))}
              {employees.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No employees found</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim()} className="bg-indigo-600 hover:bg-indigo-700">{editingTraining ? "Save" : "Create"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}