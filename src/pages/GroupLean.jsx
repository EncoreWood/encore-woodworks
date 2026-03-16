import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Calendar } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800"
};

const priorityColors = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800"
};

const categories = ["Maintenance", "Group Lean", "Individual Lean", "Training"];

export default function GroupLean() {
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Maintenance");
  const [formData, setFormData] = useState({ title: "", status: "open", priority: "medium", assigned_to: "", due_date: "" });

  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["groupLeanItems"],
    queryFn: () => base44.entities.GroupLeanItem.list("-created_date", 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupLeanItem.create({
      ...data,
      category: selectedCategory
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupLeanItems"] });
      setShowForm(false);
      setFormData({ title: "", status: "open", priority: "medium", assigned_to: "", due_date: "" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GroupLeanItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupLeanItems"] });
      setEditingId(null);
      setFormData({ title: "", status: "open", priority: "medium", assigned_to: "", due_date: "" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GroupLeanItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupLeanItems"] })
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setSelectedCategory(item.category);
    setFormData({ title: item.title, status: item.status, priority: item.priority, assigned_to: item.assigned_to, due_date: item.due_date });
    setShowForm(true);
  };

  const filteredItems = items.filter(i => i.category === selectedCategory);
  const statuses = ["open", "in_progress", "completed"];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Group Lean Board</h1>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-amber-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-amber-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statuses.map(status => {
            const statusItems = filteredItems.filter(i => i.status === status);
            const statusLabel = status === "open" ? "Open" : status === "in_progress" ? "In Progress" : "Completed";
            return (
              <div key={status} className="flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">{statusLabel}</h2>
                  <Badge variant="outline">{statusItems.length}</Badge>
                </div>
                <div className="space-y-3 flex-1">
                  {statusItems.map(item => (
                    <Card key={item.id} className="p-4 hover:shadow-md transition-all">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">{item.title}</h3>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-slate-100 rounded">
                              <Edit2 className="w-3 h-3 text-slate-500" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 hover:bg-red-100 rounded">
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge className={`text-xs ${statusColors[status]}`}>{statusLabel}</Badge>
                          <Badge className={`text-xs ${priorityColors[item.priority]}`}>{item.priority}</Badge>
                        </div>
                        {item.assigned_to && <p className="text-xs text-slate-600">👤 {item.assigned_to}</p>}
                        {item.due_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(item.due_date), "MMM d")}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ title: "", status, priority: "medium", assigned_to: "", due_date: "" });
                      setShowForm(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50 transition-all text-slate-600 hover:text-amber-700 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Item" : "New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Item title"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <Select value={formData.priority} onValueChange={val => setFormData({ ...formData, priority: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Assigned To</label>
              <Input
                value={formData.assigned_to}
                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Name or email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700" disabled={!formData.title.trim()}>
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}