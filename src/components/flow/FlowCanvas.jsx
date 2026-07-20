import { useRef, useState, useEffect } from "react";
import FlowZone from "./FlowZone";
import { CANVAS_INCHES } from "./flowConstants";
import { Loader2 } from "lucide-react";

/** Compute the exit point (in inches) on a zone based on its flow_direction */
function getExitPoint(zone) {
  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  switch (zone.flow_direction) {
    case "right": return { x: zone.x + zone.width, y: cy };
    case "left":  return { x: zone.x, y: cy };
    case "up":    return { x: cx, y: zone.y };
    case "down":  return { x: cx, y: zone.y + zone.height };
    default:      return { x: cx, y: cy };
  }
}

export default function FlowCanvas({ zones, selectedId, onSelect, onDragMove, onDragEnd, isLoading }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setScale(w / CANVAS_INCHES);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const canvasPx = CANVAS_INCHES * scale;

  // Build arrows between consecutive flow-ordered zones
  const sequenced = zones.filter(z => z.flow_order != null).sort((a, b) => a.flow_order - b.flow_order);
  const arrows = [];
  for (let i = 0; i < sequenced.length - 1; i++) {
    const from = sequenced[i];
    const to = sequenced[i + 1];
    const exit = getExitPoint(from);
    const entry = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    arrows.push({
      x1: exit.x * scale, y1: exit.y * scale,
      x2: entry.x * scale, y2: entry.y * scale,
    });
  }

  return (
    <div ref={containerRef} className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : (
        <div
          className="relative bg-slate-100 border-4 border-slate-700 rounded-lg overflow-hidden mx-auto touch-none"
          style={{ width: canvasPx, height: canvasPx }}
        >
          {/* Grid background — 1ft (12") lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)",
            backgroundSize: `${12 * scale}px ${12 * scale}px`,
          }} />

          {/* Flow arrows */}
          <svg className="absolute inset-0 pointer-events-none" width={canvasPx} height={canvasPx} style={{ zIndex: 5 }}>
            <defs>
              <marker id="flow-arrow" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {arrows.map((a, i) => (
              <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4"
                markerEnd="url(#flow-arrow)" opacity="0.6" />
            ))}
          </svg>

          {/* Zones */}
          {zones.map(zone => (
            <FlowZone
              key={zone.id}
              zone={zone}
              scale={scale}
              isSelected={selectedId === zone.id}
              onSelect={onSelect}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}

      {/* Dimension label */}
      <p className="text-center text-xs text-slate-400 mt-1">
        594" × 594" (49.5' × 49.5')
      </p>
    </div>
  );
}