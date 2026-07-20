import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ARROW_COLORS, STROKE_WIDTHS, ARROWHEAD_STYLES } from "./flowConstants";

export default function ArrowEditor({ arrow, flows, onUpdate, onDelete, onClose }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2.5 mb-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="font-bold text-slate-900 text-sm">✏️ {arrow.arrow_type}</span>
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        {/* Color */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Color:</span>
          <div className="flex gap-1">
            {ARROW_COLORS.map((c) => (
              <button key={c} onClick={() => onUpdate({ color: c })}
                className={cn("w-6 h-6 rounded-full border-2", arrow.color === c ? "ring-2 ring-offset-1 ring-slate-700 border-white" : "border-white/50")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Width:</span>
          <Select value={String(arrow.stroke_width)} onValueChange={(v) => onUpdate({ stroke_width: parseInt(v) })}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STROKE_WIDTHS.map((s) => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Arrowhead */}
        {arrow.arrow_type === "arrow" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Head:</span>
            <Select value={arrow.arrowhead_style || "filled"} onValueChange={(v) => onUpdate({ arrowhead_style: v })}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ARROWHEAD_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {/* Flow assignment */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Flow:</span>
          <Select value={arrow.flow_name || "none"} onValueChange={(v) => onUpdate({ flow_name: v === "none" ? null : v })}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {flows.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Delete */}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>✕</Button>
        </div>
      </div>
    </div>
  );
}