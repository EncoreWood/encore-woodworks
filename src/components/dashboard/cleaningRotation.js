import { format, startOfWeek, addDays } from "date-fns";

export function getWeekMonday(date) {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

export function getDateForDayName(weekStart, dayName) {
  const days = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };
  const offset = days[dayName] ?? 0;
  const base = new Date(weekStart + "T00:00:00");
  return format(addDays(base, offset), "MMM d");
}

/**
 * Get the rotation pool from stored schedules.
 * Uses the latest rotation_pool field; falls back to building from rotating_person history.
 */
export function getRotationPool(schedules, archivedNames) {
  const sorted = [...schedules]
    .filter(s => s.week_start)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  // Use rotation_pool from the latest record that has it
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].rotation_pool && sorted[i].rotation_pool.length > 0) {
      return sorted[i].rotation_pool.filter(p => !archivedNames.has(p));
    }
  }

  // Fallback: build from all rotating_person fields (legacy)
  const pool = [];
  sorted.forEach(cs => {
    if (cs.rotating_person) {
      cs.rotating_person.split(", ").map(s => s.trim()).filter(Boolean).forEach(p => {
        if (!pool.includes(p) && !archivedNames.has(p)) pool.push(p);
      });
    }
  });
  return pool;
}

/**
 * Compute the 2-person rotating pair for a given week.
 * - For exact-match weeks: uses the stored rotating_person (first 2 non-archived).
 * - For projected weeks: uses rotation index based on last stored reference + weeks ahead.
 */
export function computeRotatingPair(schedules, weekMonday, pool, archivedNames) {
  if (pool.length < 2) return pool.slice(0, 2);

  const sorted = [...schedules]
    .filter(s => s.week_start)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  // Exact match: use stored pair (first 2 non-archived)
  const exactMatch = sorted.find(s => s.week_start === weekMonday);
  if (exactMatch && exactMatch.rotating_person) {
    const storedPair = exactMatch.rotating_person
      .split(", ").map(s => s.trim()).filter(Boolean)
      .filter(p => !archivedNames.has(p))
      .slice(0, 2);
    if (storedPair.length >= 2) return storedPair;
  }

  // Projected: compute using rotation index
  const targetMon = new Date(weekMonday + "T00:00:00");
  let refCs = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const csMon = new Date(sorted[i].week_start + "T00:00:00");
    if (csMon <= targetMon) {
      refCs = sorted[i];
      break;
    }
  }
  if (!refCs) return [pool[0], pool[1]];

  const refMon = new Date(refCs.week_start + "T00:00:00");
  const weeksDiff = Math.round((targetMon - refMon) / (7 * 24 * 60 * 60 * 1000));

  const refPair = (refCs.rotating_person || "")
    .split(", ").map(s => s.trim()).filter(Boolean)
    .filter(p => !archivedNames.has(p));

  let refIdx = refPair.length > 0 ? pool.indexOf(refPair[0]) : 0;
  if (refIdx < 0) refIdx = 0;

  const globalIdx = refIdx + weeksDiff * 2;
  const p1 = pool[globalIdx % pool.length];
  const p2 = pool[(globalIdx + 1) % pool.length];
  return [p1, p2];
}