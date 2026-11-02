import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Inbox, Clock, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionTile from "./SectionTile";
import SectionSheet from "./SectionSheet";
import PrivateThumb from "./PrivateThumb";
import LeanProjectForm from "./LeanProjectForm";

const STATUS_STYLES = {
  Idea: "bg-slate-100 text-slate-600 border-slate-200",
  Planned: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Complete: "bg-green-50 text-green-700 border-green-200",
};

const money = (value) =>
  value === null || value === undefined || value === ""
    ? null
    : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Lean projects for one shop area: overview, status, estimated time saved,
 * implementation cost, assigned person and pictures.
 */
export default function LeanSection({ area, section }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const queryKey = ["shopAreaRecords", area, "lean"];

  const { data: projects = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const rows = await base44.entities.ShopAreaRecord.filter({ area, section: "lean" });
      return [...rows].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-lean"],
    queryFn: () => base44.entities.Employee.filter({ archived: false }),
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing
        ? base44.entities.ShopAreaRecord.update(editing.id, values)
        : base44.entities.ShopAreaRecord.create({ ...values, area, section: "lean" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShopAreaRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const Icon = section.icon;

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setFormOpen(true);
  };

  const handleDelete = (project) => {
    if (window.confirm(`Delete "${project.title}"?`)) deleteMutation.mutate(project.id);
  };

  return (
    <>
      <SectionTile
        sectionKey={section.key}
        icon={Icon}
        label={section.label}
        count={projects.length}
        countLabel={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      <SectionSheet
        open={open}
        onOpenChange={setOpen}
        icon={Icon}
        title={section.label}
        subtitle={`${area} · ${projects.length} project${projects.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={openNew} size="sm" className="h-9 px-3 bg-amber-600 hover:bg-amber-700 text-xs">
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
            <p className="text-xs text-slate-400">No lean projects yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Add an idea, its time savings and cost.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {projects.map((project) => (
              <li key={project.id} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => openEdit(project)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 break-words">{project.title}</p>
                      {project.status && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${
                            STATUS_STYLES[project.status] || "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {project.status}
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-[11px] text-slate-500 leading-snug mt-1 whitespace-pre-line">
                        {project.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mt-1.5">
                      {project.estimated_time_saved && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {project.estimated_time_saved}
                        </span>
                      )}
                      {money(project.project_cost) && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <DollarSign className="w-3 h-3 text-amber-600" />
                          {money(project.project_cost).replace("$", "")}
                        </span>
                      )}
                      {project.owner && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {project.owner}
                        </span>
                      )}
                    </div>

                    {project.images?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {project.images.slice(0, 4).map((img) => (
                          <PrivateThumb
                            key={img.uri}
                            uri={img.uri}
                            alt={img.name || "Lean project photo"}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                          />
                        ))}
                        {project.images.length > 4 && (
                          <span className="text-[10px] text-slate-500">+{project.images.length - 4}</span>
                        )}
                      </div>
                    )}
                  </button>

                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(project)}
                      className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionSheet>

      <LeanProjectForm
        open={formOpen}
        onOpenChange={(isOpen) => {
          setFormOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        editing={editing}
        saving={saveMutation.isPending}
        employees={employees}
        onSave={(values) => saveMutation.mutate(values)}
      />
    </>
  );
}