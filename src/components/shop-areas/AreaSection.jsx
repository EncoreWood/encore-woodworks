import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShopAreaRecordForm from "./ShopAreaRecordForm";
import SectionTile from "./SectionTile";
import SectionSheet from "./SectionSheet";
import PrivateThumb from "./PrivateThumb";

const STATUS_STYLES = {
  Active: "bg-green-50 text-green-700 border-green-200",
  Complete: "bg-green-50 text-green-700 border-green-200",
  Done: "bg-green-50 text-green-700 border-green-200",
  "In Stock": "bg-green-50 text-green-700 border-green-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Not Started": "bg-slate-100 text-slate-600 border-slate-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Due: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-amber-50 text-amber-700 border-amber-200",
  "Out of Stock": "bg-red-50 text-red-700 border-red-200",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Archived: "bg-slate-100 text-slate-500 border-slate-200",
};

/**
 * One section (Trainings, Lean, Cleaning, …) for a single shop area.
 * Collapsed to a compact tile; clicking it opens the full item list.
 * Owns its own records so each section loads, adds, edits and deletes independently.
 */
export default function AreaSection({ area, section }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const queryKey = ["shopAreaRecords", area, section.key];

  const { data: records = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const rows = await base44.entities.ShopAreaRecord.filter({
        area,
        section: section.key,
      });
      return [...rows].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing
        ? base44.entities.ShopAreaRecord.update(editing.id, values)
        : base44.entities.ShopAreaRecord.create({ ...values, area, section: section.key }),
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

  const openEdit = (record) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleDelete = (record) => {
    if (window.confirm(`Delete "${record.title}"?`)) deleteMutation.mutate(record.id);
  };

  return (
    <>
      <SectionTile
        sectionKey={section.key}
        icon={Icon}
        label={section.label}
        count={records.length}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      <SectionSheet
        open={open}
        onOpenChange={setOpen}
        icon={Icon}
        title={section.label}
        subtitle={`${area} · ${records.length} item${records.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={openNew} size="sm" className="h-9 px-3 bg-amber-600 hover:bg-amber-700 text-xs">
            <Plus className="w-4 h-4" /> Add
          </Button>
        }
      >
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">No {section.label.toLowerCase()} yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {records.map((record) => (
                  <li key={record.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-slate-900 break-words">{record.title}</p>
                          {record.status && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${
                                STATUS_STYLES[record.status] || "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {record.status}
                            </span>
                          )}
                        </div>
                        {record.description && (
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5 whitespace-pre-line">
                            {record.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                          {record.quantity !== undefined && record.quantity !== null && record.quantity !== "" && (
                            <span className="font-medium">
                              {record.quantity}
                              {record.unit ? ` ${record.unit}` : ""}
                            </span>
                          )}
                          {record.owner && <span>{record.owner}</span>}
                          {record.frequency && <span>{record.frequency}</span>}
                          {record.date && <span>{record.date}</span>}
                          {record.checklist?.length > 0 && (
                            <span className="font-medium text-teal-700">
                              {record.checklist.filter((i) => i.done).length}/{record.checklist.length} steps
                            </span>
                          )}
                        </div>
                        {record.images?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {record.images.slice(0, 4).map((img) => (
                              <button
                                key={img.uri}
                                type="button"
                                onClick={() => openEdit(record)}
                                title={img.name}
                              >
                                <PrivateThumb
                                  uri={img.uri}
                                  alt={img.name || "Checklist photo"}
                                  className="w-7 h-7 object-cover rounded border border-slate-200"
                                />
                              </button>
                            ))}
                            {record.images.length > 4 && (
                              <span className="text-[10px] text-slate-500">+{record.images.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record)}
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
          </div>
      </SectionSheet>

      <ShopAreaRecordForm
        open={formOpen}
        onOpenChange={(isOpen) => {
          setFormOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        section={section}
        editing={editing}
        saving={saveMutation.isPending}
        onSave={(values) => saveMutation.mutate(values)}
      />
    </>
  );
}