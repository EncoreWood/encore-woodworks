import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, CANVAS_INCHES } from "./flowConstants";

export default function FlowZone({ zone, scale, isSelected, dimmed, onSelect, onDragMove, onDragEnd }) {
  const dragState = useRef(null);
  const [interacting, setInteracting] = useState(false);

  // Clamp position for display safety
  const cx = Math.max(0, Math.min(CANVAS_INCHES - zone.width, zone.x));
  const cy = Math.max(0, Math.min(CANVAS_INCHES - zone.height, zone.y));

  const style = {
    left: cx * scale,
    top: cy * scale,
    width: zone.width * scale,
    height: zone.height * scale,
    opacity: dimmed ? 0.25 : 1,
  };

  const colorClass = ZONE_COLORS[zone.color]?.zone || ZONE_COLORS.blue.zone;

  const startDrag = (e) => {
    if (e.target.dataset.role === "resize-handle") return;
    e.stopPropagation();
    onSelect(zone.id);
    dragState.current = { type: "drag", startX: e.clientX, startY: e.clientY, origX: zone.x, origY: zone.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteracting(true);
  };

  const startResize = (e) => {
    e.stopPropagation();
    onSelect(zone.id);
    dragState.current = { type: "resize", startX: e.clientX, startY: e.clientY, origW: zone.width, origH: zone.height };
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteracting(true);
  };

  const onMove = (e) => {
    const ds = dragState.current;
    if (!ds) return;
    if (ds.type === "drag") {
      const dx = (e.clientX - ds.startX) / scale;
      const dy = (e.clientY - ds.startY) / scale;
      let nx = Math.max(0, Math.min(CANVAS_INCHES - zone.width, ds.origX + dx));
      let ny = Math.max(0, Math.min(CANVAS_INCHES - zone.height, ds.origY + dy));
      onDragMove(zone.id, Math.round(nx), Math.round(ny), zone.width, zone.height);
    } else {
      const dx = (e.clientX - ds.startX) / scale;
      const dy = (e.clientY - ds.startY) / scale;
      let nw = Math.max(40, ds.origW + dx);
      let nh = Math.max(40, ds.origH + dy);
      nw = Math.min(CANVAS_INCHES - zone.x, nw);
      nh = Math.min(CANVAS_INCHES - zone.y, nh);
      onDragMove(zone.id, zone.x, zone.y, Math.round(nw), Math.round(nh));
    }
  };

  const onUp = () => {
    if (dragState.current) {
      onDragEnd(zone.id);
      dragState.current = null;
    }
    setInteracting(false);
  };

  return (
    <div
      className={cn(
        "absolute rounded-lg border-2 cursor-move touch-none select-none flex flex-col items-center justify-center gap-0.5 transition-opacity",
        colorClass,
        isSelected ? "ring-2 ring-offset-1 ring-amber-500 z-30 shadow-lg" : "z-10 hover:shadow-md",
        interacting && "shadow-xl"
      )}
      style={style}
      onPointerDown={startDrag}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {zone.icon && <span className="text-lg sm:text-2xl pointer-events-none leading-none">{zone.icon}</span>}
      <span className="font-bold text-[10px] sm:text-xs text-center px-1 pointer-events-none truncate max-w-full leading-tight">{zone.name}</span>
      {zone.flow_order != null && (
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none z-10">
          {zone.flow_order}
        </span>
      )}
      {isSelected && (
        <div
          data-role="resize-handle"
          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-amber-500 border-2 border-white rounded-sm cursor-se-resize touch-none"
          onPointerDown={startResize}
        />
      )}
    </div>
  );
}