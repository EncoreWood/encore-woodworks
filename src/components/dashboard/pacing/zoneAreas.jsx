import { Area } from "recharts";

// The tinted bands behind the pace lines.
//
// Two hard-won rules live here:
//  1. Colours are literal rgba, never a CSS variable — an unresolved fill paints nothing.
//  2. These are returned as an array of <Area> elements so callers render them as direct
//     children of the chart. Recharts only draws chart parts it recognises among its own
//     children, and only a ComposedChart draws areas at all, so an <Area> inside a wrapper
//     component (or inside a LineChart) is silently dropped.
//
// Green runs from the target line up to the top of the plot: the transparent `target`
// area lifts the stacked baseline, and `zoneTop` (= top − target, per row) fills from that
// line to the ceiling. Red fills from zero up to the minimum line.
export const ZONE_GREEN_FILL = "rgba(34,197,94,0.13)";
export const ZONE_RED_FILL = "rgba(239,68,68,0.13)";

export function zoneAreas(curve = "linear") {
  return [
    <Area
      key="zone-red"
      type={curve} dataKey="minimum" stroke="none"
      fill={ZONE_RED_FILL} fillOpacity={1} isAnimationActive={false}
    />,
    <Area
      key="zone-base"
      type={curve} dataKey="target" stackId="pace-zone" stroke="none"
      fill="transparent" fillOpacity={0} isAnimationActive={false}
    />,
    <Area
      key="zone-green"
      type={curve} dataKey="zoneTop" stackId="pace-zone" stroke="none"
      fill={ZONE_GREEN_FILL} fillOpacity={1} isAnimationActive={false}
    />,
  ];
}