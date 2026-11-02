import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, ListChecks, GraduationCap } from "lucide-react";
import QuizEditor from "@/components/trainings/QuizEditor";
import SectionsEditor from "@/components/trainings/SectionsEditor";

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  difficulty: "beginner",
  estimated_time: "",
  video_url: "",
  content: "",
  assigned_to: [],
  quiz: [],
  sections: [],
  passing_score: 80,
  status: "active",
};

export default function TrainingForm({ open, onOpenChange, editingTraining, employees, categories = [], onSave, defaultCategory }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingTraining) {
      setForm({
        title: editingTraining.title || "",
        description: editingTraining.description || "",
        category: editingTraining.category || "",
        difficulty: editingTraining.difficulty || "beginner",
        estimated_time: editingTraining.estimated_time || "",
        video_url: editingTraining.video_url || "",
        content: editingTraining.content || "",
        assigned_to: editingTraining.assigned_to || [],
        quiz: editingTraining.quiz || [],
        sections: editingTraining.sections || [],
        passing_score: editingTraining.passing_score ?? 80,
        status: editingTraining.status || "active",
      });
    } else {
      setForm({ ...EMPTY_FORM, category: defaultCategory || "" });
    }
  }, [editingTraining, open, defaultCategory]);

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
    const cleanSections = (form.sections || [])
      .filter(s => s.title.trim() || s.video_url.trim() || s.content.trim() || (s.quiz || []).length > 0)
      .map(s => ({
        ...s,
        id: s.id || Date.now().toString() + Math.random(),
        title: s.title.trim(),
        quiz: (s.quiz || [])
          .filter(q => q.question.trim() && q.options.filter(o => o.trim()).length >= 2)
          .map(q => ({
            ...q,
            id: q.id || Date.now().toString() + Math.random(),
            question: q.question.trim(),
            options: q.options.filter(o => o.trim()).map(o => o.trim()),
            correct_answer: Math.min(q.correct_answer, q.options.filter(o => o.trim()).length - 1),
          })),
      }));
    onSave({ ...form, quiz: cleanQuiz, sections: cleanSections });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            {editingTraining ? "Edit Training" : "Add Training"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1 · Name */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">1 · Training name</p>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Table Saw Operation"
              />
              <p className="text-xs text-slate-400 mt-1">This is the name employees see in their Trainings list.</p>
            </div>
            <div>
              <Label>Short description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What this training covers"
                rows={2}
              />
            </div>
          </section>

          {/* 2 · Video */}
          <section className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Video className="w-3.5 h-3.5" /> 2 · Video
            </p>
            <div>
              <Label>Video link</Label>
              <Input
                value={form.video_url}
                onChange={e => setForm({ ...form, video_url: e.target.value })}
                placeholder="YouTube, Vimeo, or a direct .mp4 link"
              />
              <p className="text-xs text-slate-400 mt-1">Leave blank for a quiz-only training. More videos can be added as sections below.</p>
            </div>
          </section>

          {/* 3 · Quiz */}
          <section className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" /> 3 · Quiz
            </p>
            <div className="w-40">
              <Label>Passing score (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.passing_score}
                onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 80 })}
              />
            </div>
            <QuizEditor
              quiz={form.quiz}
              onChange={(quiz) => setForm({ ...form, quiz })}
              trainingTitle={form.title}
              trainingDescription={form.description}
              videoUrl={form.video_url}
            />
          </section>

          {/* Optional details */}
          <section className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Optional details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>)}
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
            <div>
              <Label>Estimated time</Label>
              <Input
                value={form.estimated_time}
                onChange={e => setForm({ ...form, estimated_time: e.target.value })}
                placeholder="e.g., 30 min"
              />
            </div>
            <div>
              <Label>Written material / steps</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Detailed training material, steps, safety notes, etc."
                rows={3}
              />
            </div>

            <SectionsEditor
              sections={form.sections}
              onChange={(sections) => setForm({ ...form, sections })}
              trainingTitle={form.title}
            />

            <div>
              <Label>Assigned to</Label>
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
          </section>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {editingTraining ? "Save" : "Create training"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}