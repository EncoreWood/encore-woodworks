import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StickyNote, Loader2 } from "lucide-react";

/**
 * Shows the internal Room Notes (project.rooms[].notes) for a given room,
 * opened from a production card.
 */
export default function RoomNotesModal({ projectId, roomName, onClose }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.get(projectId),
    enabled: !!projectId,
  });

  const room = (project?.rooms || []).find(
    r => (r.room_name || "").toLowerCase() === (roomName || "").toLowerCase()
  );
  const notes = room?.notes || "";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-indigo-500" />
            Room Notes — {roomName || "Room"}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : notes ? (
          <div className="rounded-lg bg-indigo-50/50 border border-indigo-100 p-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-6 text-center">No room notes for {roomName || "this room"} yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}