import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { getNotesText, isCoverSlide } from "./slideHelpers";

export default function SlidePropertiesPanel({ slide, onUpdate, onDelete }) {
  const notesText = getNotesText(slide);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Room Name</Label>
        <Input
          value={slide.room_name || ""}
          onChange={e => onUpdate({ room_name: e.target.value })}
          className="h-8 text-sm mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Slide Label</Label>
        <Input
          value={slide.slide_label || ""}
          onChange={e => onUpdate({ slide_label: e.target.value })}
          className="h-8 text-sm mt-1"
          placeholder="e.g., Kitchen Island Option 1"
        />
      </div>

      <div>
        <Label className="text-xs">Notes (shown to client in portal)</Label>
        <Textarea
          value={notesText}
          onChange={e => onUpdate({ notes: e.target.value })}
          rows={4}
          className="text-sm mt-1"
          placeholder="Client-facing notes..."
        />
      </div>

      <p className="text-xs text-slate-400 italic">
        Images are managed directly on the slide — drag to move, use the corner handle to resize, and click the crop icon to crop.
      </p>

      {!isCoverSlide(slide) && (
        <div className="border-t border-slate-200 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-600 hover:bg-red-50 gap-1.5"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Slide
          </Button>
        </div>
      )}
    </div>
  );
}