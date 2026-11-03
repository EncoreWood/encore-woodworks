import { base44 } from "@/api/base44Client";

// "Send to Cut" splits a cut child card off a production card, exactly like a
// missing-items card does: the parent never moves, is never flagged and is never
// blocked — the cut work happens on the child, and the child merges back into the
// parent when the cut is finished.

export const isCutChild = (item) => !!item?.is_cut_child;

// R1C2 → "R1C2 — Cut", and a second one → "R1C2 — Cut 2"
const cutChildName = (parent, existingCount) => {
  const base = (parent?.name || "Card").replace(/\s*—\s*Cut(\s+\d+)?$/, "");
  return existingCount ? `${base} — Cut ${existingCount + 1}` : `${base} — Cut`;
};

export async function createCutChildCard({ parent, cut }) {
  const siblings = await base44.entities.ProductionItem.filter({ parent_card_id: parent.id });
  const cutSiblings = siblings.filter(isCutChild);

  // Land at the bottom of the Cut column, like any newly created card
  const cutStage = await base44.entities.ProductionItem.filter({ stage: "cut" });
  const maxSort = Math.max(-1, ...cutStage.filter(i => !i.is_job_info && !i.is_merged).map(i => i.sort_order ?? -1));

  const points = Number(cut.pts) || 0;

  return base44.entities.ProductionItem.create({
    name: cutChildName(parent, cutSiblings.length),
    type: "cut",
    stage: "cut",
    sort_order: maxSort + 1,
    project_id: parent.project_id || null,
    project_name: parent.project_name || null,
    room_name: parent.room_name || null,
    parent_card_id: parent.id,
    is_cut_child: true,
    cut_details: {
      description: cut.description || "",
      qty: cut.qty ?? 1,
      material: cut.material || "",
      finish: cut.finish || "",
    },
    wood_type: cut.material || parent.wood_type || "",
    finish: cut.finish || parent.finish || "",
    // Total points drive the Cut daily points when the card leaves Cut — awarded once.
    pts: points,
    total_points: points,
    notes: cut.notes || null,
    columns_visited: "[]",
    is_job_info: false,
    is_merged: false,
  });
}

// Completing the cut child absorbs it back into the parent. The child is never
// deleted: it keeps its record, stage log and points, so the cut points stay
// awarded exactly once and nothing is double counted on the parent.
export async function mergeCutChildIntoParent({ child, parent, user }) {
  const stamp = new Date().toISOString();
  const who = user?.full_name || user?.email || "Unknown";
  const day = stamp.slice(0, 10);

  await base44.entities.ProductionItem.update(child.id, {
    is_merged: true,
    merged_into_card_id: parent?.id || child.parent_card_id || null,
    merged_at: stamp,
  });

  if (!parent) return;

  const details = child.cut_details || {};
  const what = [details.description, details.qty ? `× ${details.qty}` : ""].filter(Boolean).join(" ");
  const entry = `Cut parts completed by ${who} on ${day}: ${what || child.name}`;

  await base44.entities.ProductionItem.update(parent.id, {
    notes: parent.notes ? `${parent.notes}\n${entry}` : entry,
    cut_merge_log: [
      ...(parent.cut_merge_log || []),
      {
        cut_card_id: child.id,
        cut_card_name: child.name,
        description: details.description || "",
        qty: details.qty ?? null,
        completed_by: who,
        completed_at: stamp,
      },
    ],
  });
}