// Parse date values as LOCAL dates. A bare "YYYY-MM-DD" string parsed with
// new Date() is treated as UTC midnight, which renders as the previous day
// in timezones behind UTC (e.g. America/Denver). This keeps date-only strings
// on the calendar day they represent; full ISO timestamps still parse normally.
export function parseDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}