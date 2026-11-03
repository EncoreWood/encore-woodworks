import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { denverDay, getStageDayPoints, getStageDaySeries, listDenverDays } from "../../shared/productionTodayPoints.js";

const isDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00.000Z`).getTime());

// Every card that can earn points: merged cut children are gone from the board and
// job-info cards never enter production.
const inProduction = item => item && item.is_merged !== true && item.is_job_info !== true;

// The board's cards, read once and reused for every figure in the response. A list
// call returns up to 5000 records, so the whole board normally arrives in a single
// request; beyond that it pages, because a silently cut list would understate totals.
// Reading the cards repeatedly is what exhausted the app's entity-read limit.
async function readCards(base44) {
  const items = [];
  let cursor;
  do {
    const page = await base44.entities.ProductionItem.filter({}, {
      sort: "id", limit: 5000, ...(cursor ? { cursor } : {})
    });
    items.push(...(page.items || []).filter(inProduction));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return items;
}

// At most 62 days per window, so one request can never ask for years of days.
function clampWindow(from, to) {
  const days = listDenverDays(from, to).slice(0, 62);
  if (!days.length) return null;
  return { from: days[0], to: days[days.length - 1] };
}

const readWindow = value => {
  const from = isDate(value?.from) ? value.from : null;
  const to = isDate(value?.to) ? value.to : null;
  return from && to && from <= to ? clampWindow(from, to) : null;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(error => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // `date` is one production day; `from`/`to` is a single window (legacy callers);
    // `windows: { week, month }` returns those alongside the day from the same read.
    const body = await req.json().catch(() => ({}));
    const date = isDate(body?.date) ? body.date : denverDay();
    const single = readWindow({ from: body?.from, to: body?.to });
    const week = readWindow(body?.windows?.week);
    const month = readWindow(body?.windows?.month);

    const items = await readCards(base44);

    // A single window answers exactly as it always has: points for that range only.
    if (single) {
      return Response.json({
        date: single.to,
        from: single.from,
        to: single.to,
        timeZone: "America/Denver",
        points: getStageDayPoints(items, single.from, single.to),
        series: null,
      });
    }

    const payload = {
      date,
      from: null,
      to: null,
      timeZone: "America/Denver",
      points: getStageDayPoints(items, date, date),
      // The day also carries its running timeline for the pacing chart — built by the
      // same module, so the chart ends exactly on the stage totals above.
      series: getStageDaySeries(items, date),
    };
    const windows = {};
    if (week) windows.week = { ...week, points: getStageDayPoints(items, week.from, week.to) };
    if (month) windows.month = { ...month, points: getStageDayPoints(items, month.from, month.to) };
    if (Object.keys(windows).length) payload.windows = windows;

    return Response.json(payload);
  } catch (error) {
    console.error("Failed to calculate today's production points:", error);
    const rateLimited = /rate limit/i.test(error?.message || "");
    return Response.json(
      { error: rateLimited ? "Points are temporarily busy — showing saved values. Try again in a minute." : error.message, rateLimited },
      { status: rateLimited ? 429 : (error.status === 401 ? 401 : 500) }
    );
  }
}