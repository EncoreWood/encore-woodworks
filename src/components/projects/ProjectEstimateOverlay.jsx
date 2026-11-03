import { useEffect } from "react";
import { createPortal } from "react-dom";
import BidWorkspace from "@/components/bidding/BidWorkspace";
import OnsiteBidWorkspace from "@/components/bidding/OnsiteBidWorkspace";
import RoomBasedEstimateWorkspace from "@/components/bidding/roombased/RoomBasedEstimateWorkspace";
import { useTabStripBottom } from "@/hooks/useTabStripBottom";

/**
 * Opens an estimate editor in place, on top of the page it was launched from
 * (a project card). Rendered through a portal so the fixed overlay is not
 * clipped by the page's transformed/animated wrapper — the project card stays
 * mounted and untouched underneath, so closing this returns to the exact same
 * project state (scroll, expanded sections, active tab).
 */
export default function ProjectEstimateOverlay({ project, template, bidId, onClose, onSaved }) {
  const stripTop = useTabStripBottom();
  // Keep the project card underneath exactly where it is (scroll position holds).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const workspace = (() => {
    if (template === "room_based") {
      return (
        <RoomBasedEstimateWorkspace
          bidId={bidId}
          project={!bidId ? project : undefined}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    }
    if (template === "onsite") {
      return (
        <OnsiteBidWorkspace
          bidId={bidId}
          project={!bidId ? project : undefined}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    }
    return (
      <BidWorkspace
        bidId={bidId}
        project={!bidId ? project : undefined}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  })();

  if (typeof document === "undefined") return workspace;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900/50 sm:p-4 flex items-stretch sm:items-center justify-center" style={{ top: stripTop }}>
      <div className="w-full sm:max-w-[1500px] h-full sm:h-[calc(100%-1rem)] overflow-y-auto bg-slate-50 sm:rounded-xl shadow-2xl">
        {workspace}
      </div>
    </div>,
    document.body
  );
}