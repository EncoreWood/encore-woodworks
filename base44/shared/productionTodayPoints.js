// The production flow, in order. "On Hold" and "Missing" are deliberately absent: they
// are parking statuses, not stages, so they never earn points and never sit between two
// stages. A missing-items card waits in "missing" until it is sent to production.
export const todayPointFlow = ["staged", "cut", "face_frame", "spray", "build", "complete"];

// Statuses that park a card without moving it through the flow. A card parked here is
// still sitting in the stage it came from, so its moves never award or remove points.
export const parkingStages = ["on_hold", "missing"];

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
 * What a move was worth when it happened. Every move written from now on carries its
 * own `points` snapshot, so editing a card's points later can never rewrite a past day.
 * Moves written before the snapshot existed fall back to the card's stored total_points.
 */
export function movePoints(move, fallbackPoints) {
  const snapshot = move?.points;
  if (snapshot !== undefined && snapshot !== null && Number.isFinite(Number(snapshot))) return Number(snapshot);
  const fallback = Number(fallbackPoints);
  return Number.isFinite(fallback) ? fallback : 0;
}

/**
 * The card's genuine stage trail. Every move that touches a parking status is rewritten
 * so the card simply stays where it was:
 *   spray → on_hold   becomes  spray → spray   (no move)
 *   on_hold → spray   becomes  spray → spray   (resuming in place)
 *   on_hold → build   becomes  spray → build   (it really did leave spray)
 * Rows keep their timestamp, so day windows still work.
 */
