import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";

export default function ClockInModal({ open, onOpenChange, projects, onConfirm, title = "Clock In", confirmLabel = "Clock In", confirmClass = "bg-green-600 hover:bg-green-700" }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const handleConfirm = () => {
    const project = projects.find(p => p.id === selectedProjectId);
    onConfirm({ project_id: selectedProjectId || null, project_name: project?.project_name || null });
    setSelectedProjectId("");
    onOpenChange(false);
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
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Select Project (optional)</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} className={confirmClass}>{confirmLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}