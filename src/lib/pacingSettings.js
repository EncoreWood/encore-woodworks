// Daily pacing targets live in DashboardSettings (section "pacing") as a JSON string.
// Values are effective-dated: every change writes a history entry for the shop day it
// happened on, so a review of a past day keeps the target it was actually measured
// against. Days before the first entry fall back to the values in effect back then.

export const DEFAULT_TARGET = 20;
export const DEFAULT_MINIMUM = 15;
export const PACING_SECTION = "pacing";
export const HISTORY_BASELINE = "2000-01-01";

const asPositive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

// Always returns a usable config, even for an install that never set anything.
export function normalizePacingConfig(raw) {
  const target = asPositive(raw?.daily_target_points) ?? DEFAULT_TARGET;
  const minimum = asPositive(raw?.daily_minimum_points) ?? DEFAULT_MINIMUM;
  const history = Array.isArray(raw?.history)
    ? raw.history
        .filter(entry => typeof entry?.from === "string" && asPositive(entry.daily_target_points) && asPositive(entry.daily_minimum_points))
        .map(entry => ({
          from: entry.from,
          daily_target_points: Number(entry.daily_target_points),
          daily_minimum_points: Number(entry.daily_minimum_points),
        }))
        .sort((a, b) => a.from.localeCompare(b.from))
    : [];
  return { daily_target_points: target, daily_minimum_points: minimum, history };
}

// The target/minimum that applied on a shop day ("yyyy-MM-dd").
export function resolvePacingTargets(config, dateStr) {
  const current = { target: config.daily_target_points, minimum: config.daily_minimum_points };
  if (!dateStr || !config.history.length) return current;
  let chosen = null;
  for (const entry of config.history) {
    if (entry.from <= dateStr) chosen = entry;
    else break;
  }
  if (!chosen) return current;
  return { target: chosen.daily_target_points, minimum: chosen.daily_minimum_points };
}

export function validatePacingTargets({ target, minimum }) {
  if (!(Number(target) > 0)) return "Daily target must be greater than 0.";
  if (!(Number(minimum) > 0)) return "Daily minimum must be greater than 0.";
  if (Number(minimum) > Number(target)) return "Daily minimum can't be higher than the daily target.";
  return null;
}

// Apply a change made today: today and every later day move to the new values, while
// earlier days keep resolving to whatever was in effect before (a baseline entry is
// seeded on the first change so yesterday can never be re-graded).
export function withPacingTargets(config, { target, minimum }, todayStr) {
  const previous = {
    daily_target_points: config.daily_target_points,
    daily_minimum_points: config.daily_minimum_points,
  };
  let history = config.history.filter(entry => entry.from !== todayStr);
  if (!history.some(entry => entry.from < todayStr)) {
    history = [{ from: HISTORY_BASELINE, ...previous }, ...history];
  }
  history = [...history, { from: todayStr, daily_target_points: target, daily_minimum_points: minimum }]
    .sort((a, b) => a.from.localeCompare(b.from));
  return { daily_target_points: target, daily_minimum_points: minimum, history };
}