import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

export default function CategoryManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("sort_order"),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.InventoryCategory.create({ name, sort_order: categories.length }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventoryCategories"] }); setNewName(""); },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, oldName, newName }) => {
      await base44.entities.InventoryCategory.update(id, { name: newName });
      if (oldName !== newName) {
        await base44.entities.Inventory.updateMany({ category: oldName }, { $set: { category: newName } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCategories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventoryCategories"] }),
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
        <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="New category name..."
              autoFocus
            />
            <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-amber-600 hover:bg-amber-700 gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {categories.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No categories yet</p>
            )}
            {categories.map(cat => (
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
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="h-8 w-8 p-0 text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${cat.name}"? Items with this category will keep their value.`)) deleteMutation.mutate(cat.id); }} className="h-8 w-8 p-0 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Renaming a category updates all items using it.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}