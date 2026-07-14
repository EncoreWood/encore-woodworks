import { MousePointer2, Pencil, Type, Minus, ArrowRight, Square, Circle, Crop as CropIcon, Trash2, Undo2, Redo2, Check, X, ImagePlus } from "lucide-react";

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select / Move" },
  { id: "draw", icon: Pencil, label: "Freehand Draw" },
  { id: "text", icon: Type, label: "Text" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
];

const SHAPE_TOOLS = ["draw", "line", "arrow", "rect", "circle"];
const FILL_TOOLS = ["rect", "circle"];

export default function CanvasToolbar({
  activeTool, onToolChange,
  strokeColor, onStrokeColorChange,
  fillColor, onFillColorChange,
  fillEnabled, onFillEnabledChange,
  strokeWidth, onStrokeWidthChange,
  onUndo, onRedo, onDelete,
  canUndo, canRedo, hasSelection,
  cropMode, onApplyCrop, onCancelCrop,
  onAddImage,
}) {
  const showStyleControls = SHAPE_TOOLS.includes(activeTool) && !cropMode;
  const showFillControls = FILL_TOOLS.includes(activeTool);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-white flex-wrap">
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-1.5 rounded transition-colors ${activeTool === tool.id && !cropMode ? "bg-amber-100 text-amber-700" : "text-slate-600 hover:bg-slate-100"}`}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button
        onClick={onAddImage}
        className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
        title="Add Image"
      >
        <ImagePlus className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToolChange("crop")}
        className={`p-1.5 rounded transition-colors ${cropMode ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
        title="Crop"
      >
        <CropIcon className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
        title="Delete selected"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {showStyleControls && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span>Stroke</span>
            <input
              type="color"
              value={strokeColor}
              onChange={e => onStrokeColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-slate-200"
            />
          </label>
          {showFillControls && (
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={fillEnabled}
                onChange={e => onFillEnabledChange(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Fill</span>
              <input
                type="color"
                value={fillColor}
                onChange={e => onFillColorChange(e.target.value)}
                disabled={!fillEnabled}
                className="w-6 h-6 rounded cursor-pointer border border-slate-200 disabled:opacity-30"
              />
            </label>
          )}
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span>Width</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={e => onStrokeWidthChange(Number(e.target.value))}
              className="w-16"
            />
            <span className="w-5 text-center">{strokeWidth}</span>
          </label>
        </>
      )}

      {cropMode && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            onClick={onApplyCrop}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Apply Crop
          </button>
          <button
            onClick={onCancelCrop}
            className="px-2 py-1 bg-white text-slate-700 text-xs rounded border hover:bg-slate-50 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </>
      )}
    </div>
  );
}