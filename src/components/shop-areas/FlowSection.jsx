import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Workflow } from "lucide-react";
import SectionTile from "./SectionTile";
import Flow from "@/pages/Flow";

/**
 * Shop Flow tile for a single shop area. Opens the flow board in a full-screen
 * overlay inside the area page — no navigation — with an exit button to leave.
 */
export default function FlowSection({ area, section }) {
  const [open, setOpen] = useState(false);

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["shopFlows"],
    queryFn: () => base44.entities.ShopFlow.list(),
    staleTime: 15000,
  });

  return (
    <>
      <SectionTile
        sectionKey={section.key}
        icon={section.icon}
        label={section.label}
        count={flows.length}
        countLabel={`${flows.length} flow${flows.length === 1 ? "" : "s"}`}
        loading={isLoading}
        onClick={() => setOpen(true)}
      />

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex items-center justify-between gap-2 px-3 h-12 border-b border-slate-700 bg-slate-900 text-white flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Workflow className="w-4 h-4 flex-shrink-0 text-sky-400" />
              <span className="text-sm font-semibold truncate">{area} · Shop Flow</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex-shrink-0"
            >
              <X className="w-4 h-4" /> Exit
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <Flow embedded />
          </div>
        </div>
      )}
    </>
  );
}