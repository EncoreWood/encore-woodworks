import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, User } from "lucide-react";
import ShopAreaRecordForm from "./ShopAreaRecordForm";

// Training notes migrated from the old Lean board were saved with the lean
// vocabulary. Show the training vocabulary instead of the raw string.
const STATUS_ALIASES = {
  Idea: "Not Started",
  Planned: "Not Started",
  Draft: "Not Started",
};

const STATUS_STYLES = {
  "Not Started": "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Complete: "bg-green-50 text-green-700 border-green-200",
};

const displayStatus = (status) => STATUS_ALIASES[status] || status;

/**
 * Plain training records kept on the shop area itself (ShopAreaRecord rows with
 * section "training"), listed under the rich Training-entity trainings.
 */
export default function ShopAreaTrainingRecords({ area, section, records, showHeading }) {
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const queryKey = ["shopAreaRecords", area, section.key];

  const saveMutation = useMutation({
    mutationFn: (values) => base44.entities.ShopAreaRecord.update(editing.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShopAreaRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (records.length === 0) return null;

  return (
    <>
      {showHeading && (
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Shop area notes
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {records.map((record) => (
          <li key={record.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors group">
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => setEditing(record)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-slate-900 break-words">{record.title}</p>
                  {record.status && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${
                        STATUS_STYLES[displayStatus(record.status)] || STATUS_STYLES["Not Started"]
                      }`}
                    >
                      {displayStatus(record.status)}
                    </span>
                  )}
                </div>
                {record.description && (
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5 whitespace-pre-line">
                    {record.description}
                  </p>
                )}
                {record.owner && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                    <User className="w-3 h-3 text-slate-400" />
                    {record.owner}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditing(record)}
                  className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${record.title}"?`)) deleteMutation.mutate(record.id);
                  }}
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

      <ShopAreaRecordForm
        open={!!editing}
        onOpenChange={(isOpen) => { if (!isOpen) setEditing(null); }}
        section={section}
        editing={editing}
        saving={saveMutation.isPending}
        onSave={(values) => saveMutation.mutate(values)}
      />
    </>
  );
}