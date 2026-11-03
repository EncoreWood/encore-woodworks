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

// Window helpers for the shared tally below.
export const dayWindow = (dateStr) => (at) => denverDateStr(at) === dateStr;
export const sinceWindow = (dateStr) => (at) => denverDateStr(at) >= dateStr;

/**
 * Points per stage, read straight off ColumnMoveLog. Every move row carries the
 * card's own points value in `points_awarded`, so a card counts once per stage per
 * window — and only when its NET direction is the one that stage is credited for:
 *   net > 0 → the card arrived in the stage
 *   net < 0 → the card left the stage
 * A move out and a move back therefore cancel each other out.
 *
 * Moves that touch a parking status (On Hold) are walked in order and rewritten as if
 * the card never moved — parking earns nothing, and a resume out of parking counts as
 * leaving the stage the card was actually sitting in.
 *
 * `inboundStages` lists stages credited on arrival; every other stage is credited
 * on departure (where the work was finished). Returns { points, activeDays }.
 */
export function computeStagePoints(logs, inWindow, inboundStages = ["complete"]) {
  const net = {};   // `${itemId}|${stage}` → arrived − departed
  const value = {}; // `${itemId}|${stage}` → that card's points value
  const days = {};  // `${itemId}|${stage}` → Set of local days it moved

  const byItem = new Map();
  for (const log of logs || []) {
    if (!log?.item_id || !log.moved_at) continue;
    if (!byItem.has(log.item_id)) byItem.set(log.item_id, []);
    byItem.get(log.item_id).push(log);
  }

  for (const [itemId, itemLogs] of byItem) {
    itemLogs.sort((a, b) => new Date(a.moved_at) - new Date(b.moved_at));
    let parked = null; // the genuine stage the card is actually sitting in
    for (const log of itemLogs) {
      const fromRaw = log.from_column || "";
      const toRaw = log.to_column || "";
      // On Hold is a parking status: the card stays where it was, and a resume out of
      // parking leaves that same stage.
      const from = PARKING_STATUSES.includes(fromRaw) ? parked : fromRaw;
      const to = PARKING_STATUSES.includes(toRaw) ? from : toRaw;
      if (to && !PARKING_STATUSES.includes(to)) parked = to;
      if (!from && !to) continue;
      if (from && to && from === to) continue; // parking round-trip: no move at all
      if (!inWindow(log.moved_at)) continue;

      const pts = parseFloat(log.points_awarded) || 0;
      const dateStr = denverDateStr(log.moved_at);
      const bump = (stage, delta) => {
        if (!stage) return;
        const key = `${itemId}|${stage}`;
        net[key] = (net[key] || 0) + delta;
        if (!(key in value) || pts > value[key]) value[key] = pts;
        (days[key] = days[key] || new Set()).add(dateStr);
      };
      bump(from, -1); // departed a stage
      bump(to, 1);    // arrived in a stage
    }
  }

  const points = {};
  const activeDays = {};
  const stageDays = {};
  STAGE_FLOW.forEach((s) => { points[s] = 0; activeDays[s] = 0; stageDays[s] = new Set(); });

  for (const [key, n] of Object.entries(net)) {
    const stage = key.slice(key.lastIndexOf("|") + 1);
    if (!(stage in points)) continue; // staged / on-hold moves aren't a counted stage
    const counted = inboundStages.includes(stage) ? n : -n;
    if (counted <= 0) continue;
    points[stage] += value[key] || 0;
    days[key].forEach((d) => stageDays[stage].add(d));
  }

  Object.keys(points).forEach((k) => {
    points[k] = round2(Math.max(0, points[k]));
    activeDays[k] = stageDays[k].size;
  });
  return { points, activeDays };
}

// Display helper: 15.25 → "15.25", 6 → "6"
export function formatStagePoints(value) {
  return String(round2(Number(value) || 0));
}