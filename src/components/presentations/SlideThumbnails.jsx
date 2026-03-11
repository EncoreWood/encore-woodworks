import React from "react";

export default function SlideThumbnails({ slides, selectedIdx, onSelect }) {
  return (
    <div className="space-y-2 flex-1 overflow-y-auto">
      {slides.map((slide, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`w-full p-2 rounded text-left text-xs border transition-all ${
            selectedIdx === idx
              ? "border-amber-600 bg-amber-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="font-medium truncate">{slide.room_name}</div>
          {slide.slide_label && (
            <div className="text-slate-500 truncate">{slide.slide_label}</div>
          )}
        </button>
      ))}
    </div>
  );
}