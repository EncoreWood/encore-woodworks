import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Palette, Pencil } from "lucide-react";
import RoomSelectionsPanel from "@/components/projects/RoomSelectionsPanel";
import SelectionsTab from "@/components/projects/room-tabs/SelectionsTab";

/**
 * Small button for the project room card that opens a dialog showing the
 * room's saved selections (cabinet style, wood species, finish, etc.).
 * An Edit toggle swaps the read-only summary for the editable Selections tab.
 */
export default function RoomSelectionsButton({ room, roomName, project, roomIndex }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(room || {});

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
                <Button
                  size="sm"
                  variant={editing ? "outline" : "default"}
                  onClick={() => setEditing(v => !v)}
                  className="h-7 text-xs gap-1"
                >
                  <Pencil className="w-3 h-3" /> {editing ? "Done" : "Edit"}
                </Button>
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
    </>
  );
}