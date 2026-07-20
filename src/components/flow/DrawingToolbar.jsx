import { MousePointer2, ArrowRight, Minus, Spline, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { mode: "select", label: "Select", icon: MousePointer2 },
  { mode: "arrow", label: "Arrow", icon: ArrowRight },
  { mode: "line", label: "Line", icon: Minus },
  { mode: "curve", label: "Curve", icon: Spline },
  { mode: "label", label: "Label", icon: Type },
];

export default function DrawingToolbar({ mode, onModeChange }) {
  return (
    <div className="absolute top-2 left-2 z-40 flex gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
      {TOOLS.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => onModeChange(tool.mode)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition touch-none",
            mode === tool.mode ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"
          )}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
          <span className="hidden lg:inline">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}