import { useRef, useState } from "react";
import { ZONE_COLORS, SHOP_BASE, SHOP_WIDTH_BASE, hexToRgba } from "./flowConstants";

/**
 * Zone positioned using PERCENTAGES (0-100) within the shop boundary.
 * shopW = SHOP_WIDTH_BASE * zoom, shopH = SHOP_BASE * zoom (rendered pixel sizes).
 *
 * Props added for flow view + SOP:
 *  - flowColor: hex color of the currently viewed flow (null when not viewing)
 *  - partOfFlow: true when this zone belongs to the viewed flow (highlighted)
 *  - dragEnabled: false in flow view (clicks open SOP viewer instead of dragging)
 *  - nonInteractive: pointer-events disabled (dimmed, non-flow zones in flow view)
 *  - hasSop: zone has an associated SOP (shows 📋 badge)
 *  - showNoSopBadge: in flow view, highlighted zone without an SOP
 */
export default function FlowZone({ zone, shopW, shopH, isSelected, isHighlighted, opacity = 1, onSelect, onDragMove, onDragEnd, flowColor, partOfFlow, dragEnabled = true, nonInteractive = false, hasSop = false, showNoSopBadge = false }) {
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

  const zoneHex = ZONE_COLORS[zone.color]?.hex || ZONE_COLORS.blue.hex;
  const showIcon = pw > 65 && ph > 45;

  // When viewing a flow, all zones that belong to the flow use the flow's color
  const inFlow = partOfFlow && flowColor;
  const accent = inFlow ? flowColor : zoneHex;

  const startDrag = (e) => {
    if (e.target.dataset.role === "resize-handle") return;
    e.stopPropagation();
    onSelect(zone.id);
    if (!dragEnabled) return; // flow view: click selects (opens viewer), no drag
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

  const highlightedFlow = inFlow;
  const borderStyle = highlightedFlow ? `3px solid ${flowColor}` : `2px solid ${zoneHex}`;
  const glow = highlightedFlow
    ? `0 0 14px ${hexToRgba(flowColor, 0.65)}, 0 0 0 2px ${hexToRgba(flowColor, 0.35)}`
    : interacting ? "0 4px 12px rgba(0,0,0,0.15)"
    : isSelected ? "0 2px 8px rgba(0,0,0,0.12)"
    : isHighlighted ? `0 0 0 3px ${hexToRgba(zoneHex, 0.5)}`
    : "none";

  return (
    <div
      className="absolute rounded-lg touch-none select-none transition-opacity"
      style={{
        left: px,
        top: py,
        width: pw,
        height: ph,
        backgroundColor: hexToRgba(accent, highlightedFlow ? 0.35 : isHighlighted ? 0.35 : 0.2),
        border: borderStyle,
        opacity,
        zIndex: isSelected ? 30 : highlightedFlow ? 20 : isHighlighted ? 20 : 10,
        boxShadow: glow,
        cursor: nonInteractive ? "default" : !dragEnabled ? "pointer" : "move",
        pointerEvents: nonInteractive ? "none" : "auto",
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
          style={{ backgroundColor: zoneHex }}>
          {zone.flow_order}
        </span>
      )}
      {/* SOP badge bottom-left */}
      {hasSop && (
        <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-white/90 text-[11px] flex items-center justify-center pointer-events-none shadow-sm border border-slate-200" title="Has SOP">📋</span>
      )}
      {/* No-SOP badge (flow view, highlighted, no SOP) */}
      {showNoSopBadge && (
        <span className="absolute bottom-1 left-1 text-[8px] font-bold text-slate-600 bg-white/85 px-1 py-0.5 rounded pointer-events-none border border-slate-200">No SOP</span>
      )}
      {/* Name centered */}
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <span className="font-bold text-center text-slate-900 truncate max-w-full" style={{ fontSize: pw > 100 ? 13 : 11 }}>
          {zone.name}
        </span>
      </div>
      {/* Resize handle */}
      {isSelected && dragEnabled && (
        <div
          data-role="resize-handle"
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-sm cursor-se-resize touch-none"
          onPointerDown={startResize}
        />
      )}
    </div>
  );
}