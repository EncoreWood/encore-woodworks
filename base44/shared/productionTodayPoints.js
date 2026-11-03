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

// Midday guess, then correct by the zone's offset, so DST never lands the boundary
// an hour off the shop's midnight.
export function denverDayStart(day) {
  const noon = new Date(`${day}T12:00:00.000Z`);
  if (!Number.isFinite(noon.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(noon).map(part => [part.type, part.value]));
  const wall = Date.parse(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}:${parts.second}.000Z`
  );
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - (wall - noon.getTime()));
}

const nextDenverDay = day =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
    // the log, treat it as resuming in place rather than inventing a stage.
    const from = isParking(fromRaw) ? (stage ?? toRaw) : fromRaw;
    const to = isParking(toRaw) ? from : toRaw;
    trail.push({ ...move, from_stage: from, to_stage: to });
    if (stageIndex(to) >= 0) stage = to;
  }
  return trail;
}

// Every Denver day from `from` through `to` (inclusive). A window total is then just
// the sum of those days, so a week/month figure can never drift from the day.
export function listDenverDays(from, to) {
  const days = [];
  let cursor = new Date(`${from}T12:00:00.000Z`);
  if (!Number.isFinite(cursor.getTime())) return days;
  for (let step = 0; step < 400; step++) {
    const day = denverDay(cursor);
    if (!day || day > to) break;
    if (day >= from) days.push(day);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
}

/**
 * THE points calculation. Per stage, per day, from the cards themselves.
 *
 * A card credits every stage it crossed that day: from the lowest stage it touched
 * (minIdx) up to, but not including, the stage it ended the day in (curIdx). That one
 * rule gets three things right that per-move accumulation cannot:
 *   - a card sent back (build → spray) nets to zero for the stage it was sent back out of,
 *     because its current stage is read as the one it actually sits in;
 *   - a card that only passed through Build for three minutes before being sent back to
 *     Spray contributes nothing to Build;
 *   - a card that reached Complete today has still not left Complete, so Complete earns 0.
 * The card's own `total_points` is the value used — never a per-move `points_awarded`,
 * which can be 0 for a move that really happened. On Hold is parking, so it is excluded
 * from the flow entirely.
 *
 * @param {Array} items ProductionItem records (stage, stage_move_log, total_points)
 * @param {string} from Denver day "YYYY-MM-DD"
 * @param {string} to   Denver day "YYYY-MM-DD"
 * @returns {Object} points per stage, e.g. { staged: 0, cut: 0, face_frame: 3, ... }
 */
export function getStageDayPoints(items, from, to) {
  const totals = Object.fromEntries(todayPointFlow.map(stage => [stage, 0]));
  const days = listDenverDays(from, to);
  if (!days.length) return totals;

  const today = denverDay();
  const cards = (items || []).map(item => {
    const points = Number(item.total_points);
    return {
      points: Number.isFinite(points) ? points : 0,
      currentIndex: stageIndex(item.stage),
      moves: genuineStageMoves(item).map(move => ({
        at: new Date(move.timestamp).getTime(),
        fromIdx: stageIndex(move.from_stage),
        toIdx: stageIndex(move.to_stage)
      }))
    };
  });

  for (const day of days) {
    const start = denverDayStart(day).getTime();
    const end = denverDayStart(nextDenverDay(day)).getTime();
    for (const card of cards) {
      if (!card.points) continue;
      const leftThatDay = new Set(); // stages the card was actually sitting in and left
      let stageAtEnd = -1;
      for (const move of card.moves) {
        if (move.at >= start && move.at < end && move.fromIdx >= 0) leftThatDay.add(move.fromIdx);
        if (move.at < end && move.toIdx >= 0) stageAtEnd = move.toIdx;
      }
      // Nothing left a stage that day: the card earns nothing for it.
      if (!leftThatDay.size) continue;
      // A card's live stage is authoritative for the running day; past days read the
      // stage the card ended that day in. Stages at or beyond that point stay uncredited,
      // which is what makes a send-back net to zero and cancels a stage merely passed through.
      const currentIndex = day >= today && card.currentIndex >= 0 ? card.currentIndex : stageAtEnd;
      if (currentIndex < 0) continue;
      for (const index of leftThatDay) {
        if (index < currentIndex) totals[todayPointFlow[index]] += card.points;
      }
    }
  }

  for (const stage of todayPointFlow) totals[stage] = Math.round(totals[stage] * 100) / 100;
  return totals;
}