export function genuineStageMoves(item) {
  // A card written before the trail existed (or holding a damaged value) simply has
  // no moves — never assume the array is there.
  const log = Array.isArray(item?.stage_move_log) ? item.stage_move_log : [];
  const moves = log
    .filter(move => move && move.timestamp && Number.isFinite(new Date(move.timestamp).getTime()))
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
 * One card's point value plus its genuine, timestamped moves. Returns null when the
 * card cannot be read at all, so a single damaged record is skipped instead of
 * failing the whole calculation and zeroing every column with it.
 */
function readCard(item) {
  try {
    const stored = Number(item?.total_points);
    const fallbackPoints = Number.isFinite(stored) ? stored : 0;
    return {
      fallbackPoints,
      currentIndex: stageIndex(item?.stage),
      moves: genuineStageMoves(item).map(move => ({
        at: new Date(move.timestamp).getTime(),
        fromIdx: stageIndex(move.from_stage),
        toIdx: stageIndex(move.to_stage),
        // The move's own snapshot — never today's edited card value
        points: movePoints(move, fallbackPoints)
      }))
    };
  } catch (error) {
    console.error("Skipped a production card in the points tally:", error);
    return null;
  }
}

/**
 * Production stages keep their existing per-day departure/stage-crossing rule.
 * Complete is the exception: credit each card that arrived during the requested
 * Denver window and remained finished at its end, once per card. A later departure
 * within that window cancels the arrival; completing it again restores one credit.
 * Historical windows stop at their own midnight, not the card's live stage today.
 * Only ProductionItem.total_points supplies point values. On Hold stays parking.
 */
function buildCards(items) {
  const cards = [];
  for (const item of Array.isArray(items) ? items : []) {
    const card = readCard(item);
    if (card) cards.push(card);
  }
  return cards;
}

// Every stage figure for `days`, from cards that were read once.
function totalsForCards(cards, days) {
  const totals = Object.fromEntries(todayPointFlow.map(stage => [stage, 0]));
  const today = denverDay();

  // Complete counts arrivals, not departures. Evaluate the entire D/W/M window
  // together so repeated completion/rework cycles never count a card twice.
  const windowStartDay = denverDayStart(days[0]);
  const windowEndDay = denverDayStart(nextDenverDay(days[days.length - 1]));
  if (!windowStartDay || !windowEndDay) return totals;
  const windowStart = windowStartDay.getTime();
  const windowEnd = windowEndDay.getTime();
  const completeIndex = stageIndex("complete");
  for (const card of cards) {
    let arrivedPoints = null;
    let finished = false;
    for (const move of card.moves) {
      if (move.at < windowStart || move.at >= windowEnd || move.fromIdx === move.toIdx) continue;
      if (move.toIdx === completeIndex && arrivedPoints === null) arrivedPoints = move.points;
      finished = move.toIdx === completeIndex;
    }
    if (arrivedPoints !== null && finished) totals.complete += arrivedPoints;
  }

  for (const day of days) {
    const startDay = denverDayStart(day);
    const endDay = denverDayStart(nextDenverDay(day));
    if (!startDay || !endDay) continue;
    const start = startDay.getTime();
    const end = endDay.getTime();
    for (const card of cards) {
      if (!card.moves.length) continue;
      // Stages the card was actually sitting in and left that day → the points that
      // move was worth at the time. Never today's card value.
      const leftThatDay = new Map();
      let stageAtEnd = -1;
      for (const move of card.moves) {
        if (move.at >= start && move.at < end && move.fromIdx >= 0 && !leftThatDay.has(move.fromIdx)) {
          leftThatDay.set(move.fromIdx, move.points);
        }
        if (move.at < end && move.toIdx >= 0) stageAtEnd = move.toIdx;
      }
      // Nothing left a stage that day: the card earns nothing for it.
      if (!leftThatDay.size) continue;
      // A card's live stage is authoritative for the running day; past days read the
      // stage the card ended that day in. Stages at or beyond that point stay uncredited,
      // which is what makes a send-back net to zero and cancels a stage merely passed through.
      const currentIndex = day >= today && card.currentIndex >= 0 ? card.currentIndex : stageAtEnd;
      if (currentIndex < 0) continue;
      for (const [index, movePointsValue] of leftThatDay) {
        if (index < currentIndex) totals[todayPointFlow[index]] += movePointsValue;
      }
    }
  }

  return totals;
}

/**
 * The same day rules, one row per day. The week and month pacing charts sum these,
 * and the cards are read once for every day in the list.
 */
export function getPointsByDay(items, days) {
  const cards = buildCards(items);
  return (Array.isArray(days) ? days : []).map(day => {
    const raw = totalsForCards(cards, [day]);
    return {
      date: day,
      points: Object.fromEntries(todayPointFlow.map(stage => [stage, Math.round(raw[stage] * 100) / 100]))
    };
  });
}

export function getStageDayPoints(items, from, to) {
  const totals = Object.fromEntries(todayPointFlow.map(stage => [stage, 0]));
  const days = listDenverDays(from, to);
  if (!days.length) return totals;
  const raw = totalsForCards(buildCards(items), days);
  for (const stage of todayPointFlow) totals[stage] = Math.round(raw[stage] * 100) / 100;
  return totals;
}

/**
 * The same day rules as getStageDayPoints, expressed as a running timeline so the
 * pacing chart can draw the line the stage totals end on. Each stage returns
 * [minuteOfDenverDay, cumulativePoints] steps; the final value equals that stage's
 * getStageDayPoints figure for the day. Production stages step on the first departure
 * they were credited for; Complete steps up on arrival and back down on send-back.
 */
export function getStageDaySeries(items, day) {
  const series = Object.fromEntries(todayPointFlow.map(stage => [stage, []]));
  const start = denverDayStart(day);
  if (!start) return series;
  const startMs = start.getTime();
  const endDay = denverDayStart(nextDenverDay(day));
  if (!endDay) return series;
  const endMs = endDay.getTime();
  const minuteOf = ms => Math.round((ms - startMs) / 60000);
  const today = denverDay();
  const completeIndex = stageIndex("complete");
  const deltas = Object.fromEntries(todayPointFlow.map(stage => [stage, []]));

  for (const item of Array.isArray(items) ? items : []) {
    const card = readCard(item);
    if (!card) continue;
    const { moves } = card;
    const todaysMoves = moves.filter(move => move.at >= startMs && move.at < endMs);
    if (!todaysMoves.length) continue;

    let stageAtEnd = -1;
    for (const move of moves) if (move.at < endMs && move.toIdx >= 0) stageAtEnd = move.toIdx;
    // The running day reads the card's live stage, exactly like the totals do.
    const finalIndex = day >= today ? stageIndex(item.stage) : stageAtEnd;

    const credited = new Set();
    for (const move of todaysMoves) {
      if (move.fromIdx < 0 || credited.has(move.fromIdx) || move.fromIdx >= finalIndex) continue;
      credited.add(move.fromIdx);
      deltas[todayPointFlow[move.fromIdx]].push([minuteOf(move.at), move.points]);
    }

    let counted = false;
    for (const move of todaysMoves) {
      if (move.toIdx === completeIndex && !counted) {
        counted = true;
        deltas.complete.push([minuteOf(move.at), move.points]);
      } else if (move.fromIdx === completeIndex && counted) {
        counted = false;
        deltas.complete.push([minuteOf(move.at), -move.points]);
      }
    }
  }

  for (const stage of todayPointFlow) {
    let running = 0;
    series[stage] = deltas[stage]
      .sort((a, b) => a[0] - b[0])
      .map(([minute, delta]) => {
        running += delta;
        return [minute, Math.round(running * 100) / 100];
      });
  }
  return series;
}