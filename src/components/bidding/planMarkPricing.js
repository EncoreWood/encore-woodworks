// Shared logic for pricing a bid room from the user's manual plan highlights.
// Used by both the one-time "Price from Plan" toggle (BidRoomSection) and the
// live re-pricing that runs whenever Annotate Plan is saved (BidWorkspace), so a
// room in "Priced from Plan" mode stays current as its marks change.

import { buildLineItemFromCatalog, effectiveStyleKey, trackedMarkIds, combineNotes } from "./catalogPricing";

// Category → highlight color mapping (matches Annotate Plan legend, including the
// "Base Paneling" swatch which is priced as a base-cabinet LF run).
export const CATEGORY_BY_COLOR = { "#d97706": "base", "#3b82f6": "upper", "#ef4444": "tall", "#6b7280": "misc", "#667484": "base" };

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
    if (a.catalog_item_id) return; // catalog-linked highlights are handled separately (syncCatalogHighlights)
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
// color and assigned to a room. Custom highlights with the SAME label in the
// same room merge into ONE "Custom"-category qty row: each new mark adds +1 to
// the existing row's qty instead of creating a duplicate row. Absorbed mark ids
// are recorded on the row (plan_ann_ids / legacy plan_ann_id) so re-syncs
// recognize already-counted marks — idempotent and additive-only (qty is never
// decremented and rows are never removed). Custom highlights with no room
// assignment are ignored.
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
    let items = [...(room.items || [])];
    marks.forEach(a => {
      const alreadyTracked = items.some(i => trackedMarkIds(i).has(a.id));
      if (alreadyTracked) return;
      const name = a.label || "Custom";
      // Merge into an existing same-name + same-category row instead of adding a
      // duplicate (catalog-linked rows manage their own qty and are skipped).
      const targetIdx = items.findIndex(i =>
        !i.catalog_item_id
        && (i.name || "").trim().toLowerCase() === name.trim().toLowerCase()
        && i.cabinet_category === cat
      );
      if (targetIdx >= 0) {
        const t = items[targetIdx];
        items[targetIdx] = {
          ...t,
          quantity: (parseFloat(t.quantity) || 0) + 1,
          plan_ann_ids: [...trackedMarkIds(t), a.id],
          notes: combineNotes(t.notes, "From plan"),
        };
      } else {
        items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
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

// Upsert catalog-linked line items for highlights that carry a catalog_item_id
// (drawn via the searchable catalog dropdown in Annotate Plan). ALL highlights of
// the SAME catalog item in a room merge into ONE line item whose qty is the sum
// of the marks (LF marks use the calibrated plan scale; qty-type marks count 1
// each), instead of one duplicate row per highlight. The unit_price is
// SNAPSHOTTED at creation and never overwritten by later catalog/tier edits.
// Absorbed mark ids are recorded on the row (plan_ann_ids, plus legacy
// plan_ann_id) so re-syncs recognize them: resizing/moving/deleting a mark
// recomputes the merged qty, and a NEW mark of the same catalog item adds to the
// existing row rather than creating a duplicate. When no merged row exists yet
// but the room already has a line item with the same Item Name AND Category,
// the marks adopt that row (its current qty is preserved as manual_base and the
// mark qty is added on top). Highlights with no room assignment are ignored.
export function syncCatalogHighlights(rooms, planAnnotations, planScalePxPerFt, catalogItems, pricingConfigs, bidType) {
  const byRoom = {};
  (planAnnotations || []).forEach(a => {
    if (!a || a.type !== "highlight" || !a.room_id || !a.catalog_item_id) return;
    (byRoom[a.room_id] = byRoom[a.room_id] || []).push(a);
  });
  if (Object.keys(byRoom).length === 0) return rooms;
  return rooms.map(room => {
    const marks = byRoom[room.id] || [];
    if (!marks.length) return room;
    const styleKey = effectiveStyleKey(room, bidType);
    let items = [...(room.items || [])];
    // Group the room's marks by catalog item so every highlight of the same
    // catalog item feeds ONE merged row.
    const groups = {};
    marks.forEach(a => { (groups[a.catalog_item_id] = groups[a.catalog_item_id] || []).push(a); });
    Object.entries(groups).forEach(([catalogId, groupMarks]) => {
      const cat = (catalogItems || []).find(c => c.id === catalogId);
      if (!cat) return; // catalog item deleted → leave any existing linked item as-is (snapshot preserved)
      const isLf = cat.measure_type === "lf" && ["base", "upper", "tall"].includes(cat.cabinet_category);
      const qtyOf = (a) => (isLf && planScalePxPerFt && planScalePxPerFt > 0)
        ? Math.round((Math.max(a.w || 0, a.h || 0) / planScalePxPerFt) * 10) / 10
        : 1;
      const markQtyById = {};
      groupMarks.forEach(a => { markQtyById[a.id] = qtyOf(a); });
      const groupIds = new Set(groupMarks.map(a => a.id));

      // This room's merged row for this catalog item: a row linked to the item
      // that already tracks at least one of the group's marks.
      let idx = items.findIndex(i =>
        i.catalog_item_id === catalogId && [...trackedMarkIds(i)].some(id => groupIds.has(id))
      );

      if (idx < 0) {
        // No merged row yet — adopt an existing same-name + same-category row if
        // one exists, otherwise create a fresh merged row.
        const targetIdx = items.findIndex(i =>
          !i.catalog_item_id
          && (i.name || "").trim().toLowerCase() === (cat.name || "").trim().toLowerCase()
          && i.cabinet_category === (cat.cabinet_category || "misc")
        );
        const marksSum = Math.round(groupMarks.reduce((s, a) => s + markQtyById[a.id], 0) * 10) / 10;
        if (targetIdx >= 0) {
          const t = items[targetIdx];
          const manualBase = t.manual_base != null ? (parseFloat(t.manual_base) || 0) : (parseFloat(t.quantity) || 0);
          items[targetIdx] = {
            ...t,
            catalog_item_id: catalogId,
            plan_ann_ids: [...trackedMarkIds(t), ...groupIds],
            manual_base: manualBase,
            quantity: Math.round((manualBase + marksSum) * 10) / 10,
            notes: combineNotes(t.notes, "From plan"),
          };
        } else {
          const snap = buildLineItemFromCatalog(cat, pricingConfigs, styleKey, { quantity: marksSum, notes: "From plan" });
          items.push({ ...snap, plan_ann_ids: [...groupIds], manual_base: 0 });
        }
        return;
      }

      // Existing merged row: absorb any not-yet-tracked marks and recompute its
      // qty as manual_base + the sum of the marks it tracks (handles resize,
      // move, and mark deletion coherently; the snapshotted price is untouched).
      const row = items[idx];
      const tracked = trackedMarkIds(row);
      groupIds.forEach(id => tracked.add(id));
      const marksSum = Math.round([...tracked].filter(id => groupIds.has(id))
        .reduce((s, id) => s + (markQtyById[id] || 0), 0) * 10) / 10;
      items[idx] = {
        ...row,
        plan_ann_ids: [...tracked],
        quantity: Math.round(((parseFloat(row.manual_base) || 0) + marksSum) * 10) / 10,
      };
    });
    return { ...room, items };
  });
}

// Live, additive-only sync of plan-driven line items for ALL rooms — runs as the
// user draws/moves/resizes/deletes highlights in Annotate Plan so the Room Pricing
// panel updates immediately, without a Save. Importantly it NEVER removes, replaces,
// or overwrites AI-generated items (or any other pre-existing item): it only ADDS new
// manual items, or updates the qty of an existing manual item the user previously
// created via highlighting. For each room:
//   - marks-driven manual LF items are tagged notes "Priced from plan marks"; items
//     WITHOUT that tag (AI takeoff items, catalog qty items, percentage upgrades,
//     user-typed misc LF) are passed through untouched.
//   - for each cabinet category with manual marks: if a marks-driven LF item already
//     exists, its qty is updated to the current total LF; otherwise a NEW separate
//     manual LF item is added (alongside any AI item for the same category).
//   - when a category has no marks, any existing marks-driven item is left as-is
//     (nothing is removed); the user deletes unwanted items manually.
//   - custom highlights (CUSTOM_COLOR) upsert a Custom-category qty item per label
//     (syncCustomItems — also additive-only, merging same-label marks).
// Unlike recomputePlanMarkRoom this does NOT flip pricing_source or snapshot AI items,
// so it's safe to run on rooms still on the AI estimate. When no plan scale is set yet,
// only custom (qty) items are synced — LF pricing waits for calibration.
export function liveSyncRoomsFromMarks(rooms, planAnnotations, planScalePxPerFt, pricingConfigs, bidType, customCatKey, catalogItems) {
  let result = rooms;
  if (planScalePxPerFt && planScalePxPerFt > 0) {
    result = rooms.map(room => {
      const sums = measureRoomMarks(room, planAnnotations, planScalePxPerFt);
      // A manual LF item created by highlighting is tagged notes "Priced from plan marks".
      // AI items / catalog items / user-typed items lack that tag and are never touched.
      const isMarksDrivenLF = (i) => i.measure_type === "lf" && i.notes === "Priced from plan marks";
      const cfg = pricingConfigs.find(c => c.style_key === (room.cabinet_style || bidType));
      const rateFor = (cat) => {
        if (!cfg) return 0;
        if (cat === "base") return cfg.bases_lf || 0;
        if (cat === "upper") return cfg.uppers_lf || 0;
        if (cat === "tall") return cfg.tall_lf || 0;
        return 0;
      };
      // Update qty of existing marks-driven manual items (only when that category has marks).
      const updatedItems = (room.items || []).map(i => {
        if (!isMarksDrivenLF(i)) return i; // AI / catalog / user items left untouched
        const lf = sums[i.cabinet_category];
        if (lf <= 0) return i;             // no marks for this category → leave as-is (no removal)
        return { ...i, quantity: Math.round(lf * 10) / 10, unit_price: i.unit_price || rateFor(i.cabinet_category) };
      });
      // Add NEW separate manual items for categories that have marks but no marks-driven item yet.
      const newItems = [];
      ["base", "upper", "tall", "misc"].forEach(cat => {
        const lf = sums[cat];
        if (lf <= 0) return;
        const exists = (room.items || []).some(i => isMarksDrivenLF(i) && i.cabinet_category === cat);
        if (exists) return;
        newItems.push({
          id: `item_${Date.now()}_${cat}_${Math.random().toString(36).slice(2, 5)}`,
          name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Cabinets (from plan)`,
          cabinet_category: cat,
          measure_type: "lf",
          quantity: Math.round(lf * 10) / 10,
          unit_price: rateFor(cat),
          notes: "Priced from plan marks"
        });
      });
      return { ...room, items: [...updatedItems, ...newItems] };
    });
  }
  // Catalog-linked highlights upsert their own merged, snapshot-priced line items.
  result = syncCatalogHighlights(result, planAnnotations, planScalePxPerFt, catalogItems, pricingConfigs, bidType);
  return syncCustomItems(result, planAnnotations, customCatKey);
}