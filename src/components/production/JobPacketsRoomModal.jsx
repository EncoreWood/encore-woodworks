import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import RoomWorkspace from "./room-workspace/RoomWorkspace";
import { roomPts } from "@/lib/roomPts";

/**
 * Room entry point on the project's room card. Opens the combined Room
 * Workspace (production cards + room info) for this project + room.
 */
export default function JobPacketsRoomModal({ project, roomName, items, currentUser }) {
  const [open, setOpen] = useState(false);

  const roomItems = (items || []).filter(i => i.project_id === project.id && i.room_name === roomName && !i.is_job_info);
  const count = roomItems.length;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 gap-1"
        title="Open room workspace — production cards & room info"
      >
        <Package className="w-3 h-3" />
        Job Packets{count > 0 && ` (${count})`}
        {count > 0 && <span className="font-bold text-amber-800">· {roomPts(roomItems)} PTS</span>}
      </Button>

      {open && (
        <RoomWorkspace
          project={project}
          roomName={roomName}
          items={items}
          currentUser={currentUser}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}