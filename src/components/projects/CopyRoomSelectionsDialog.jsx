import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy } from "lucide-react";

// Selection fields that get copied from another room (notes / cabinet count stay room-specific).
export const SELECTION_FIELDS = [
  "cabinet_style",
  "door_style",
  "handles",
  "drawer_glides",
  "hinges",
  "molding",
  "cabs_to_height",
  "species_finish_selections",
  "custom_selections",
];

function hasSelections(room) {
  if (!room) return false;
  return SELECTION_FIELDS.some(key => {
    const v = room[key];
    return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
  });
}

function summaryLines(room) {
  const lines = [];
  ["cabinet_style", "door_style", "handles", "drawer_glides", "hinges", "molding", "cabs_to_height"].forEach(key => {
    if (room[key]) lines.push(room[key]);
  });
  (room.species_finish_selections || []).forEach(s => {
    const text = [s.wood_species, s.finish].filter(Boolean).join(" · ");
    if (text) lines.push(text);
  });
  (room.custom_selections || []).forEach(cs => {
    if (cs.value) lines.push(`${cs.label}: ${cs.value}`);
  });
  return lines;
}

export default function CopyRoomSelectionsDialog({ open, onOpenChange, rooms = [], currentIndex, onPick }) {
  const candidates = rooms
    .map((room, index) => ({ room, index }))
    .filter(({ room, index }) => index !== currentIndex && hasSelections(room));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copy Selections From
          </DialogTitle>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-400">No other room in this project has selections saved yet.</p>
        ) : (
          <div className="space-y-2">
            {candidates.map(({ room, index }) => {
              const lines = summaryLines(room);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onPick(room)}
                  className="w-full text-left rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-colors p-3"
                >
                  <p className="text-sm font-semibold text-slate-800">{room.room_name || `Room ${index + 1}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lines.join(" · ")}</p>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">Copied values are not saved until you press Save Selections.</p>
      </DialogContent>
    </Dialog>
  );
}