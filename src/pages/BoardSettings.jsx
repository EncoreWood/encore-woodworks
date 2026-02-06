import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Edit2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function BoardSettings() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({ name: "", order: 0 });
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["boardGroups"],
    queryFn: () => base44.entities.BoardGroup.list('-order'),
    initialData: []
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.BoardGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardGroups"] });
      resetForm();
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BoardGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardGroups"] });
      resetForm();
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => base44.entities.BoardGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardGroups"] });
    }
  });

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const reorderedGroups = Array.from(groups);
    const [movedGroup] = reorderedGroups.splice(source.index, 1);
    reorderedGroups.splice(destination.index, 0, movedGroup);

    reorderedGroups.forEach((group, index) => {
      updateGroupMutation.mutate({ id: group.id, data: { order: index } });
    });
  };

  const resetForm = () => {
    setFormData({ name: "", order: 0 });
    setEditingGroup(null);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: { name: formData.name }
      });
    } else {
      createGroupMutation.mutate({
        name: formData.name,
        boards: [],
        order: groups.length
      });
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({ name: group.name, order: group.order });
    setShowDialog(true);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Board Groups</h1>
        <p className="text-slate-600">Manage and organize your board groups</p>
      </div>

      <Button onClick={() => setShowDialog(true)} className="mb-6">
        <Plus className="w-4 h-4 mr-2" /> Add Group
      </Button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="groups">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {groups.map((group, index) => (
                <Draggable key={group.id} draggableId={group.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${snapshot.isDragging ? "bg-amber-50" : "bg-white"} border border-slate-200 rounded-lg p-4 transition-all`}
                    >
                      <div className="flex items-center gap-4">
                        <div {...provided.dragHandleProps} className="text-slate-400">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{group.name}</h3>
                          <p className="text-sm text-slate-600">{group.boards?.length || 0} boards</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGroupMutation.mutate(group.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Admins"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}