/**
 * Numbered stage badges rendered ABOVE the zones during Flow View.
 * - The active flow's badges are clickable (jump to that stage's SOP panel).
 * - The currently active stage badge is larger and pulses.
 * - Non-active flow badges render dimmed and non-interactive.
 *
 * In edit mode (no selectedFlow) badges are rendered by FlowPathLayer behind the zones instead.
 */
export default function FlowBadgeLayer({ flowPaths, canvasW, canvasH, selectedFlow, activeZoneId, onSelectStage }) {
  const toPxX = (pct) => (pct / 100) * canvasW;
  const toPxY = (pct) => (pct / 100) * canvasH;
  const parsePath = (path) => {
    try { return JSON.parse(path.label || "{}"); } catch { return {}; }
  };

  if (!selectedFlow || !flowPaths || flowPaths.length === 0) return null;

  return (
    <svg className="absolute inset-0" width={canvasW} height={canvasH} style={{ zIndex: 35, pointerEvents: "none" }}>
      <style>{`@keyframes encoreFlowPulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.9); opacity: 0 } }`}</style>
      {flowPaths.map((path) => {
        const data = parsePath(path);
        if (!data.points || !data.zone_ids || !data.step_indices) return null;
        const isActiveFlow = path.flow_name === selectedFlow;
        const isDimmed = !isActiveFlow;
        const groupOpacity = isDimmed ? 0.25 : 1;
        return (
          <g key={path.id} style={{ opacity: groupOpacity }}>
            {data.zone_ids.map((zoneId, stepNum) => {
              const ptIdx = data.step_indices[stepNum];
              if (ptIdx == null || !data.points[ptIdx]) return null;
              const [x, y] = data.points[ptIdx];
              const cx = toPxX(x);
              const cy = toPxY(y);
              const isActive = isActiveFlow && activeZoneId && zoneId === activeZoneId;
              const clickable = isActiveFlow && !!onSelectStage;
              return (
                <g
                  key={stepNum}
                  style={{ pointerEvents: clickable ? "all" : "none", cursor: clickable ? "pointer" : "default" }}
                  onPointerDown={clickable ? (e) => { e.stopPropagation(); onSelectStage(zoneId); } : undefined}
                >
                  {isActive && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="none"
                      stroke={path.color}
                      strokeWidth={3}
                      style={{ transformBox: "fill-box", transformOrigin: "center", animation: "encoreFlowPulse 1.3s ease-out infinite" }}
                    />
                  )}
                  <circle cx={cx} cy={cy} r={isActive ? 13 : 11} fill="white" stroke={path.color} strokeWidth={isActive ? 3 : 2} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={isActive ? 13 : 11} fontWeight="700" fill={path.color}>
                    {stepNum + 1}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}