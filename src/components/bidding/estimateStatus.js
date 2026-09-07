import { base44 } from "@/api/base44Client";

// ── Estimate versioning ──────────────────────────────────────────────────────
// Each project keeps exactly ONE "current" estimate; every other estimate for
// that project is "outdated". Bids without an estimate_status are treated as
// current (the field's default), so pre-existing estimates keep working.

const BUILTIN_FIELDS = new Set(["id", "created_date", "updated_date", "created_by_id"]);

// Flips every OTHER estimate on the same project to "outdated".
export async function demoteOtherEstimates(bidId, projectId) {
  if (!projectId) return;
  const siblings = await base44.entities.Bid.filter({ project_id: projectId });
  const others = siblings.filter(b => b.id !== bidId && b.estimate_status !== "outdated");
  if (others.length > 0) {
    await base44.entities.Bid.bulkUpdate(others.map(b => ({ id: b.id, estimate_status: "outdated" })));
  }
}

// Marks one estimate as its project's single "current" version and demotes the rest.
export async function markBidCurrent(bidId, projectId) {
  await base44.entities.Bid.update(bidId, { estimate_status: "current" });
  await demoteOtherEstimates(bidId, projectId);
}

// Creates a FULL copy of an estimate — same project, rooms, line items, pricing,
// plan, and specs — as a brand new record. The copy becomes the project's
// "current" estimate (the original is demoted to "outdated" but left untouched)
// and is not shared with the client until reviewed.
export async function duplicateBid(bid) {
  const copy = { estimate_status: "current", client_visible: false };
  Object.keys(bid).forEach(key => {
    if (!BUILTIN_FIELDS.has(key) && !(key in copy)) copy[key] = bid[key];
  });
  const created = await base44.entities.Bid.create(copy);
  await demoteOtherEstimates(created.id, created.project_id || bid.project_id || null);
  return created;
}