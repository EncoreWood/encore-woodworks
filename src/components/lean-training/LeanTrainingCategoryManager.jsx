import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown } from "lucide-react";

export default function LeanTrainingCategoryManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["leanTrainingCategories"],
    queryFn: () => base44.entities.LeanTrainingCategory.list("sort_order"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.LeanTrainingCategory.create({ name, sort_order: categories.length }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leanTrainingCategories"] }); setNewName(""); },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, oldName, newName }) => {
      await base44.entities.LeanTrainingCategory.update(id, { name: newName });
      if (oldName !== newName) {
        await base44.entities.LeanTraining.updateMany({ category: oldName }, { $set: { category: newName } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leanTrainingCategories"] });
      queryClient.invalidateQueries({ queryKey: ["leanTrainings"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeanTrainingCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leanTrainingCategories"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }) => {
      const sorted = [...categories];
      const idx = sorted.findIndex(c => c.id === id);
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[newIdx];
      await base44.entities.LeanTrainingCategory.bulkUpdate([
        { id: a.id, sort_order: b.sort_order },
        { id: b.id, sort_order: a.sort_order },
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leanTrainingCategories"] }),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const handleRename = (cat) => {
    if (!editName.trim() || editName.trim() === cat.name) { setEditingId(null); return; }
    renameMutation.mutate({ id: cat.id, oldName: cat.name, newName: editName.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Manage Sections</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="New section name..."
              autoFocus
            />
            <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {categories.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No sections yet</p>
            )}
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRename(cat); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      className="h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleRename(cat)} className="h-8 w-8 p-0 text-green-600">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => reorderMutation.mutate({ id: cat.id, direction: "up" })} disabled={idx === 0} className="h-8 w-8 p-0">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => reorderMutation.mutate({ id: cat.id, direction: "down" })} disabled={idx === categories.length - 1} className="h-8 w-8 p-0">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="h-8 w-8 p-0 text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${cat.name}"? Trainings in this section will keep their value.`)) deleteMutation.mutate(cat.id); }} className="h-8 w-8 p-0 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Renaming a section updates all trainings using it.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}