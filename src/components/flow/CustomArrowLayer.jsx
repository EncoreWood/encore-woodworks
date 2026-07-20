import { useRef } from "react";

function arrowHeadPoints(x1, y1, x2, y2, size, tangentFromControl) {
  const angle = tangentFromControl
    ? Math.atan2(y2 - tangentFromControl.y, x2 - tangentFromControl.x)
    : Math.atan2(y2 - y1, x2 - x1);
  const a1 = angle + Math.PI - 0.4;
  const a2 = angle + Math.PI + 0.4;
  return `${x2},${y2} ${x2 + size * Math.cos(a1)},${y2 + size * Math.sin(a1)} ${x2 + size * Math.cos(a2)},${y2 + size * Math.sin(a2)}`;
}

export default function CustomArrowLayer({ arrows, canvasW, canvasH, selectedArrowId, onSelect, onUpdate, selectedFlow }) {
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  const toPxX = (pct) => ((pct || 0) / 100) * canvasW;
  const toPxY = (pct) => ((pct || 0) / 100) * canvasH;

  const visibleArrows = selectedFlow
    ? arrows.filter((a) => !a.flow_name || a.flow_name === selectedFlow)
    : arrows;

  const handleDragStart = (e, arrowId, point) => {
    e.stopPropagation();
    onSelect(arrowId);
    dragRef.current = { arrowId, point };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMove = (e) => {
    const ds = dragRef.current;
    if (!ds || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const update = {};
    if (ds.point === "start") { update.start_x = x; update.start_y = y; }
    else if (ds.point === "end") { update.end_x = x; update.end_y = y; }
    else if (ds.point === "control") { update.control_x = x; update.control_y = y; }
    onUpdate(ds.arrowId, update);
  };

  const handleEnd = () => { dragRef.current = null; };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      width={canvasW}
      height={canvasH}
      style={{ zIndex: 6 }}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
    >
      {visibleArrows.map((arrow) => {
        const x1 = toPxX(arrow.start_x), y1 = toPxY(arrow.start_y);
        const x2 = toPxX(arrow.end_x), y2 = toPxY(arrow.end_y);
        const cx = toPxX(arrow.control_x), cy = toPxY(arrow.control_y);
        const isSelected = selectedArrowId === arrow.id;
        const showHead = arrow.arrow_type === "arrow" && arrow.arrowhead_style !== "none";

        if (arrow.arrow_type === "label") {
          return (
            <g key={arrow.id} className="cursor-move" onPointerDown={(e) => { e.stopPropagation(); onSelect(arrow.id); }}>
              <text x={x1} y={y1} fill={arrow.color} fontSize={Math.max(12, arrow.stroke_width * 4)} fontWeight="700" style={{ pointerEvents: "all" }}>
                {arrow.label || "Label"}
              </text>
            </g>
          );
        }

        const tangent = arrow.arrow_type === "curve" ? { x: cx, y: cy } : null;

        return (
          <g key={arrow.id}>
            {arrow.arrow_type === "curve" ? (
              <path
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                stroke={arrow.color}
                strokeWidth={arrow.stroke_width}
                fill="none"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={(e) => { e.stopPropagation(); onSelect(arrow.id); }}
              />
            ) : (
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={arrow.color}
                strokeWidth={arrow.stroke_width}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={(e) => { e.stopPropagation(); onSelect(arrow.id); }}
              />
            )}
            {showHead && (
              <polygon
                points={arrowHeadPoints(x1, y1, x2, y2, 8 + arrow.stroke_width, tangent)}
                fill={arrow.arrowhead_style === "outline" ? "white" : arrow.color}
                stroke={arrow.color}
                strokeWidth={1}
                style={{ pointerEvents: "none" }}
              />
            )}
            {isSelected && (
              <>
                <circle cx={x1} cy={y1} r={8} fill="white" stroke="#f59e0b" strokeWidth={2}
                  style={{ cursor: "move", pointerEvents: "all" }}
                  onPointerDown={(e) => handleDragStart(e, arrow.id, "start")} />
                <circle cx={x2} cy={y2} r={8} fill="white" stroke="#f59e0b" strokeWidth={2}
                  style={{ cursor: "move", pointerEvents: "all" }}
                  onPointerDown={(e) => handleDragStart(e, arrow.id, "end")} />
                {arrow.arrow_type === "curve" && (
                  <circle cx={cx} cy={cy} r={8} fill="white" stroke="#f59e0b" strokeWidth={2}
                    style={{ cursor: "move", pointerEvents: "all" }}
                    onPointerDown={(e) => handleDragStart(e, arrow.id, "control")} />
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}