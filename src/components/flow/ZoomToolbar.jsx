import { Minus, Plus, Maximize } from "lucide-react";

export default function ZoomToolbar({ zoom, onZoomIn, onZoomOut, onFit }) {
  return (
    <div className="absolute top-2 right-2 z-40 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
      <button onClick={onZoomOut} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 touch-none" title="Zoom out">
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-xs font-semibold text-slate-600 px-1 min-w-[2.8rem] text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 touch-none" title="Zoom in">
        <Plus className="w-4 h-4" />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <button onClick={onFit} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 touch-none" title="Fit to screen">
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}