import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Upload, X } from "lucide-react";
import { parseImageUrl, getNotesText } from "./slideHelpers";

export default function SlidePropertiesPanel({ slide, onUpdate, onDelete }) {
  const [uploading3d, setUploading3d] = useState(false);
  const [uploading2d, setUploading2d] = useState(false);

  const image3d = parseImageUrl(slide.image_3d_url);
  const image2d = slide.image_2d_url;
  const notesText = getNotesText(slide);

  const uploadImage = async (field, file) => {
    if (!file) return;
    const setter = field === "image_3d_url" ? setUploading3d : setUploading2d;
    setter(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUpdate({ [field]: file_url });
    } finally {
      setter(false);
    }
  };

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

      {/* 3D Image */}
      <div>
        <Label className="text-xs">3D Image</Label>
        {image3d ? (
          <div className="mt-1">
            <img
              src={image3d}
              alt="3D"
              className="w-full h-24 object-cover rounded border border-slate-200"
            />
            <div className="flex gap-1 mt-1">
              <label className="flex-1 cursor-pointer">
                <span className="flex items-center justify-center gap-1 h-7 text-xs border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                  <Upload className="w-3 h-3" /> {uploading3d ? "Uploading..." : "Replace"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading3d}
                  onChange={e => { uploadImage("image_3d_url", e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                onClick={() => onUpdate({ image_3d_url: null })}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="mt-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded p-4 cursor-pointer hover:border-amber-400 transition-colors">
            {uploading3d ? (
              <span className="text-xs text-slate-500">Uploading...</span>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500">Upload 3D Image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading3d}
              onChange={e => { uploadImage("image_3d_url", e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
        )}
      </div>

      {/* 2D Drawing */}
      <div>
        <Label className="text-xs">2D Drawing</Label>
        {image2d ? (
          <div className="mt-1">
            <img
              src={image2d}
              alt="2D"
              className="w-full h-24 object-cover rounded border border-slate-200"
            />
            <div className="flex gap-1 mt-1">
              <label className="flex-1 cursor-pointer">
                <span className="flex items-center justify-center gap-1 h-7 text-xs border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                  <Upload className="w-3 h-3" /> {uploading2d ? "Uploading..." : "Replace"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading2d}
                  onChange={e => { uploadImage("image_2d_url", e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                onClick={() => onUpdate({ image_2d_url: null })}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="mt-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded p-4 cursor-pointer hover:border-amber-400 transition-colors">
            {uploading2d ? (
              <span className="text-xs text-slate-500">Uploading...</span>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500">Upload 2D Drawing</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading2d}
              onChange={e => { uploadImage("image_2d_url", e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
        )}
      </div>

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
    </div>
  );
}