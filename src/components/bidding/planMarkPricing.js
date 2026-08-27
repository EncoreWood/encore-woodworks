// Shared logic for pricing a bid room from the user's manual plan highlights.
// Used by both the one-time "Price from Plan" toggle (BidRoomSection) and the
// live re-pricing that runs whenever Annotate Plan is saved (BidWorkspace), so a
// room in "Priced from Plan" mode stays current as its marks change.

// Category → highlight color mapping (matches Annotate Plan legend)
const CATEGORY_BY_COLOR = { "#d97706": "base", "#3b82f6": "upper", "#ef4444": "tall", "#6b7280": "misc" };

// Highlight color used for "Custom" marks on the Annotate Plan overlay.
export const CUSTOM_COLOR = "#923a57";

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
// Always computes LF items from the current marks and sets the room to plan_marks mode.
// Callers decide which rooms to apply this to (the toggle forces it on an "ai" room;
// the live re-pricing only applies it to rooms already in plan_marks). Returns the
// original room unchanged only when the plan scale is unavailable.
export function recomputePlanMarkRoom(room, planAnnotations, planScalePxPerFt, pricingConfigs, bidType) {
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

// Upsert "Custom" line items for highlights drawn on the plan with the Custom
// color and assigned to a room. Each custom highlight (matched by its annotation
// id via the line item's `plan_ann_id`) creates one "Custom"-category qty line
// item the user can then price. Idempotent — existing linked items are left
// untouched so user edits persist across re-saves. Custom highlights with no
// room assignment are ignored.
export function syncCustomItems(rooms, planAnnotations, customCategoryKey) {
  const cat = customCategoryKey || "misc";
  const customs = (planAnnotations || []).filter(a =>
    a && a.type === "highlight"
    && (a.color || "").toLowerCase() === CUSTOM_COLOR
    && a.room_id
  );
  if (!customs.length) return rooms;
  const byRoom = {};
  customs.forEach(a => { (byRoom[a.room_id] = byRoom[a.room_id] || []).push(a); });
  return rooms.map(room => {
    const marks = byRoom[room.id] || [];
    if (!marks.length) return room;
    const items = [...(room.items || [])];
    marks.forEach(a => {
      const has = items.some(i => i.plan_ann_id === a.id);
      if (!has) {
        items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: a.label || "Custom",
          cabinet_category: cat,
          measure_type: "qty",
          quantity: 1,
          unit_price: 0,
          notes: "From plan",
          plan_ann_id: a.id,
        });
      }
    });
    return { ...room, items };
  });
}

// Live, in-place sync of plan-driven line items for ALL rooms — runs as the user
// draws/moves/deletes highlights in Annotate Plan so the Room Pricing panel updates
// immediately, without a Save. For each room:
//   - base/upper/tall/misc LF runs are re-derived from the room's manual highlights
//     (tagged notes "Priced from plan marks" so the save-time recompute stays consistent)
//   - custom highlights (CUSTOM_COLOR) upsert a Custom-category qty item per mark
//   - all other line items (catalog qty items, percentage upgrades, user misc LF) are kept
// Unlike recomputePlanMarkRoom this does NOT flip pricing_source or snapshot AI items,
// so it's safe to run on rooms still on the AI estimate. When no plan scale is set yet,
// only custom (qty) items are synced — LF pricing waits for calibration.
export function liveSyncRoomsFromMarks(rooms, planAnnotations, planScalePxPerFt, pricingConfigs, bidType, customCatKey) {
  let result = rooms;
  if (planScalePxPerFt && planScalePxPerFt > 0) {
    result = rooms.map(room => {
      const sums = measureRoomMarks(room, planAnnotations, planScalePxPerFt);
      const isMarksDriven = (i) => i.measure_type === "lf" && i.notes === "Priced from plan marks";
      const cfg = pricingConfigs.find(c => c.style_key === (room.cabinet_style || bidType));
      // Keep everything except base/upper/tall LF (always re-derived) and marks-driven
      // misc LF (regenerated below). User misc LF, qty items, percentage upgrades, etc. stay.
      const kept = (room.items || []).filter(i => {
        if (i.measure_type !== "lf") return true;
        if (["base", "upper", "tall"].includes(i.cabinet_category)) return false;
        if (i.cabinet_category === "misc") return !isMarksDriven(i);
        return true;
      });
      const newLfItems = [];
      ["base", "upper", "tall", "misc"].forEach(cat => {
        const lf = sums[cat];
        if (lf <= 0) return; // no marks for this category → drop the live item
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
          id: existing?.id || `item_${Date.now()}_${cat}_${Math.random().toString(36).slice(2, 5)}`,
          name: existing?.name || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Cabinets (from plan)`,
          cabinet_category: cat,
          measure_type: "lf",
          quantity: Math.round(lf * 10) / 10,
          unit_price: existing?.unit_price ?? rate,
          notes: "Priced from plan marks"
        });
      });
      return { ...room, items: [...kept, ...newLfItems] };
    });
  }
  return syncCustomItems(result, planAnnotations, customCatKey);
}