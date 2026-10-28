import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Palette, Pencil, Copy } from "lucide-react";
import RoomSelectionsPanel from "@/components/projects/RoomSelectionsPanel";
import SelectionsTab from "@/components/projects/room-tabs/SelectionsTab";
import CopyRoomSelectionsDialog, { SELECTION_FIELDS } from "@/components/projects/CopyRoomSelectionsDialog";
import { toast } from "sonner";

/**
 * Small button for the project room card that opens a dialog showing the
 * room's saved selections (cabinet style, wood species, finish, etc.).
 * An Edit toggle swaps the read-only summary for the editable Selections tab.
 */
export default function RoomSelectionsButton({ room, roomName, project, roomIndex }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [formData, setFormData] = useState(room || {});

  // Fill this room's selections from another room in the project (saved only on Save Selections).
  const handlePickSource = (sourceRoom) => {
    const patch = {};
    SELECTION_FIELDS.forEach(key => {
      const value = sourceRoom?.[key];
      if (Array.isArray(value)) patch[key] = value.map(v => ({ ...v }));
      else if (value !== undefined) patch[key] = value;
    });
    setFormData(prev => ({ ...prev, ...patch }));
    setCopyOpen(false);
    setEditing(true);
    toast.success(`Selections copied from ${sourceRoom.room_name || "room"} — review and save.`);
  };

  const canEdit = !!project?.id && roomIndex !== null && roomIndex !== undefined;

  const handleOpen = (e) => {
    e.stopPropagation();
    setFormData(room || {});
    setEditing(false);
    setOpen(true);
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setEditing(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpen}
        className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
        title="View / edit room selections"
      >
        <Palette className="w-3 h-3" /> Selections
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={editing ? "max-w-2xl max-h-[85vh] overflow-y-auto" : "max-w-md max-h-[85vh] overflow-y-auto"}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle>{roomName} — Room Selections</DialogTitle>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCopyOpen(true)}
                    className="h-7 text-xs gap-1"
                    title="Copy selections from another room"
                  >
                    <Copy className="w-3 h-3" /> Copy From
                  </Button>
                  <Button
                    size="sm"
                    variant={editing ? "outline" : "default"}
                    onClick={() => setEditing(v => !v)}
                    className="h-7 text-xs gap-1"
                  >
                    <Pencil className="w-3 h-3" /> {editing ? "Done" : "Edit"}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {editing ? (
            <SelectionsTab
              formData={formData}
              setFormData={setFormData}
              project={project}
              roomIndex={roomIndex}
              readOnly={false}
              onSaved={(savedData) => {
                setFormData(prev => ({ ...prev, ...savedData }));
                setEditing(false);
              }}
            />
          ) : (
            <RoomSelectionsPanel room={formData} />
          )}
        </DialogContent>
      </Dialog>
      {canEdit && (
        <CopyRoomSelectionsDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          rooms={project?.rooms || []}
          currentIndex={roomIndex}
          onPick={handlePickSource}
        />
      )}
    </>
  );
}