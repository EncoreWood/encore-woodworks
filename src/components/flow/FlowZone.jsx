import { useRef, useState } from "react";
import { ZONE_COLORS, SHOP_BASE, SHOP_WIDTH_BASE, hexToRgba } from "./flowConstants";

/**
 * Zone positioned using PERCENTAGES (0-100) within the shop boundary.
 * shopW = SHOP_WIDTH_BASE * zoom, shopH = SHOP_BASE * zoom (rendered pixel sizes).
 */
export default function FlowZone({ zone, shopW, shopH, isSelected, opacity = 1, onSelect, onDragMove, onDragEnd }) {
  const dragState = useRef(null);
  const [interacting, setInteracting] = useState(false);

  // Base pixel size (before zoom) with minimum 80×60
  const baseW = Math.max(80, (zone.width / 100) * SHOP_WIDTH_BASE);
  const baseH = Math.max(60, (zone.height / 100) * SHOP_BASE);

  // Clamp position so zone stays inside boundary (in percentage space)
  const effWPct = (baseW / SHOP_WIDTH_BASE) * 100;
  const effHPct = (baseH / SHOP_BASE) * 100;
  const cx = Math.max(0, Math.min(100 - effWPct, zone.x));
  const cy = Math.max(0, Math.min(100 - effHPct, zone.y));

  // Final pixel positions
  const px = (cx / 100) * shopW;
  const py = (cy / 100) * shopH;
  const pw = baseW * (shopW / SHOP_WIDTH_BASE);
  const ph = baseH * (shopH / SHOP_BASE);

  const hex = ZONE_COLORS[zone.color]?.hex || ZONE_COLORS.blue.hex;
  const showIcon = pw > 65 && ph > 45;

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
      const dxPct = ((e.clientX - ds.startX) / shopW) * 100;
      const dyPct = ((e.clientY - ds.startY) / shopH) * 100;
      let nx = Math.max(0, Math.min(100 - effWPct, ds.origX + dxPct));
      let ny = Math.max(0, Math.min(100 - effHPct, ds.origY + dyPct));
      onDragMove(zone.id, +nx.toFixed(2), +ny.toFixed(2), zone.width, zone.height);
    } else {
      const dwPct = ((e.clientX - ds.startX) / shopW) * 100;
      const dhPct = ((e.clientY - ds.startY) / shopH) * 100;
      const minW = (80 / SHOP_WIDTH_BASE) * 100;
      const minH = (60 / SHOP_BASE) * 100;
      let nw = Math.max(minW, ds.origW + dwPct);
      let nh = Math.max(minH, ds.origH + dhPct);
      nw = Math.min(100 - zone.x, nw);
      nh = Math.min(100 - zone.y, nh);
      onDragMove(zone.id, zone.x, zone.y, +nw.toFixed(2), +nh.toFixed(2));
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
      className="absolute rounded-lg touch-none select-none cursor-move transition-opacity"
      style={{
        left: px,
        top: py,
        width: pw,
        height: ph,
        backgroundColor: hexToRgba(hex, 0.2),
        border: `2px solid ${hex}`,
        opacity,
        zIndex: isSelected ? 30 : 10,
        boxShadow: interacting ? "0 4px 12px rgba(0,0,0,0.15)" : isSelected ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
      }}
      onPointerDown={startDrag}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Icon top-left */}
      {showIcon && zone.icon && (
        <span className="absolute top-1 left-1.5 text-sm pointer-events-none leading-none">{zone.icon}</span>
      )}
      {/* Flow order badge top-right */}
      {zone.flow_order != null && (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: hex }}>
          {zone.flow_order}
        </span>
      )}
      {/* Name centered */}
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <span className="font-bold text-center text-slate-900 truncate max-w-full" style={{ fontSize: pw > 100 ? 13 : 11 }}>
          {zone.name}
        </span>
      </div>
      {/* Resize handle */}
      {isSelected && (
        <div
          data-role="resize-handle"
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-sm cursor-se-resize touch-none"
          onPointerDown={startResize}
        />
      )}
    </div>
  );
}