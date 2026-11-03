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

// Every Denver day from `from` through `to` (inclusive). A window total is then just
// the sum of those days' pills, so a week/month figure can never drift from the day.
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
 * Points a stage earned on the given Denver days: one logged move per departure, each
 * carrying the points awarded at the moment the card left that stage.
 *
 * Every day is read from that day's own rows — no card history is walked forward to its
 * present stage — so a week or month total is exactly the sum of its days and one stage's
 * points can never land in another stage's bucket.
 */
export function addMoveLogPoints(totals, rows, days) {
  const wanted = new Set(days);
  for (const row of rows) {
    const day = denverDay(row.moved_at);
    if (!day || !wanted.has(day)) continue;
    const points = Number(row.points_awarded);
    if (!Number.isFinite(points) || points <= 0) continue;
    if (!(row.from_column in totals)) continue; // staged/cut-entry and on_hold earn nothing here
    totals[row.from_column] += points;
  }
}