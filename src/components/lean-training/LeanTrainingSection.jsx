import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Loader2, Play, CheckCircle2, Video, HelpCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import LeanTrainingForm from "@/components/lean-training/LeanTrainingForm";
import LeanTrainingViewer from "@/components/lean-training/LeanTrainingViewer";

const CATEGORY_STYLES = {
  "5s": "bg-blue-100 text-blue-700",
  kaizen: "bg-purple-100 text-purple-700",
  value_stream: "bg-amber-100 text-amber-700",
  waste_elimination: "bg-red-100 text-red-700",
  standard_work: "bg-green-100 text-green-700",
  continuous_improvement: "bg-indigo-100 text-indigo-700",
  other: "bg-slate-100 text-slate-600",
};

const CATEGORY_LABELS = {
  "5s": "5S",
  kaizen: "Kaizen",
  value_stream: "Value Stream",
  waste_elimination: "Waste Elimination",
  standard_work: "Standard Work",
  continuous_improvement: "Continuous Improvement",
  other: "Other",
};

export default function LeanTrainingSection({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [viewingTraining, setViewingTraining] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["leanTrainings"],
    queryFn: () => base44.entities.LeanTraining.list("-created_date", 200),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["leanCompletions"],
    queryFn: () => base44.entities.LeanTrainingCompletion.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeanTraining.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leanTrainings"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeanTraining.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leanTrainings"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeanTraining.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leanTrainings"] }),
  });

  const handleSave = (data) => {
    if (editingTraining) {
      updateMutation.mutate({ id: editingTraining.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const myCompletions = completions.filter(c => c.employee_email === currentUser?.email);
  const getCompletion = (trainingId) => {
    const myForTraining = myCompletions.filter(c => c.training_id === trainingId);
    if (myForTraining.length === 0) return null;
    return myForTraining.reduce((best, c) => !best || c.score > best.score ? c : best, myForTraining[0]);
  };

  const filtered = trainings.filter(t => {
    const matchesSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Watch training videos and complete quizzes to build your lean skills</p>
        {isAdmin && (
          <Button onClick={() => { setEditingTraining(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0" size="sm">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search lean trainings..." className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCategory("all")} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition", filterCategory === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>All</button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setFilterCategory(key)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition", filterCategory === key ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>{label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No lean trainings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(training => {
            const completion = getCompletion(training.id);
            return (
              <div
                key={training.id}
                onClick={() => setViewingTraining(training)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-!2 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_STYLES[training.category])}>{CATEGORY_LABELS[training.category]}</span>
                    {completion?.passed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passed
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingTraining(training); setShowForm(true); }} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm("Delete this training?")) deleteMutation.mutate(training.id); }} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{training.title}</h3>
                {training.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{training.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Video className="w-3 h-3" />Video</span>
                  {training.quiz?.length > 0 && (
                    <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" />{training.quiz.length} Q</span>
                  )}
                  {completion && (
                    <span className={cn("flex items-center gap-1 font-medium", completion.passed ? "text-green-600" : "text-amber-600")}>
                      {completion.score}%
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {completion ? `Best score: ${completion.score}%` : "Not started"}
                  </span>
                  <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                    <Play className="w-3 h-3" /> Start
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeanTrainingForm
        open={showForm}
        onOpenChange={setShowForm}
        editingTraining={editingTraining}
        onSave={handleSave}
      />
      <LeanTrainingViewer
        open={!!viewingTraining}
        onOpenChange={(open) => { if (!open) setViewingTraining(null); }}
        training={viewingTraining}
        currentUser={currentUser}
      />
    </div>
  );
}