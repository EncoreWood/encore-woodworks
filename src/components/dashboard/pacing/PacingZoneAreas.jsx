import { Area } from "recharts";
import { ZONE_GREEN, ZONE_OPACITY, ZONE_RED } from "@/lib/pacingZones";

// Two translucent bands traced from the pace lines: green above the target line, red
// below the minimum line, with the band in between left untouched. The chart rows
// carry `zoneTop` = chart top − target, so the green band stacks from the target line
// up to the top of the plot instead of being a fixed height.
export default function PacingZoneAreas({ curve = "linear" }) {
  return (
    <>
      <Area
        type={curve} dataKey="minimum" stroke="none"
        fill={ZONE_RED} fillOpacity={ZONE_OPACITY} isAnimationActive={false}
      />
      <Area
        type={curve} dataKey="target" stackId="zone" stroke="none"
        fill="transparent" fillOpacity={0} isAnimationActive={false}
      />
      <Area
        type={curve} dataKey="zoneTop" stackId="zone" stroke="none"
        fill={ZONE_GREEN} fillOpacity={ZONE_OPACITY} isAnimationActive={false}
      />
    </>
  );
}