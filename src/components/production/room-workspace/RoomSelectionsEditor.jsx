import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import RoomSelectionsPanel from "@/components/projects/RoomSelectionsPanel";
import SelectionsTab from "@/components/projects/room-tabs/SelectionsTab";

/**
 * Room selections in the Room Workspace right pane: the saved summary plus an
 * Edit toggle that opens the same editor used in the Room Manager, saving back
 * onto project.rooms[roomIndex].
 */
export default function RoomSelectionsEditor({ project, room, roomIndex }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const startEditing = () => {
    setFormData({ ...(room || {}) });
    setEditing(true);
  };

  if (!editing) {
    return (
      <div>
        <RoomSelectionsPanel room={room || {}} />
        {roomIndex >= 0 && (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-medium mt-2"
          >
            <Pencil className="w-3 h-3" /> Edit selections
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        >
          <X className="w-3 h-3" /> Close
        </button>
      </div>
      <SelectionsTab
        formData={formData}
        setFormData={setFormData}
        project={project}
        roomIndex={roomIndex}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["project", project.id] });
          setEditing(false);
        }}
      />
    </div>
  );
}