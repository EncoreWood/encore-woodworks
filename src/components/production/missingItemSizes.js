// Per-size quantity helpers for missing items.
// New records store size_breakdown: [{qty, width, length}] — quantity per size.
// Legacy records only have the aggregate quantity plus free-text width/length strings.

export function getSizeBreakdown(item) {
  const rows = (item?.size_breakdown || []).filter(s => s && (s.qty || s.width || s.length));
  return rows.length > 0 ? rows : null;
}

// "1@ 20 x 5 13/16 & 2@ 20 x 8 13/16" — or null when the item has no per-size breakdown
export function sizeSummary(item) {
  const rows = getSizeBreakdown(item);
  if (!rows) return null;
  return rows.map(s => {
    const dims = [s.width, s.length].filter(Boolean).join(" x ");
    return `${s.qty != null ? `${s.qty}@ ` : ""}${dims}`.trim();
  }).join(" & ");
}

export function totalQty(item) {
  const rows = getSizeBreakdown(item);
  if (rows) return rows.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
  return item?.quantity ?? null;
}