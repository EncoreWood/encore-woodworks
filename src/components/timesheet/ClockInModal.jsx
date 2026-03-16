import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";

const SPECIAL_CATEGORIES = ["Group Lean", "Maintenance", "Individual Lean", "Training", "General"];

export default function ClockInModal({ open, onOpenChange, projects, onConfirm, title = "Clock In", confirmLabel = "Clock In", confirmClass = "bg-green-600 hover:bg-green-700" }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleConfirm = () => {
    if (selectedCategory) {
      // Special category clock-in
      onConfirm({ project_id: null, project_name: selectedCategory, category: selectedCategory });
    } else {
      const project = projects.find(p => p.id === selectedProjectId);
      onConfirm({ project_id: selectedProjectId || null, project_name: project?.project_name || null, category: null });
    }
    setSelectedProjectId("");
    setSelectedCategory("");
    onOpenChange(false);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat === selectedCategory ? "" : cat);
    setSelectedProjectId(""); // clear project when category selected
  };

  const handleProjectChange = (val) => {
    setSelectedProjectId(val);
    setSelectedCategory(""); // clear category when project selected
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Special categories */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Quick Categories</label>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            <span>or select a project</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Project selector */}
          <div>
            <Select value={selectedProjectId} onValueChange={handleProjectChange} disabled={!!selectedCategory}>
              <SelectTrigger className={selectedCategory ? "opacity-40" : ""}>
                <SelectValue placeholder="— No project / General —" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={null}>— No project / General —</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                    {p.client_name ? ` · ${p.client_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { onOpenChange(false); setSelectedProjectId(""); setSelectedCategory(""); }}>Cancel</Button>
            <Button onClick={handleConfirm} className={confirmClass}>{confirmLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}