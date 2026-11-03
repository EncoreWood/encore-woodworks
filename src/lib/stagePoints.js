import { format } from "date-fns";

// Production flow order. Cards before Cut ("Staged" / no stage) are not in the flow.
export const STAGE_FLOW = ["cut", "face_frame", "spray", "build", "complete"];

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
 * `inboundStages` lists stages credited on arrival; every other stage is credited
 * on departure (where the work was finished). Returns { points, activeDays }.
 */
export function computeStagePoints(logs, inWindow, inboundStages = ["complete"]) {
  const net = {};   // `${itemId}|${stage}` → arrived − departed
  const value = {}; // `${itemId}|${stage}` → that card's points value
  const days = {};  // `${itemId}|${stage}` → Set of local days it moved

  for (const log of logs || []) {
    if (!log?.item_id || !log.moved_at) continue;
    if (!inWindow(log.moved_at)) continue;
    const pts = parseFloat(log.points_awarded) || 0;
    const dateStr = denverDateStr(log.moved_at);
    const bump = (stage, delta) => {
      if (!stage) return;
      const key = `${log.item_id}|${stage}`;
      net[key] = (net[key] || 0) + delta;
      if (!(key in value) || pts > value[key]) value[key] = pts;
      (days[key] = days[key] || new Set()).add(dateStr);
    };
    bump(log.from_column, -1); // departed a stage
    bump(log.to_column, 1);    // arrived in a stage
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