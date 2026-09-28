import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import RoomSelectionsPanel from "@/components/projects/RoomSelectionsPanel";

/**
 * Small button for the project room card that opens a dialog showing the
 * room's saved selections (cabinet style, wood species, finish, etc.).
 */
export default function RoomSelectionsButton({ room, roomName }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
        title="View room selections"
      >
        <Palette className="w-3 h-3" /> Selections
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{roomName} — Room Selections</DialogTitle>
          </DialogHeader>
          <RoomSelectionsPanel room={room} />
        </DialogContent>
      </Dialog>
    </>
  );
}