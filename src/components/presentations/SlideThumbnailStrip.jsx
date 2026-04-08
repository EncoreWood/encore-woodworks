import { Plus, GripVertical } from "lucide-react";
import { parseImages } from "./SlidePreview";

export default function SlideThumbnailStrip({ slides, selectedIdx, onSelect, onAdd, onReorder }) {
  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData("slideIdx", idx);
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("slideIdx"), 10);
    if (fromIdx === targetIdx) return;
    onReorder(fromIdx, targetIdx);
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onAdd}
        className="mb-3 flex items-center justify-center gap-1 w-full py-2 rounded border-2 border-dashed border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-colors text-xs font-medium"
      >
        <Plus className="w-3.5 h-3.5" /> Add Slide
      </button>
      <div className="flex-1 overflow-y-auto space-y-2">
        {slides.map((slide, idx) => {
          const images = parseImages(slide.image_3d_url);
          const thumb = images[0];
          return (
            <div
              key={idx}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => onSelect(idx)}
              className={`relative rounded border cursor-pointer transition-all group ${
                selectedIdx === idx
                  ? "border-amber-500 ring-1 ring-amber-400 bg-white"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              {/* Thumbnail image */}
              <div className="aspect-video bg-slate-100 rounded-t overflow-hidden">
                {thumb ? (
                  <img src={thumb} alt={slide.room_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <div className="text-xs font-semibold text-slate-800 truncate">{idx + 1}. {slide.room_name}</div>
                {slide.slide_label && <div className="text-[10px] text-slate-500 truncate">{slide.slide_label}</div>}
              </div>
              {/* Drag handle */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                <GripVertical className="w-3 h-3 text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}