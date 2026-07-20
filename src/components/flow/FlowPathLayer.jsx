import { useRef } from "react";

export default function FlowPathLayer({ flowPaths, canvasW, canvasH, selectedPathId, onSelectPath, onUpdatePath, selectedFlow, drawMode }) {
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  const toPxX = (pct) => (pct / 100) * canvasW;
  const toPxY = (pct) => (pct / 100) * canvasH;

  const parsePath = (path) => {
    try { return JSON.parse(path.label || "{}"); } catch { return {}; }
  };

  const handleWaypointDragStart = (e, pathId, pointIndex) => {
    e.stopPropagation();
    onSelectPath(pathId);
    dragRef.current = { pathId, pointIndex };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const ds = dragRef.current;
    if (!ds || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const path = flowPaths.find((p) => p.id === ds.pathId);
    if (!path) return;
    const data = parsePath(path);
    if (!data.points) return;
    const newPoints = [...data.points];
    newPoints[ds.pointIndex] = [+x.toFixed(2), +y.toFixed(2)];
    onUpdatePath(ds.pathId, { label: JSON.stringify({ ...data, points: newPoints, auto_generated: false }) });
  };

  const handlePointerUp = () => { dragRef.current = null; };

  const handleInsertWaypoint = (e, pathId, segIndex) => {
    e.stopPropagation();
    if (drawMode !== "select") return;
    onSelectPath(pathId);
    const path = flowPaths.find((p) => p.id === pathId);
    if (!path || !svgRef.current) return;
    const data = parsePath(path);
    if (!data.points) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPoints = [...data.points];
    newPoints.splice(segIndex + 1, 0, [+x.toFixed(2), +y.toFixed(2)]);
    onUpdatePath(pathId, { label: JSON.stringify({ ...data, points: newPoints, auto_generated: false }) });
  };

  const handleDeleteWaypoint = (e, pathId, pointIndex) => {
    e.stopPropagation();
    e.preventDefault();
    const path = flowPaths.find((p) => p.id === pathId);
    if (!path) return;
    const data = parsePath(path);
    if (!data.points || data.points.length <= 2) return;
    const newPoints = data.points.filter((_, i) => i !== pointIndex);
    onUpdatePath(pathId, { label: JSON.stringify({ ...data, points: newPoints, auto_generated: false }) });
  };

  if (!flowPaths || flowPaths.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      width={canvasW}
      height={canvasH}
      style={{ zIndex: 5, pointerEvents: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {flowPaths.map((path) => {
        const data = parsePath(path);
        if (!data.points || data.points.length < 2) return null;
        const isSelected = selectedPathId === path.id;
        const isDimmed = selectedFlow && path.flow_name !== selectedFlow;
        const groupOpacity = isDimmed ? 0.5 : 1;
        const stepIndices = data.step_indices || [];
        const pointsStr = data.points.map(([x, y]) => `${toPxX(x)},${toPxY(y)}`).join(" ");

        const [ex, ey] = data.points[data.points.length - 1];
        const [px, py] = data.points[data.points.length - 2];
        const angle = Math.atan2(toPxY(ey) - toPxY(py), toPxX(ex) - toPxX(px));
        const arrowSize = 10;
        const ax = toPxX(ex), ay = toPxY(ey);

        return (
          <g key={path.id} style={{ opacity: groupOpacity }}>
            <polyline
              points={pointsStr}
              fill="none"
              stroke={path.color}
              strokeWidth={2}
              strokeDasharray="2,6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "stroke", cursor: drawMode === "select" ? "pointer" : "default" }}
              onPointerDown={(e) => { if (drawMode === "select") { e.stopPropagation(); onSelectPath(path.id); } }}
            />
            <polygon
              points={`${ax},${ay} ${ax - arrowSize * Math.cos(angle - 0.4)},${ay - arrowSize * Math.sin(angle - 0.4)} ${ax - arrowSize * Math.cos(angle + 0.4)},${ay - arrowSize * Math.sin(angle + 0.4)}`}
              fill={path.color}
              style={{ pointerEvents: "none" }}
            />
            {stepIndices.map((idx, stepNum) => {
              const [x, y] = data.points[idx];
              const cx = toPxX(x), cy = toPxY(y);
              return (
                <g key={idx} style={{ pointerEvents: "none" }}>
                  <circle cx={cx} cy={cy} r={11} fill="white" stroke={path.color} strokeWidth={2} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700" fill={path.color}>
                    {stepNum + 1}
                  </text>
                </g>
              );
            })}
            {isSelected && data.points.map((pt, i) => {
              const [x, y] = pt;
              return (
                <circle
                  key={`wp-${i}`}
                  cx={toPxX(x)}
                  cy={toPxY(y)}
                  r={6}
                  fill="white"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  style={{ cursor: "move", pointerEvents: "all" }}
                  onPointerDown={(e) => handleWaypointDragStart(e, path.id, i)}
                  onContextMenu={(e) => handleDeleteWaypoint(e, path.id, i)}
                />
              );
            })}
            {isSelected && data.points.slice(0, -1).map((pt, i) => {
              const [x1, y1] = data.points[i];
              const [x2, y2] = data.points[i + 1];
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <circle
                  key={`mid-${i}`}
                  cx={toPxX(mx)}
                  cy={toPxY(my)}
                  r={4}
                  fill="#f59e0b"
                  opacity={0.5}
                  style={{ cursor: "copy", pointerEvents: "all" }}
                  onPointerDown={(e) => handleInsertWaypoint(e, path.id, i)}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}