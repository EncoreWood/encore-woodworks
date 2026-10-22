import { base44 } from "@/api/base44Client";

// When a missing item is reported on a production card, a SEPARATE
// "missing items" card is created (linked back to the parent) instead of
// flagging and sending the whole parent card back through production.
//
// rows: [{description, qty, width, length, material, finish, missing_item_id}]
// Returns the child card (created or updated), or null when there is nothing to link.
export async function ensureMissingItemCard({ parentItem, rows, notes }) {
  if (!parentItem?.id || !rows?.length) return null;

  const detailRows = rows.map(r => ({
    description: r.description || "Missing item",
    qty: r.qty ?? null,
    width: r.width ?? null,
    length: r.length ?? null,
    material: r.material ?? null,
    finish: r.finish ?? null,
    missing_item_id: r.missing_item_id ?? null,
  }));

  const children = await base44.entities.ProductionItem.filter({ parent_card_id: parentItem.id });
  // An open child card still moving through the shop absorbs new missing items;
  // once it completes, the next report creates a fresh card (-M2, -M3, ...)
  const openChild = [...children]
    .filter(c => c.stage !== "complete")
    .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")))[0];

  let child;
  if (openChild) {
    const merged = [...(openChild.missing_details || []), ...detailRows];
    await base44.entities.ProductionItem.update(openChild.id, {
      missing_details: merged,
      ...(notes ? { notes: openChild.notes ? `${openChild.notes}\n${notes}` : notes } : {}),
    });
    child = { ...openChild, missing_details: merged };
  } else {
    const baseName = (parentItem.name || "Card").replace(/-M\d*$/, "");
    const childName = children.length ? `${baseName}-M${children.length + 1}` : `${baseName}-M`;
    const sameStage = await base44.entities.ProductionItem.filter({ stage: "cut" });
    const maxSort = Math.max(-1, ...sameStage.filter(i => !i.is_job_info).map(i => i.sort_order ?? -1));
    child = await base44.entities.ProductionItem.create({
      name: childName,
      type: parentItem.type || "cabinet",
      stage: "cut",
      sort_order: maxSort + 1,
      project_id: parentItem.project_id || null,
      project_name: parentItem.project_name || null,
      room_name: parentItem.room_name || null,
      parent_card_id: parentItem.id,
      missing_details: detailRows,
      notes: notes || null,
      columns_visited: "[]",
      total_points: 0,
      is_job_info: false,
    });
  }

  // Link each MissingItem record to the new card (used by the Missing Items tab
  // to move THE CARD through production instead of the parent)
  const linkedIds = detailRows.map(r => r.missing_item_id).filter(Boolean);
  if (linkedIds.length && child?.id) {
    await base44.entities.MissingItem.bulkUpdate(linkedIds.map(id => ({ id, missing_card_id: child.id })));
  }

  return child;
}