// Calculates the "Orders" milestone completion percentage from real
// ProjectOrder records for a project. Categories without a record are
// excluded (they haven't been assessed); "not_applicable" is also excluded.
//
// Status → score:
//   not_ordered        → 0
//   partially_ordered   → 50
//   ordered            → 100
//   in_production       → 100  (order placed, supplier building)
//   received           → 100  (material on hand)
//   installed          → 100
export const ORDER_STATUS_SCORE = {
  not_ordered: 0,
  partially_ordered: 50,
  ordered: 100,
  in_production: 100,
  received: 100,
  installed: 100,
};

const EXCLUDED_STATUSES = new Set(["not_applicable"]);

// Returns 0–100, or null when there are no applicable order records yet.
export function calcOrdersCompletion(orders) {
  const scored = (orders || []).filter(o => o && o.order_type && !EXCLUDED_STATUSES.has(o.status));
  if (scored.length === 0) return null;
  const total = scored.reduce((s, o) => s + (ORDER_STATUS_SCORE[o.status] ?? 0), 0);
  return Math.round(total / scored.length);
}

// Map a calculated percentage to the 3-state progress_status used by the
// client-facing milestone widget: 0 = not_started, 1–99 = in_progress, 100 = completed.
export function ordersStatusFromPct(pct) {
  if (pct === null || pct === undefined) return "not_started";
  if (pct >= 100) return "completed";
  if (pct > 0) return "in_progress";
  return "not_started";
}