import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, GraduationCap, Search, Pencil, Trash2, Loader2, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import TrainingForm from "@/components/trainings/TrainingForm";
import LeanTrainingSection from "@/components/lean-training/LeanTrainingSection";

const CATEGORY_STYLES = {
  area: "bg-blue-100 text-blue-700",
  machine: "bg-purple-100 text-purple-700",
  custom_build: "bg-amber-100 text-amber-700",
  safety: "bg-red-100 text-red-700",
  process: "bg-green-100 text-green-700",
  other: "bg-slate-100 text-slate-600",
};

const CATEGORY_LABELS = {
  area: "Area",
  machine: "Machine",
  custom_build: "Custom Build",
  safety: "Safety",
  process: "Process",
  other: "Other",
};

const DIFFICULTY_STYLES = {
  beginner: "bg-green-50 text-green-600",
  intermediate: "bg-amber-50 text-amber-600",
  advanced: "bg-red-50 text-red-600",
};

export default function Trainings() {
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const queryClient = useQueryClient();

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => base44.entities.Training.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-training"],
    queryFn: () => base44.entities.Employee.filter({ archived: false }),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Training.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Training.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Training.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trainings"] }),
  });

  const handleSave = (data) => {
    if (editingTraining) {
      updateMutation.mutate({ id: editingTraining.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (training) => {
    setEditingTraining(training);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTraining(null);
    setShowForm(true);
  };

  const filtered = trainings.filter(t => {
    const matchesSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-8 h-8 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Trainings</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Create and manage training materials for areas, machines, custom builds, and more</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="mb-6">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="lean">Lean Training</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Training materials for areas, machines, custom builds, and more</p>
              {isAdmin && (
                <Button onClick={handleNew} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0" size="sm">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Training</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search trainings..." className="pl-9" />
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
                <p className="font-medium">No trainings found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(training => (
                  <div key={training.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_STYLES[training.category])}>{CATEGORY_LABELS[training.category]}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", DIFFICULTY_STYLES[training.difficulty])}>{training.difficulty}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleEdit(training)} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => { if (confirm("Delete this training?")) deleteMutation.mutate(training.id); }} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{training.title}</h3>
                    {training.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{training.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {training.estimated_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{training.estimated_time}</span>}
                      {training.video_url && <span className="flex items-center gap-1"><Video className="w-3 h-3" />Video</span>}
                    </div>
                    {training.assigned_to?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-400 mb-1">Assigned to</p>
                        <div className="flex flex-wrap gap-1">
                          {training.assigned_to.slice(0, 3).map(name => <span key={name} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{name}</span>)}
                          {training.assigned_to.length > 3 && <span className="text-xs text-slate-400">+{training.assigned_to.length - 3}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lean" className="mt-4">
            <LeanTrainingSection currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>

      <TrainingForm open={showForm} onOpenChange={setShowForm} editingTraining={editingTraining} employees={employees} onSave={handleSave} />
    </div>
  );
}