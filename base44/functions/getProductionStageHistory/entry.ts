import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { productionStages, productionBoardQuery, readHistoryPages, buildStageHistory, stageHistoryStats } from "../../shared/productionStageHistory.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { stageId, search = "", offset = 0 } = await req.json();
    if (!productionStages.includes(stageId) || typeof search !== "string" || search.length > 200
      || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
      return Response.json({ error: "Invalid stage history request" }, { status: 400 });
    }
    const now = Date.now();
    const cards = await readHistoryPages(base44.entities.ProductionItem, productionBoardQuery(now));
    const ids = cards.map(card => card.id);
    let rows = [];
    if (ids.length) {
      // Find cards with an actual arrival OR departure, not just their current stage.
      const touched = await base44.entities.ColumnMoveLog.aggregate({
        query: { item_id: { $in: ids }, $or: [{ from_column: stageId }, { to_column: stageId }] },
        groupBy: "item_id"
      });
      const touchedIds = touched.rows.map(row => row.item_id);
      if (touchedIds.length) {
        const logs = await readHistoryPages(base44.entities.ColumnMoveLog, { item_id: { $in: touchedIds } }, "moved_at");
        rows = buildStageHistory(cards, logs, stageId, now);
      }
    }
    const stats = stageHistoryStats(rows, now);
    if (search.trim() && rows.length) {
      const pattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matching = await readHistoryPages(base44.entities.ProductionItem, {
        id: { $in: [...new Set(rows.map(row => row.itemId))] },
        $or: [{ name: { $regex: pattern, $options: "i" } }, { project_name: { $regex: pattern, $options: "i" } }]
      });
      const matchingIds = new Set(matching.map(card => card.id));
      rows = rows.filter(row => matchingIds.has(row.itemId));
    }
    const end = offset + 50;
    return Response.json({ rows: rows.slice(offset, end), stats, nextCursor: end < rows.length ? end : null });
  } catch (error) {
    console.error("Failed to load production stage history:", error);
    return Response.json({ error: error.message }, { status: error.status === 401 ? 401 : 500 });
  }
}