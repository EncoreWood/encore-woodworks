import { format } from "date-fns";

/**
 * Weekly overtime calculation shared by the Payroll tab and the employee
 * Pay Periods view.
 *
 * Overtime is determined per full calendar week (Mon-Sun, >40 hrs), using ALL
 * of the employee's work hours for that week — including days that fall
 * outside the pay period — so a week that straddles the period boundary still
 * counts its overtime. Hours worked past the 40th hour of the week (in
 * chronological order) are overtime; only the portions of those hours that
 * fall inside the pay period are counted toward the period's totals.
 */
export function calcWeeklyOT(entries, startStr, endStr) {
  const workEntries = (entries || []).filter(e => e.entry_type === "work" && (e.hours_worked || 0) > 0);

  // Group ALL work entries by calendar week (Monday)
  const weeks = {};
  workEntries.forEach(e => {
    const d = new Date(e.date + "T00:00:00");
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    const key = format(mon, "yyyy-MM-dd");
    (weeks[key] = weeks[key] || []).push(e);
  });

  let regular = 0, overtime = 0;
  Object.values(weeks).forEach(wkEntries => {
    const fullTotal = wkEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
    // Walk the week chronologically: hours past the 40th hour of the week are OT
    let cum = 0;
    wkEntries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(e => {
        const hrs = e.hours_worked || 0;
        const inPeriod = e.date >= startStr && e.date <= endStr;
        if (fullTotal > 40) {
          const before = Math.max(0, Math.min(hrs, 40 - cum));
          const after = hrs - before;
          if (inPeriod) {
            regular += before;
            overtime += after;
          }
        } else if (inPeriod) {
          regular += hrs;
        }
        cum += hrs;
      });
  });

  const total = regular + overtime;
  return { total, regular, overtime };
}