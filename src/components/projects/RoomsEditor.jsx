import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, DoorOpen } from "lucide-react";
import FileUploader from "./FileUploader";

const emptyRoom = {
  room_name: "",
  cabinet_count: "",
  style: "",
  finish: "",
  notes: "",
  completed: false,
  files: []
};

export default function RoomsEditor({ rooms = [], onChange }) {
  const handleAddRoom = () => {
    onChange([...rooms, { ...emptyRoom }]);
  };

  const handleRemoveRoom = (index) => {
    onChange(rooms.filter((_, i) => i !== index));
  };

  const handleRoomChange = (index, field, value) => {
    const updated = rooms.map((room, i) =>
      i === index ? { ...room, [field]: value } : room
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Rooms ({rooms.length})
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRoom}>
          <Plus className="w-4 h-4 mr-1" />
          Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
          <DoorOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No rooms added yet</p>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddRoom} className="mt-2">
            <Plus className="w-4 h-4 mr-1" />
            Add First Room
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room, index) => (
            <Card key={index} className="p-4 bg-slate-50 border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">Room {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemoveRoom(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Room Name</Label>
                  <Input
                    value={room.room_name || ""}
                    onChange={(e) => handleRoomChange(index, "room_name", e.target.value)}
                    placeholder="e.g., Main Kitchen"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cabinet Count</Label>
                  <Input
                    type="number"
                    value={room.cabinet_count || ""}
                    onChange={(e) => handleRoomChange(index, "cabinet_count", e.target.value ? parseInt(e.target.value) : "")}
                    placeholder="e.g., 12"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Style</Label>
                  <Input
                    value={room.style || ""}
                    onChange={(e) => handleRoomChange(index, "style", e.target.value)}
                    placeholder="e.g., Shaker"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Finish</Label>
                  <Input
                    value={room.finish || ""}
                    onChange={(e) => handleRoomChange(index, "finish", e.target.value)}
                    placeholder="e.g., White Oak"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={room.notes || ""}
                    onChange={(e) => handleRoomChange(index, "notes", e.target.value)}
                    placeholder="Room-specific notes..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <FileUploader
                    files={room.files || []}
                    onChange={(files) => handleRoomChange(index, "files", files)}
                    label="Room Files"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}