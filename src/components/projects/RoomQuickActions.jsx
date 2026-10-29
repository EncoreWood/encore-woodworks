import { Button } from "@/components/ui/button";
import { Box, Trash2 } from "lucide-react";
import RoomPickupMissingModal from "@/components/pickup/RoomPickupMissingModal";
import RoomSelectionsButton from "./RoomSelectionsButton";

/**
 * The room's usual action buttons, rendered inside the Room Workspace info
 * pane so the same actions stay reachable from the combined view.
 */
export default function RoomQuickActions({ project, room, idx, roomName, onViewGlb, onAttachGlb, onDelete }) {
  return (
    <>
      <RoomPickupMissingModal project={project} roomName={roomName} />
      <RoomSelectionsButton room={room} roomName={roomName} project={project} roomIndex={idx} />
      {room.glb_url ? (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onViewGlb({ url: room.glb_url, name: room.glb_name || roomName }); }}
          className="h-7 text-xs text-violet-600 border-violet-200 hover:bg-violet-50 gap-1"
        >
          <Box className="w-3 h-3" /> 3D Model View
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onAttachGlb(); }}
          className="h-7 text-xs text-slate-500 border-slate-200 hover:text-violet-600 hover:border-violet-200 gap-1"
        >
          <Box className="w-3 h-3" /> 3D
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
      >
        <Trash2 className="w-3 h-3" /> Delete Room
      </Button>
    </>
  );
}