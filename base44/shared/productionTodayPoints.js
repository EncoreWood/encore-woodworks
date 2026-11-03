// The production flow, in order. "On Hold" is deliberately absent: it is a parking
// status, not a stage, so it never earns points and never sits between two stages.
export const todayPointFlow = ["staged", "cut", "face_frame", "spray", "build", "complete"];

// Statuses that park a card without moving it through the flow. A card parked here is
// still sitting in the stage it came from, so its moves never award or remove points.
export const parkingStages = ["on_hold"];

export function denverDay(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const stageIndex = stage => todayPointFlow.indexOf(stage == null || stage === "" ? "staged" : stage);

const isParking = stage => parkingStages.includes(stage);

/**
 * The card's genuine stage trail. Every move that touches a parking status is rewritten
 * so the card simply stays where it was:
 *   spray → on_hold   becomes  spray → spray   (no move)
 *   on_hold → spray   becomes  spray → spray   (resuming in place)
 *   on_hold → build   becomes  spray → build   (it really did leave spray)
 * Rows keep their timestamp, so day windows still work.
 */
export function genuineStageMoves(item) {
  const moves = (item.stage_move_log || [])
    .filter(move => move.timestamp && Number.isFinite(new Date(move.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const trail = [];
  let stage = null; // the genuine stage the card is actually sitting in
  for (const move of moves) {
    const fromRaw = move.from_stage == null || move.from_stage === "" ? "staged" : move.from_stage;
    const toRaw = move.to_stage == null || move.to_stage === "" ? "staged" : move.to_stage;
    // Parked cards resume from the stage they were parked in; if that stage is not in
    // the (14-day) log, treat it as resuming in place rather than inventing a stage.
    const from = isParking(fromRaw) ? (stage ?? toRaw) : fromRaw;
    const to = isParking(toRaw) ? from : toRaw;
    trail.push({ ...move, from_stage: from, to_stage: to });
    if (stageIndex(to) >= 0) stage = to;
  }
  return trail;
}

// Only ProductionItem fields participate; a stored zero stays zero.
export function addTodayCardPoints(totals, items, day) {
  for (const item of items) {
    const points = Number(item.total_points);
    if (!Number.isFinite(points)) continue;

    const trail = genuineStageMoves(item);
    // A card parked on hold is still in the last stage it genuinely reached.
    const direct = stageIndex(item.stage);
    const currentIndex = direct >= 0
      ? direct
      : (trail.length ? stageIndex(trail[trail.length - 1].to_stage) : -1);
    if (currentIndex < 0) continue;

    let minimumIndex = Infinity;
    for (const move of trail) {
      if (denverDay(move.timestamp) !== day) continue;
      for (const stage of [move.from_stage, move.to_stage]) {
        const index = stageIndex(stage);
        if (index >= 0) minimumIndex = Math.min(minimumIndex, index);
      }
    }
    for (let index = minimumIndex; index < currentIndex; index++) {
      totals[todayPointFlow[index]] += points;
    }
  }
}