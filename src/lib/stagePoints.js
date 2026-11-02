import { cardPts } from "@/lib/roomPts";

// Production flow order. Cards before Cut ("Staged" / no stage) are not in the flow.
export const STAGE_FLOW = ["cut", "face_frame", "spray", "build", "complete"];

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Points accumulated BY each stage: the total value of cards that have moved
 * past it. Derived from current card positions so it is always self-correcting:
 *   stagePoints(S) = sum(points) of cards whose current stage index > index(S)
 * A card contributes to every stage before the one it currently sits in, and
 * moving a card backwards removes its points from the stages it fell behind.
 */
export function computeStagePoints(items) {
  const totals = {};
  STAGE_FLOW.forEach((s) => { totals[s] = 0; });

  for (const item of items || []) {
    const idx = STAGE_FLOW.indexOf(item.stage);
    if (idx < 0) continue; // staged / on_hold cards never contribute
    const pts = cardPts(item);
    if (!pts) continue;
    for (let j = 0; j < idx; j++) totals[STAGE_FLOW[j]] += pts;
  }

  Object.keys(totals).forEach((k) => { totals[k] = round2(totals[k]); });
  return totals;
}

// Display helper: 15.25 -> "15.25", 6 -> "6"
export function formatStagePoints(value) {
  return String(round2(Number(value) || 0));
}