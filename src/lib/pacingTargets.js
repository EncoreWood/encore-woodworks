import { addDays, endOfMonth, startOfMonth, startOfWeek } from "date-fns";
import { DEFAULT_MINIMUM, DEFAULT_TARGET } from "@/lib/pacingSettings";

// Monday–Friday pacing. Every figure is a multiple of the daily target/minimum, which
// live in settings — never a hardcoded 20/15.
export const isWeekend = (date) => [0, 6].includes(date.getDay());

// A "yyyy-MM-dd" shop day as a local Date, never a UTC-midnight shift.
export const shopDay = (dateStr) => new Date(`${dateStr}T12:00:00`);

const TARGETS = { target: DEFAULT_TARGET, minimum: DEFAULT_MINIMUM };

export function businessDaysBetween(from, to) {
  let count = 0;
  let cursor = new Date(from);
  while (cursor <= to) {
    if (!isWeekend(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

const businessDaysSoFar = (from, ref) => businessDaysBetween(from, ref);

// Week target: the daily target × business days elapsed in the week so far.
export function weekTargetPoints(ref, target = TARGETS.target) {
  const start = startOfWeek(ref, { weekStartsOn: 1 });
  return businessDaysSoFar(start, ref) * target;
}

// Month target: the daily target × business days elapsed in the month so far.
export function monthTargetPoints(ref, target = TARGETS.target) {
  return businessDaysSoFar(startOfMonth(ref), ref) * target;
}

// The app's four-month quarter window, matching the points window the board uses.
export function quarterStart(ref) {
  return new Date(ref.getFullYear(), Math.floor(ref.getMonth() / 4) * 4, 1);
}

export function quarterTargetPoints(ref, target = TARGETS.target) {
  return businessDaysSoFar(quarterStart(ref), ref) * target;
}

// Days remaining in the month, used by window labels.
export function businessDaysInMonth(ref) {
  return businessDaysBetween(startOfMonth(ref), endOfMonth(ref));
}

// Cumulative pace for a window: the target/minimum steps up on each business day.
export function paceTargets(date, windowStart, targets = TARGETS) {
  const elapsed = businessDaysBetween(windowStart, date);
  return { target: elapsed * targets.target, minimum: elapsed * targets.minimum };
}