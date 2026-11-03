import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { todayPointFlow, denverDay, addTodayCardPoints, listDenverDays } from "../../shared/productionTodayPoints.js";

const isDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00.000Z`).getTime());

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(error => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    // Optional `date` (one production day) or `from`/`to` (a window such as the week or
    // month). Omitted, it returns today — so the shop pills, the D/W/M stage cards and
    // the previous-day review all share this one calculation and can never disagree.
    const body = await req.json().catch(() => ({}));
    const requested = isDate(body?.date) ? body.date : null;
    const rangeFrom = isDate(body?.from) ? body.from : null;
    const rangeTo = isDate(body?.to) ? body.to : null;
    const window = rangeFrom && rangeTo && rangeFrom <= rangeTo ? { from: rangeFrom, to: rangeTo } : null;
    const date = requested || denverDay();
    const days = (window ? listDenverDays(window.from, window.to) : [date]).slice(0, 62);
    if (!days.length) days.push(date);
    // A broad UTC window contains every requested Denver day, including DST changes.
    // The calculation then checks every timestamp against the exact Denver date.
    const start = new Date(`${days[0]}T00:00:00.000Z`);
    const end = new Date(new Date(`${days[days.length - 1]}T00:00:00.000Z`).getTime() + 36 * 60 * 60 * 1000);
    const query = { "stage_move_log.timestamp": { $gte: start.toISOString(), $lt: end.toISOString() } };
    const points = Object.fromEntries(todayPointFlow.map(stage => [stage, 0]));
    let cursor;
    do {
      const page = await base44.entities.ProductionItem.filter(query, {
        sort: "id", limit: 250, ...(cursor ? { cursor } : {})
      });
      for (const day of days) addTodayCardPoints(points, page.items, day);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    for (const stage of todayPointFlow) points[stage] = Math.round(Math.max(0, points[stage]) * 100) / 100;
    return Response.json({
      date: window ? window.to : date,
      from: window ? window.from : null,
      to: window ? window.to : null,
      timeZone: "America/Denver",
      points,
    });
  } catch (error) {
    console.error("Failed to calculate today's production points:", error);
    return Response.json({ error: error.message }, { status: error.status === 401 ? 401 : 500 });
  }
}