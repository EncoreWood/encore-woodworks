// Everything time-related renders in shop time (America/Denver), never in the
// viewer's raw browser timezone — an evening message must not read as tomorrow.
export const SHOP_TIME_ZONE = "America/Denver";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const format = (value, options) => {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, ...options }).format(date);
};

// 5:30 PM
export const shopTime = (value) => format(value, { hour: "numeric", minute: "2-digit" });

// Nov 3, 5:30 PM
export const shopStamp = (value) =>
  format(value, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// YYYY-MM-DD in shop time
export const shopDayKey = (value = new Date()) => {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Today / Yesterday / Tue, Nov 3 — so evening messages keep their own day.
export const shopDayLabel = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const day = shopDayKey(date);
  if (day === shopDayKey()) return "Today";
  if (day === shopDayKey(new Date(Date.now() - 86400000))) return "Yesterday";
  return format(date, { weekday: "short", month: "short", day: "numeric" });
};

// Shop-local clock, DST-safe (never a fixed UTC offset).
export const shopClock = (value = new Date()) => {
  const date = toDate(value) || new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SHOP_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return { hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: parts.weekday };
};

// The End of Day reminder window: 5:25–5:35 PM on a weekday, shop time.
export const isEodWindow = (value = new Date()) => {
  const { hour, minute, weekday } = shopClock(value);
  return WEEKDAYS.includes(weekday) && hour === 17 && minute >= 25 && minute <= 35;
};