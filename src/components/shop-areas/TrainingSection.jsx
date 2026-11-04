import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Inbox, Video, ListChecks, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionTile from "./SectionTile";
import SectionSheet from "./SectionSheet";
import TrainingForm from "@/components/trainings/TrainingForm";
import TrainingViewer from "@/components/trainings/TrainingViewer";
import { findMyEmployee } from "@/lib/findMyEmployee";
import ShopAreaTrainingRecords from "./ShopAreaTrainingRecords";

/**
 * The Training section of a shop area. Backed by the real Training entity
 * (name + video + quiz) rather than a flat shop-area record, so employees can
 * watch the video and take the quiz right from the area page.
 * Admins create and manage them; everyone else can take them anytime.
 */
export default function TrainingSection({ area, section }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const queryClient = useQueryClient();
  const queryKey = ["shopAreaTrainings", area];

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  const { data: trainings = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const rows = await base44.entities.Training.filter({ area });
      return [...rows].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  });

  // Trainings that were kept as plain shop-area records (migrated off the old
  // Lean board) are listed alongside the rich Training-entity trainings.
  const { data: areaRecords = [] } = useQuery({
    queryKey: ["shopAreaRecords", area, section.key],
    queryFn: async () => {
      const rows = await base44.entities.ShopAreaRecord.filter({ area, section: section.key });
      return [...rows].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  });

  const totalCount = trainings.length + areaRecords.length;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-training"],
    queryFn: () => base44.entities.Employee.filter({ archived: false }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["trainingCategories"],
    queryFn: () => base44.entities.TrainingCategory.list("sort_order"),
    enabled: isAdmin,
  });

  const myEmployee = findMyEmployee(employees, currentUser?.email);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing
        ? base44.entities.Training.update(editing.id, values)
        : base44.entities.Training.create({ ...values, area }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Training.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (training) => {
    setEditing(training);
    setFormOpen(true);
  };

  const handleDelete = (training) => {
    if (window.confirm(`Delete "${training.title}"?`)) deleteMutation.mutate(training.id);
  };

  const Icon = section.icon;

  return (
    <>
      <SectionTile
        sectionKey={section.key}
        icon={Icon}
        label={section.label}
        count={totalCount}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      <SectionSheet
        open={open}
        onOpenChange={setOpen}
        icon={Icon}
        title={section.label}
        subtitle={`${area} · ${totalCount} training${totalCount === 1 ? "" : "s"}`}
        actions={
          isAdmin ? (
            <Button onClick={openNew} size="sm" className="h-9 px-3 bg-amber-600 hover:bg-amber-700 text-xs">
              <Plus className="w-4 h-4" /> Add
            </Button>
          ) : null
        }
      >
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">No trainings yet</p>
                {isAdmin && <p className="text-[11px] text-slate-400 mt-0.5">Add a name, a video and a quiz.</p>}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {trainings.map((training) => (
                  <li key={training.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(training)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-semibold text-slate-900 break-words">{training.title}</p>
                        {training.description && (
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                            {training.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                          {training.video_url && (
                            <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />Video</span>
                          )}
                          {training.quiz?.length > 0 && (
                            <span className="flex items-center gap-0.5"><ListChecks className="w-3 h-3" />{training.quiz.length} questions</span>
                          )}
                          {training.sections?.length > 0 && (
                            <span>{training.sections.length} section{training.sections.length > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewing(training)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Take training"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEdit(training)}
                              className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(training)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <ShopAreaTrainingRecords
              area={area}
              section={section}
              records={areaRecords}
              showHeading={trainings.length > 0}
            />
          </div>
      </SectionSheet>

      {isAdmin && (
        <TrainingForm
          open={formOpen}
          onOpenChange={(isOpen) => {
            setFormOpen(isOpen);
            if (!isOpen) setEditing(null);
          }}
          editingTraining={editing}
          employees={employees}
          categories={categories}
          onSave={(values) => saveMutation.mutate(values)}
        />
      )}

      <TrainingViewer
        open={!!viewing}
        onOpenChange={(isOpen) => { if (!isOpen) setViewing(null); }}
        training={viewing}
        currentUser={currentUser}
        employee={myEmployee}
      />
    </>
  );
}