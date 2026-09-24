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

// Split a legacy dimension string ("16 9/16 & 5 13/16" or "23 1/4, 11 7/8") into values
export function splitDimList(str) {
  if (!str) return [];
  return String(str).split(/\s*(?:&|,)\s*/).filter(Boolean);
}

// Legacy records: pair the width/length strings index-wise so each size shows separated
// (width "40 1/32 & 19 1/16" + length "8 & 4" → "40 1/32 x 8 & 19 1/16 x 4").
// Per-size quantities were never saved on legacy records, so the aggregate qty stays.
export function legacySizePairs(item) {
  const widths = splitDimList(item?.width);
  const lengths = splitDimList(item?.length);
  if (widths.length === 0 && lengths.length === 0) return null;
  const w = (i) => widths[i] ?? (widths.length ? widths[widths.length - 1] : "");
  const l = (i) => lengths[i] ?? (lengths.length ? lengths[lengths.length - 1] : "");
  const n = Math.max(widths.length, lengths.length);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const pair = [w(i), l(i)].filter(Boolean).join(" x ");
    if (pair) pairs.push(pair);
  }
  return pairs.join(" & ") || null;
}