import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SlideEditor({
  slide,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const [uploading, setUploading] = useState(null);

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploading(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpdate({ [field]: file_url });
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Room Name</label>
        <Input
          value={slide.room_name}
          onChange={(e) => onUpdate({ room_name: e.target.value })}
          placeholder="e.g., Kitchen"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Slide Label</label>
        <Input
          value={slide.slide_label || ""}
          onChange={(e) => onUpdate({ slide_label: e.target.value })}
          placeholder="e.g., Kitchen Island Option 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">3D Image</label>
        {slide.image_3d_url ? (
          <div className="space-y-2">
            <img src={slide.image_3d_url} alt="3D" className="w-full h-48 object-cover rounded" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onUpdate({ image_3d_url: null })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-all flex flex-col items-center gap-2">
            <Upload className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-600">Upload 3D image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload("image_3d_url", e.target.files?.[0])}
              className="hidden"
              disabled={uploading === "image_3d_url"}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">2D Image</label>
        {slide.image_2d_url ? (
          <div className="space-y-2">
            <img src={slide.image_2d_url} alt="2D" className="w-full h-32 object-cover rounded" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onUpdate({ image_2d_url: null })}
            >
              Remove
            </Button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-all flex flex-col items-center gap-2">
            <Upload className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-600">Upload 2D image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload("image_2d_url", e.target.files?.[0])}
              className="hidden"
              disabled={uploading === "image_2d_url"}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
        <Textarea
          value={slide.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Add notes for this slide..."
          rows={4}
        />
      </div>

      <div className="flex gap-2 border-t border-slate-200 pt-4">
        <Button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          variant="outline"
          size="sm"
          className="gap-1"
        >
          <ArrowUp className="w-3 h-3" />
          Up
        </Button>
        <Button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          variant="outline"
          size="sm"
          className="gap-1"
        >
          <ArrowDown className="w-3 h-3" />
          Down
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="ml-auto text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}