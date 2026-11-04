import { STAGE_PALETTE } from "@/lib/stagePalette";

// The five production stages that earn points, in flow order. Each one keeps the
// accent colour its chip already uses on the production cards, so a line in the
// chart means the same thing as the chip on a card.
export const STAGE_AREAS = ["cut", "face_frame", "spray", "build", "complete"].map(stage => ({
  id: stage,
  label: STAGE_PALETTE[stage].label,
  color: STAGE_PALETTE[stage].accent,
}));

export const AREA_IDS = STAGE_AREAS.map(area => area.id);

export const ALL_AREAS = { id: "all", label: "All areas", color: "#475569" };

export const AREA_OPTIONS = [ALL_AREAS, ...STAGE_AREAS];

// "all" plots every stage at once; a stage id plots just that one.
export const visibleAreas = area => (area === "all" ? STAGE_AREAS : STAGE_AREAS.filter(item => item.id === area));