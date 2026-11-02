// Room-level production progress, averaged across every card in the room.
// Stages follow the production board metrics: Face Frame → Spray → Build → Complete.
export const STAGE_PROGRESS = {
  face_frame: 25,
  spray: 50,
  build: 75,
  complete: 100,
};

/**
 * A card's contribution to room progress. A card with no stage yet (still staged),
 * sitting in Cut, or on hold has not started its stage run — it counts as 0%.
 */
export const cardProgress = (item) => STAGE_PROGRESS[item?.stage] ?? 0;

/**
 * Simple average of every card's stage percentage — deliberately not weighted by
 * points, since many cards carry 0 points and that would distort the result.
 * Returns { pct, cardCount, completeCount }.
 */
export function roomProgress(items = []) {
  const cards = (items || []).filter((i) => i && !i.is_job_info);
  if (cards.length === 0) return { pct: 0, cardCount: 0, completeCount: 0 };

  const total = cards.reduce((sum, item) => sum + cardProgress(item), 0);
  return {
    pct: Math.round(total / cards.length),
    cardCount: cards.length,
    completeCount: cards.filter((i) => i.stage === "complete").length,
  };
}