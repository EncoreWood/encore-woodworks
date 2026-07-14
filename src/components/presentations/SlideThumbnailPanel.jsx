import { Plus, GripVertical } from "lucide-react";
import { parseImageUrl } from "./slideHelpers";

export default function SlideThumbnailPanel({ slides, selectedIdx, onSelect, onAdd, onReorder }) {
  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData("slideIdx", String(idx));
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("slideIdx"), 10);
    if (isNaN(fromIdx) || fromIdx === targetIdx) return;
    onReorder(fromIdx, targetIdx);
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onAdd}
        className="mb-3 flex items-center justify-center gap-1 w-full py-2 rounded border-2 border-dashed border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-colors text-xs font-medium flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" /> Add Slide
      </button>
      <div className="flex-1 overflow-y-auto space-y-2 -mr-1 pr-1">
        {slides.map((slide, idx) => {
          const img = parseImageUrl(slide.image_3d_url);
          return (
            <div
              key={slide.id || idx}
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
              <div className="aspect-video bg-slate-100 rounded-t overflow-hidden">
                {img ? (
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {idx + 1}. {slide.room_name || "Untitled"}
                </div>
                {slide.slide_label && (
                  <div className="text-[10px] text-slate-500 truncate">{slide.slide_label}</div>
                )}
              </div>
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