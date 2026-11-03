import { format } from "date-fns";

// Production flow order. Cards before Cut ("Staged" / no stage) are not in the flow.
export const STAGE_FLOW = ["cut", "face_frame", "spray", "build", "complete"];

// Parking statuses sit outside the flow. A card parked here has NOT left the stage it
// came from, so parking moves award and remove nothing — the card resumes where it was.
export const PARKING_STATUSES = ["on_hold"];

const round2 = (n) => Math.round(n * 100) / 100;

// Log timestamps are stored in UTC — compare them on the shop's local day.
export const denverDateStr = (value) =>
  format(new Date(new Date(value).toLocaleString("en-US", { timeZone: "America/Denver" })), "yyyy-MM-dd");

// Display helper: 15.25 → "15.25", 6 → "6"
export function formatStagePoints(value) {
  return String(round2(Number(value) || 0));
}