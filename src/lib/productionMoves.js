import { base44 } from "@/api/base44Client";

export function productionMovePatch(item, stage, movedBy, changes = {}) {
  const timestamp = new Date().toISOString();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return {
    ...changes,
    stage,
    stage_move_log: [
      ...(item.stage_move_log || []).filter(move => move.timestamp && new Date(move.timestamp).getTime() >= cutoff),
      { from_stage: item.stage || "staged", to_stage: stage || "staged", moved_by: movedBy, timestamp }
    ]
  };
}

// Shared by every stage-move control. Never derive history points from files,
// pts, visit counts, or whether the move is forward/backward.
export default async function persistProductionMove(item, patch, sentBack = false) {
  const move = patch.stage_move_log[patch.stage_move_log.length - 1];
  const updated = await base44.entities.ProductionItem.update(item.id, patch);
  await base44.entities.ColumnMoveLog.create({
    item_id: item.id,
    item_name: item.name,
    project_name: item.project_name || null,
    from_column: move.from_stage,
    to_column: move.to_stage,
    points_awarded: Number(item.total_points) || 0,
    moved_by: move.moved_by,
    moved_at: move.timestamp,
    sent_back: sentBack
  });
  return updated;
}