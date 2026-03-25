import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, ArrowLeftRight, Briefcase, CheckCircle2 } from "lucide-react";

const SPECIAL_CATEGORIES = ["Group Lean", "Maintenance", "Individual Lean", "Training", "General"];

const CATEGORY_COLORS = {
  "Group Lean": "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100",
  "Maintenance": "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100",
  "Individual Lean": "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100",
  "Training": "bg-green-50 border-green-300 text-green-700 hover:bg-green-100",
  "General": "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100",
};

const CATEGORY_COLORS_ACTIVE = {
  "Group Lean": "bg-blue-600 border-blue-600 text-white",
  "Maintenance": "bg-orange-600 border-orange-600 text-white",
  "Individual Lean": "bg-purple-600 border-purple-600 text-white",
  "Training": "bg-green-600 border-green-600 text-white",
  "General": "bg-slate-700 border-slate-700 text-white",
};

export default function ClockInModal({ open, onOpenChange, projects, onConfirm, title = "Clock In", confirmLabel = "Clock In", confirmClass = "bg-green-600 hover:bg-green-700" }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const isSwitch = title === "Switch Job" || confirmLabel === "Switch";
  const iconColor = isSwitch ? "text-amber-500" : "text-green-500";
  const Icon = isSwitch ? ArrowLeftRight : Play;

  const handleConfirm = () => {
    if (selectedCategory) {
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
    setSelectedProjectId("");
  };

  const handleProjectChange = (val) => {
    setSelectedProjectId(val);
    setSelectedCategory("");
  };

  const hasSelection = !!selectedCategory || !!selectedProjectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${isSwitch ? "bg-amber-50 border-b border-amber-100" : "bg-green-50 border-b border-green-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSwitch ? "bg-amber-100" : "bg-green-100"}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSwitch ? "Select where you're switching to" : "Select your job or activity"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Quick category chips */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Select</p>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                      isActive ? CATEGORY_COLORS_ACTIVE[cat] : CATEGORY_COLORS[cat]
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 bg-white px-2">or select a project</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Project selector */}
          <div>
            <Select value={selectedProjectId} onValueChange={handleProjectChange} disabled={!!selectedCategory}>
              <SelectTrigger className={`h-11 rounded-xl border-2 font-medium ${selectedCategory ? "opacity-40 cursor-not-allowed" : "border-slate-200 hover:border-slate-300"} ${selectedProjectId ? "border-amber-400 bg-amber-50 text-amber-800" : ""}`}>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Choose a project..." />
                </div>
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

          {/* Footer buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11 border-slate-300"
              onClick={() => { onOpenChange(false); setSelectedProjectId(""); setSelectedCategory(""); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className={`flex-1 rounded-xl h-11 font-semibold gap-2 ${confirmClass} ${!hasSelection ? "opacity-50" : ""}`}
            >
              <Icon className="w-4 h-4" />
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}