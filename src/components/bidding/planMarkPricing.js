// Shared logic for pricing a bid room from the user's manual plan highlights.
// Used by both the one-time "Price from Plan" toggle (BidRoomSection) and the
// live re-pricing that runs whenever Annotate Plan is saved (BidWorkspace), so a
// room in "Priced from Plan" mode stays current as its marks change.

// Category → highlight color mapping (matches Annotate Plan legend)
const CATEGORY_BY_COLOR = { "#d97706": "base", "#3b82f6": "upper", "#ef4444": "tall", "#6b7280": "misc" };

// Sum manual highlight lengths per cabinet category for a given room, converted to
// real linear feet using the plan's detected scale (natural px per foot).
export function measureRoomMarks(room, planAnnotations, planScalePxPerFt) {
  const sums = { base: 0, upper: 0, tall: 0, misc: 0 };
  if (!planScalePxPerFt || planScalePxPerFt <= 0) return sums;
  (planAnnotations || []).forEach(a => {
    if (a.type !== "highlight") return;
    if (a.source === "ai") return; // only the user's manual marks
    const matchRoom = a.room_id
      ? (a.room_id === room.id)
      : ((a.room_name || "").trim().toLowerCase() === (room.room_name || "").trim().toLowerCase() && (room.room_name || "").trim() !== "");
    if (!matchRoom) return;
    const cat = CATEGORY_BY_COLOR[(a.color || "").toLowerCase()];
    if (!cat) return;
    const lenPx = Math.max(a.w || 0, a.h || 0);
    if (lenPx <= 0) return;
    sums[cat] += lenPx / planScalePxPerFt;
  });
  return sums;
}

// Recompute a plan_marks room's LF items from the current set of manual highlights.
// Mirrors the one-time toggle logic so live re-pricing matches the snapshot behavior:
//   - base/upper/tall LF runs are always re-derived from marks
//   - marks-driven misc LF runs (notes === "Priced from plan marks") are re-derived
//   - user-added line items (qty pieces, percentage upgrades, custom misc LF) are kept
// ai_items_snapshot and pricing_source are preserved so the user can still toggle back.
// Returns the original room unchanged if it isn't in plan_marks mode or scale is missing.
export function recomputePlanMarkRoom(room, planAnnotations, planScalePxPerFt, pricingConfigs, bidType) {
  if (room.pricing_source !== "plan_marks") return room;
  if (!planScalePxPerFt || planScalePxPerFt <= 0) return room;
  const sums = measureRoomMarks(room, planAnnotations, planScalePxPerFt);

  const isMarksDriven = (i) => i.measure_type === "lf" && i.notes === "Priced from plan marks";
  const kept = (room.items || []).filter(i => {
    if (i.measure_type !== "lf") return true; // qty pieces, percentage upgrades, etc.
    if (["base", "upper", "tall"].includes(i.cabinet_category)) return false; // always re-derived from marks
    // misc LF: keep user-added, drop marks-driven (regenerated below)
    return !isMarksDriven(i);
  });

  const cfg = pricingConfigs.find(c => c.style_key === (room.cabinet_style || bidType));
  const newLfItems = [];
  ["base", "upper", "tall", "misc"].forEach(cat => {
    const lf = sums[cat];
    if (lf <= 0) return;
    let rate = 0;
    if (cfg) {
      if (cat === "base") rate = cfg.bases_lf || 0;
      else if (cat === "upper") rate = cfg.uppers_lf || 0;
      else if (cat === "tall") rate = cfg.tall_lf || 0;
    }
    const existing = (room.items || []).find(i =>
      i.measure_type === "lf" && i.cabinet_category === cat && (cat !== "misc" || isMarksDriven(i))
    );
    newLfItems.push({
      id: existing?.id || `item_${Date.now()}_${cat}`,
      name: existing?.name || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Cabinets (from plan)`,
      cabinet_category: cat,
      measure_type: "lf",
      quantity: Math.round(lf * 10) / 10,
      unit_price: rate,
      notes: "Priced from plan marks"
    });
  });

  return {
    ...room,
    items: [...kept, ...newLfItems],
    pricing_source: "plan_marks",
    ai_items_snapshot: room.ai_items_snapshot || null
  };
}