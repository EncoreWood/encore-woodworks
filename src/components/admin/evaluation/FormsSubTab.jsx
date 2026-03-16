import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";

const QUESTION_TYPES = ["Rating 1-5", "Rating 1-10", "Yes/No", "Text", "Multiple Choice"];
const QUESTION_CATEGORIES = ["Performance", "Communication", "Teamwork", "Reliability", "Growth", "Other"];

export default function FormsSubTab() {
  const queryClient = useQueryClient();
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "Rating 1-5",
    category: "Performance",
    is_active: true,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["reviewQuestions"],
    queryFn: () => base44.entities.ReviewQuestion.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReviewQuestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewQuestions"] });
      setNewQuestion({ question_text: "", question_type: "Rating 1-5", category: "Performance", is_active: true });
      setShowNewQuestion(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ReviewQuestion.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewQuestions"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReviewQuestion.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviewQuestions"] }),
  });

  const handleSave = () => {
    if (newQuestion.question_text.trim()) {
      if (editingId) {
        updateMutation.mutate({ id: editingId, ...newQuestion });
      } else {
        createMutation.mutate(newQuestion);
      }
    }
  };

  const handleEdit = (q) => {
    setEditingId(q.id);
    setNewQuestion({
      question_text: q.question_text,
      question_type: q.question_type,
      category: q.category,
      is_active: q.is_active,
    });
    setShowNewQuestion(true);
  };

  // Group by category
  const grouped = {};
  questions.forEach(q => {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  });

  return (
    <div className="space-y-6">
      {!showNewQuestion && (
        <Button onClick={() => setShowNewQuestion(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Add Question
        </Button>
      )}

      {showNewQuestion && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Question" : "Add New Question"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Question text"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={newQuestion.question_type} onValueChange={(val) => setNewQuestion({ ...newQuestion, question_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newQuestion.category} onValueChange={(val) => setNewQuestion({ ...newQuestion, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Save</Button>
              <Button variant="outline" onClick={() => { setShowNewQuestion(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([category, cats]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cats.map(q => (
              <div key={q.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{q.question_text}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.question_type}</p>
                </div>
                <div className="flex gap-1 ml-3">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(q)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(q.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}