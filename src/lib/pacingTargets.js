import { addDays, endOfMonth, startOfMonth, startOfWeek } from "date-fns";
import { DAILY_TARGET, DAILY_MINIMUM } from "@/lib/productionPacing";

// Monday–Friday pacing: 20 pts target and 15 pts minimum per production day.
export const isWeekend = (date) => [0, 6].includes(date.getDay());

// A "yyyy-MM-dd" shop day as a local Date, never a UTC-midnight shift.
export const shopDay = (dateStr) => new Date(`${dateStr}T12:00:00`);

export function businessDaysBetween(from, to) {
  let count = 0;
  let cursor = new Date(from);
  while (cursor <= to) {
    if (!isWeekend(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function weekTargetPoints(ref) {
  const start = startOfWeek(ref, { weekStartsOn: 1 });
  return businessDaysBetween(start, addDays(start, 6)) * DAILY_TARGET;
}

export function monthTargetPoints(ref) {
  return businessDaysBetween(startOfMonth(ref), endOfMonth(ref)) * DAILY_TARGET;
}

// Cumulative pace for a window: the target/minimum steps up on each business day.
export function paceTargets(date, windowStart) {
  const elapsed = businessDaysBetween(windowStart, date);
  return { target: elapsed * DAILY_TARGET, minimum: elapsed * DAILY_MINIMUM };
}