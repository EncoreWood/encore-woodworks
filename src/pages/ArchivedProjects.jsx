import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArchiveRestore, ExternalLink, Search, User, MapPin, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  inquiry: "bg-slate-100 text-slate-700",
  quoted: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  in_design: "bg-violet-50 text-violet-700",
  in_production: "bg-amber-50 text-amber-700",
  ready_for_install: "bg-cyan-50 text-cyan-700",
  installing: "bg-orange-50 text-orange-700",
  completed: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-700"
};

const statusLabel = {
  inquiry: "Inquiry", quoted: "Quoted", approved: "Approved",
  in_design: "In Design", in_production: "In Production",
  ready_for_install: "Ready for Install", installing: "Installing",
  completed: "Completed", on_hold: "On Hold"
};

export default function ArchivedProjects() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 0
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.update(id, { archived: false, archived_date: null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });

  const archivedProjects = projects
    .filter(p => p.archived)
    .filter(p => !search || p.project_name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Archived Projects</h1>
          <p className="text-slate-500 mt-1">{archivedProjects.length} archived project{archivedProjects.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-slate-500">Loading...</div>
        ) : archivedProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No archived projects found.</p>
            <Link to={createPageUrl("Kanban")}>
              <Button variant="outline" className="mt-4">Back to Projects</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {archivedProjects.map(project => (
              <Card
                key={project.id}
                className="p-4 bg-white border-0 shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                style={project.card_color ? { borderLeft: `4px solid ${project.card_color}`, backgroundColor: project.card_color + "10" } : {}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{project.project_name}</h3>
                    {project.archived_date && (
                      <p className="text-xs text-slate-400 mt-0.5">Archived {format(new Date(project.archived_date), "MMM d, yyyy")}</p>
                    )}
                  </div>
                  <Link to={createPageUrl("ProjectDetails") + "?id=" + project.id} className="text-slate-400 hover:text-amber-600 ml-2 flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 mb-3">
                  {project.client_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.client_name}</span>
                    </div>
                  )}
                  {project.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}
                  {project.actual_completion && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>Completed {format(new Date(project.actual_completion), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {project.estimated_budget && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 flex-shrink-0" />
                      <span>${project.estimated_budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={`text-xs border-0 ${statusConfig[project.status] || "bg-slate-100 text-slate-700"}`}>
                    {statusLabel[project.status] || project.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => unarchiveMutation.mutate(project.id)}
                    disabled={unarchiveMutation.isPending}
                  >
                    <ArchiveRestore className="w-3 h-3" />
                    Restore
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}