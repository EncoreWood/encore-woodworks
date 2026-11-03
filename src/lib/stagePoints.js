import { format } from "date-fns";
import { cardPts } from "@/lib/roomPts";

// Production flow order. Cards before Cut ("Staged" / no stage) are not in the flow.
export const STAGE_FLOW = ["cut", "face_frame", "spray", "build", "complete"];

const round2 = (n) => Math.round(n * 100) / 100;

// Log timestamps are stored in UTC — compare them on the shop's local day.
export const denverDateStr = (value) =>
  format(new Date(new Date(value).toLocaleString("en-US", { timeZone: "America/Denver" })), "yyyy-MM-dd");

/**
 * Today's points for each stage = net value that moved OUT of that stage today.
 * Per card per stage: net = (# moves with from_column = S today) − (# moves with
 * to_column = S today). When net > 0 that card's points count once; net ≤ 0 adds
 * nothing. Derived from ColumnMoveLog, never from running counters.
 */
export function computeTodayStagePoints(items, logs, todayStr) {
  const itemsById = new Map((items || []).map((i) => [i.id, i]));
  const net = {};        // `${itemId}|${stage}` → net move-out count today
  const awarded = {};    // `${itemId}|${stage}` → best points_awarded seen today

  for (const log of logs || []) {
    if (!log?.item_id || !log.moved_at) continue;
    if (denverDateStr(log.moved_at) !== todayStr) continue;

    if (log.from_column) {
      const k = `${log.item_id}|${log.from_column}`;
      net[k] = (net[k] || 0) + 1;
      const p = parseFloat(log.points_awarded) || 0;
      if (!(k in awarded) || p > awarded[k]) awarded[k] = p;
    }
    if (log.to_column) {
      const k = `${log.item_id}|${log.to_column}`;
      net[k] = (net[k] || 0) - 1;
    }
  }

  const totals = {};
  STAGE_FLOW.forEach((s) => { totals[s] = 0; });

  for (const [key, count] of Object.entries(net)) {
    if (count <= 0) continue;
    const sep = key.lastIndexOf("|");
    const itemId = key.slice(0, sep);
    const stage = key.slice(sep + 1);
    if (!(stage in totals)) continue; // on_hold / staged moves don't count toward a stage

    // Historical rows often log points_awarded 0 even when the card has points,
    // so use the card's own value first and only fall back to the logged award.
    const cardValue = cardPts(itemsById.get(itemId));
    const value = cardValue > 0 ? cardValue : (awarded[key] || 0);
    totals[stage] += value;
  }

  Object.keys(totals).forEach((k) => {
    totals[k] = round2(Math.max(0, totals[k]));
  });
  return totals;
}

// Display helper: 15.25 → "15.25", 6 → "6"
export function formatStagePoints(value) {
  return String(round2(Number(value) || 0));
}