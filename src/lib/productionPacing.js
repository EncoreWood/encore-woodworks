// Pacing display math only. Point values always come from getProductionTodayPoints
// (shared/productionTodayPoints.js) — nothing here calculates earned points.

import { DEFAULT_MINIMUM, DEFAULT_TARGET } from "@/lib/pacingSettings";

// Fallback for the moments before the settings read lands — never a second source of truth.
export const FALLBACK_TARGETS = { target: DEFAULT_TARGET, minimum: DEFAULT_MINIMUM };

// Minutes from midnight, shop time (America/Denver).
export const DAY_START = 7 * 60;              // 7:00 — chart opens
export const DAY_END = 17 * 60 + 30;          // 5:30 — chart closes
export const PRODUCTION_BLOCKS = [
  [8 * 60 + 5, 12 * 60],                      // 8:05 – 12:00 (235 min)
  [12 * 60 + 30, 17 * 60 + 15],               // 12:30 – 5:15 (285 min)
];
export const PRODUCTION_MINUTES = 520;

export const NON_PRODUCTION_BLOCKS = [
  { start: 7 * 60, end: 7 * 60 + 45, label: "Lean / 2s" },
  { start: 7 * 60 + 45, end: 8 * 60 + 5, label: "Morning Meeting" },
  { start: 12 * 60, end: 12 * 60 + 30, label: "Lunch" },
  { start: 17 * 60 + 15, end: 17 * 60 + 30, label: "Cleanup" },
];

export const CHECKPOINTS = [485, 540, 600, 660, 720, 750, 780, 840, 900, 960, 1020, 1035];

// Production minutes used up by a given wall-clock minute.
export function productionMinutesAt(minute) {
  let total = 0;
  for (const [start, end] of PRODUCTION_BLOCKS) {
    if (minute <= start) break;
    total += Math.min(minute, end) - start;
  }
  return total;
}

// Pace value for a daily total at a wall-clock minute (flat during non-production).
export function paceAt(minute, dailyPoints) {
  return Math.round((dailyPoints * productionMinutesAt(minute)) / PRODUCTION_MINUTES * 100) / 100;
}

export function formatClock(minute) {
  const h24 = Math.floor(minute / 60);
  const m = Math.round(minute % 60);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatShortClock(minute) {
  const h24 = Math.floor(minute / 60);
  const m = Math.round(minute % 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}${h24 >= 12 ? "p" : "a"}`;
}

// The shop clock right now, as minutes from midnight in Denver.
export function denverMinuteNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", hour12: false, hour: "2-digit", minute: "2-digit",
  }).formatToParts(now).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return hour * 60 + Number(parts.minute);
}

// Cumulative value carried forward from the server's step series.
export function valueAt(series, minute) {
  let value = 0;
  for (const [at, points] of series || []) {
    if (at > minute) break;
    value = points;
  }
  return value;
}

// Chart rows across the visible window, so every pace block edge and every move lands
// on a point and the pace lines stay flat through breaks.
export function buildPacingRows(series, uptoMinute, from = DAY_START, targets = FALLBACK_TARGETS) {
  const end = Math.max(from, Math.min(uptoMinute, DAY_END));
  const marks = new Set([from, end, DAY_START, DAY_END]);
  PRODUCTION_BLOCKS.forEach(([start, finish]) => { marks.add(start); marks.add(finish); });
  NON_PRODUCTION_BLOCKS.forEach(({ start, end: finish }) => { marks.add(start); marks.add(finish); });
  (series || []).forEach(([at]) => { if (at > from && at < end) marks.add(at); });
  return [...marks]
    .filter(minute => minute >= from && minute <= end)
    .sort((a, b) => a - b)
    .map(minute => ({
      minute,
      actual: valueAt(series, minute),
      target: paceAt(minute, targets.target),
      minimum: paceAt(minute, targets.minimum),
    }));
}

// The same rows as buildPacingRows, but carrying a running value for every stage, so
// one chart can draw several areas at once. Each stage's step series comes straight
// from the shared points function — nothing is recalculated here.
export function buildAreaPacingRows(seriesByStage, stages, uptoMinute, from = DAY_START, targets = FALLBACK_TARGETS) {
  const end = Math.max(from, Math.min(uptoMinute, DAY_END));
  // Block edges are marks too, so the paced target steps exactly where production
  // resumes instead of smearing across a break.
  const marks = new Set([from, end, DAY_START, DAY_END]);
  PRODUCTION_BLOCKS.forEach(([start, finish]) => { marks.add(start); marks.add(finish); });
  NON_PRODUCTION_BLOCKS.forEach(({ start, end: finish }) => { marks.add(start); marks.add(finish); });
  (stages || []).forEach(stage => {
    (seriesByStage?.[stage] || []).forEach(([at]) => {
      if (at > from && at < end) marks.add(at);
    });
  });
  return [...marks]
    .filter(minute => minute >= from && minute <= end)
    .sort((a, b) => a - b)
    .map(minute => {
      const row = { minute, target: paceAt(minute, targets.target), minimum: paceAt(minute, targets.minimum) };
      (stages || []).forEach(stage => {
        row[stage] = valueAt(seriesByStage?.[stage], minute);
      });
      return row;
    });
}

// The day's total at 5:30 PM on today's rate. Production minutes stop at DAY_END, so a
// rate read after the shop closes projects the number already on the board instead of
// extrapolating into the evening.
export function projectedFinish(completed, minute) {
  const elapsed = productionMinutesAt(Math.min(minute, DAY_END));
  if (elapsed <= 0) return null;
  return Math.round((completed / elapsed) * PRODUCTION_MINUTES * 10) / 10;
}