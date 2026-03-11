import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import ProjectSelector from "@/components/presentations/ProjectSelector";

const statusColors = {
  draft: "bg-slate-100 text-slate-800",
  ready: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
};

export default function Presentations() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const { data: presentations = [] } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => base44.entities.Presentation.list("-created_date"),
  });

  const handleProjectSelected = async (project) => {
    setSelectedProject(project);
    setShowNewDialog(false);
    // Navigate to editor with project data
    window.location.href = createPageUrl(`PresentationEditor?projectId=${project.id}`);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this presentation?")) {
      await base44.entities.Presentation.delete(id);
      // Refresh
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Presentations</h1>
            <p className="text-slate-600 mt-1">Create and manage 3D design presentations</p>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Presentation
          </Button>
        </div>

        {/* Presentations Grid */}
        {presentations.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No presentations yet</p>
            <Button
              onClick={() => setShowNewDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create your first presentation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((pres) => (
              <div
                key={pres.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{pres.project_name}</h3>
                      <p className="text-sm text-slate-600">{pres.client_name}</p>
                    </div>
                    <Badge className={statusColors[pres.status]}>
                      {pres.status === "draft" && "Draft"}
                      {pres.status === "ready" && "Ready"}
                      {pres.status === "sent" && "Sent"}
                    </Badge>
                  </div>

                  {pres.address && (
                    <p className="text-xs text-slate-500 mb-4">{pres.address}</p>
                  )}

                  {pres.sent_date && (
                    <p className="text-xs text-slate-500 mb-4">
                      Sent: {format(new Date(pres.sent_date), "MMM d, yyyy")}
                    </p>
                  )}

                  <div className="text-xs text-slate-500 mb-4">
                    Created: {format(new Date(pres.created_date), "MMM d, yyyy")}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={createPageUrl(`PresentationEditor?id=${pres.id}`)}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                    </Link>
                    <Link
                      to={createPageUrl(`PresentationView?id=${pres.id}`)}
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pres.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Presentation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Presentation</DialogTitle>
          </DialogHeader>
          <ProjectSelector onProjectSelected={handleProjectSelected} />
        </DialogContent>
      </Dialog>
    </div>
  );
}