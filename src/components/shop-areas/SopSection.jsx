import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Loader2, Inbox, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ZoneSopEditor from "@/components/flow/ZoneSopEditor";
import ZoneSopViewer from "@/components/flow/ZoneSopViewer";
import SectionTile from "./SectionTile";

const stepCount = (sop) => (sop.steps || []).length;

/**
 * SOPs for one shop area. Reads and writes the same ShopZoneSOP records the
 * Shop Flow page uses (matched on the zone/area name), so an SOP entered in
 * either place appears in both. Editing reuses the exact Shop Flow SOP form.
 * Collapsed to a compact tile; clicking it opens the full SOP list.
 */
export default function SopSection({ area, section }) {
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const { data: sops = [], isLoading } = useQuery({
    queryKey: ["shopZoneSops", area],
    queryFn: async () => {
      const rows = await base44.entities.ShopZoneSOP.filter({ zone_name: area });
      return [...rows].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  });

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (sop) => {
    setEditing(sop);
    setEditorOpen(true);
  };

  // Keep the existing zone link (id/type) when editing a Flow-created SOP so
  // saving from here never unlinks it from its shop-flow zone.
  const editorZone = editing
    ? { id: editing.zone_id, name: editing.zone_name || area, zone_type: editing.zone_type }
    : null;

  return (
    <>
      <SectionTile
        icon={section.icon}
        label={section.label}
        count={sops.length}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] p-0 gap-0 flex flex-col max-h-[85vh]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 pr-10">
            <section.icon className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <DialogTitle className="text-sm font-bold text-slate-900 flex-1 min-w-0 truncate">
              {section.label}
            </DialogTitle>
            <Button onClick={openNew} size="sm" className="h-7 px-2 bg-amber-600 hover:bg-amber-700 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : sops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Inbox className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">No SOPs yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sops.map((sop) => (
                  <li key={sop.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(sop)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-semibold text-slate-900 break-words">{sop.title}</p>
                        {sop.overview && (
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{sop.overview}</p>
                        )}
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ListChecks className="w-3 h-3" />
                            {stepCount(sop)} step{stepCount(sop) === 1 ? "" : "s"}
                          </span>
                          {sop.required_ppe?.length > 0 && (
                            <span>
                              {sop.required_ppe.length} PPE item{sop.required_ppe.length === 1 ? "" : "s"}
                            </span>
                          )}
                          {sop.zone_name && sop.zone_name !== area && <span>{sop.zone_name}</span>}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(sop)}
                        className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 flex-shrink-0"
                        title="Edit SOP"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ZoneSopViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        zone={viewing ? { id: viewing.zone_id || viewing.id, name: viewing.zone_name || area, icon: "📋" } : null}
        sop={viewing}
        onExitToEdit={() => {
          const sop = viewing;
          setViewing(null);
          if (sop) openEdit(sop);
        }}
      />

      <ZoneSopEditor
        open={editorOpen}
        onOpenChange={(isOpen) => {
          setEditorOpen(isOpen);
          if (!isOpen) setEditing(null);
        }}
        zone={editorZone}
        zoneName={area}
        existingSop={editing}
      />
    </>
  );
}