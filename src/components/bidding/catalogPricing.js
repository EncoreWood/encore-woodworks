// Shared catalog/tier pricing helpers. Used when building NEW bid line items and
// when explicitly refreshing an existing bid to current pricing ("Update to
// Current Pricing"). Existing bid line items store their OWN snapshot of
// unit_price at the time they were added; these helpers are only consulted on
// creation / explicit refresh — never on display — so editing the Item Catalog
// or Cabinet Style tier rates never retroactively changes a saved bid.

// Resolve the effective cabinet style key for a room (room override → bid default).
export function effectiveStyleKey(room, bidType) {
  return room?.cabinet_style || bidType;
}

// Tier $/LF rate for a rate category (base/upper/tall) from a pricing config.
export function tierRate(cfg, rateCategory) {
  if (!cfg || !rateCategory) return 0;
  if (rateCategory === "base") return cfg.bases_lf || 0;
  if (rateCategory === "upper") return cfg.uppers_lf || 0;
  if (rateCategory === "tall") return cfg.tall_lf || 0;
  return 0;
}

// Which rate category (base/upper/tall) a catalog item maps to for tier lookups.
// Explicit tier_rate_category wins; otherwise infer from cabinet_category.
export function resolveRateCategory(catalogItem) {
  if (!catalogItem) return null;
  if (catalogItem.tier_rate_category) return catalogItem.tier_rate_category;
  const c = catalogItem.cabinet_category;
  if (c === "base" || c === "upper" || c === "tall") return c;
  return null;
}

// Compute the unit price to SNAPSHOT for a NEW line item built from a catalog
// item, given the bid's effective style key. Percentage items return 0 (they
// store a percentage, not a unit price). Fixed items use default_price;
// tier-based items pull the matching $/LF rate from the selected tier.
export function priceNewCatalogItem(catalogItem, pricingConfigs, bidStyleKey) {
  if (!catalogItem) return 0;
  if (catalogItem.measure_type === "percentage") return 0;
  const mode = catalogItem.pricing_mode || "fixed";
  if (mode === "tier_based") {
    const rateCat = resolveRateCategory(catalogItem);
    if (!rateCat) return 0;
    const cfg = (pricingConfigs || []).find(c => c.style_key === bidStyleKey);
    return tierRate(cfg, rateCat);
  }
  return catalogItem.default_price || 0;
}

// Build a fresh line-item object from a catalog item (for new additions).
// `opts.quantity` overrides the default 0 (e.g. measured LF from a plan mark).
export function buildLineItemFromCatalog(catalogItem, pricingConfigs, bidStyleKey, opts = {}) {
  const isPercent = catalogItem.measure_type === "percentage";
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: catalogItem.name,
    cabinet_category: catalogItem.cabinet_category || "misc",
    measure_type: catalogItem.measure_type || "lf",
    quantity: opts.quantity != null ? opts.quantity : 0,
    unit_price: isPercent ? 0 : priceNewCatalogItem(catalogItem, pricingConfigs, bidStyleKey),
    percentage: isPercent ? (catalogItem.default_percentage || 0) : undefined,
    upgrade_applies_to: catalogItem.upgrade_applies_to || ["base", "upper", "tall"],
    catalog_item_id: catalogItem.id,
    pricing_mode: catalogItem.pricing_mode || "fixed",
    tier_rate_category: resolveRateCategory(catalogItem),
    notes: opts.notes || ""
  };
}

// Refresh an EXISTING line item to current catalog + tier pricing. Only called
// by the explicit "Update to Current Pricing" action. Items without a
// catalog_item_id (custom/manual) are returned unchanged. If the linked catalog
// item was deleted, the snapshot is preserved (returned unchanged).
export function refreshLineItemToCurrent(item, catalogItems, pricingConfigs, bidStyleKey) {
  if (!item || !item.catalog_item_id) return item;
  const cat = (catalogItems || []).find(c => c.id === item.catalog_item_id);
  if (!cat) return item;
  const isPercent = cat.measure_type === "percentage";
  return {
    ...item,
    name: cat.name,
    cabinet_category: cat.cabinet_category || "misc",
    measure_type: cat.measure_type || "lf",
    unit_price: isPercent ? 0 : priceNewCatalogItem(cat, pricingConfigs, bidStyleKey),
    percentage: isPercent ? (cat.default_percentage || 0) : item.percentage,
    upgrade_applies_to: cat.upgrade_applies_to || ["base", "upper", "tall"],
    pricing_mode: cat.pricing_mode || "fixed",
    tier_rate_category: resolveRateCategory(cat),
  };
}

// Refresh every catalog-linked line item in every room of a bid to current
// catalog + tier pricing. Returns the updated rooms array. Used by the
// bid-level / per-room "Update to Current Pricing" action.
export function refreshRoomsToCurrent(rooms, catalogItems, pricingConfigs, bidType) {
  return (rooms || []).map(room => {
    const styleKey = effectiveStyleKey(room, bidType);
    const items = (room.items || []).map(i => refreshLineItemToCurrent(i, catalogItems, pricingConfigs, styleKey));
    return { ...room, items };
  });
}