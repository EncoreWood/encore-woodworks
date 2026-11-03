import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { todayPointFlow, denverDay, addTodayCardPoints } from "../../shared/productionTodayPoints.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(error => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const date = denverDay();
    // A broad UTC window contains the entire Denver day, including DST changes.
    // The calculation then checks every timestamp against the exact Denver date.
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 36 * 60 * 60 * 1000);
    const query = { "stage_move_log.timestamp": { $gte: start.toISOString(), $lt: end.toISOString() } };
    const points = Object.fromEntries(todayPointFlow.map(stage => [stage, 0]));
    let cursor;
    do {
      const page = await base44.entities.ProductionItem.filter(query, {
        sort: "id", limit: 250, ...(cursor ? { cursor } : {})
      });
      addTodayCardPoints(points, page.items, date);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    for (const stage of todayPointFlow) points[stage] = Math.round(Math.max(0, points[stage]) * 100) / 100;
    return Response.json({ date, timeZone: "America/Denver", points });
  } catch (error) {
    console.error("Failed to calculate today's production points:", error);
    return Response.json({ error: error.message }, { status: error.status === 401 ? 401 : 500 });
  }
}