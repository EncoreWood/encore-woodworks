export const SPEC_FIELDS = [
  { key: "wood_species", label: "Wood Species", presets: ["Painted", "Maple", "Cherry", "White Oak", "Walnut", "Alder", "MDF", "TBD"] },
  { key: "finish", label: "Finish", presets: ["TBD", "Painted White", "Painted Gray", "Natural", "Stain - Light", "Stain - Medium", "Stain - Dark", "Two-Tone"] },
  { key: "crown_type", label: "Crown Type", presets: ["None", "Simple Crown", "Build-Up Crown", "Light Rail", "Dentil", "Custom"] },
  { key: "door_profile", label: "Door Profile", presets: ["Shaker", "Flat Panel", "Raised Panel", "Beadboard", "Glass Insert", "Slab", "Custom"] },
  { key: "ceiling_ht", label: "Ceiling Ht", presets: ["8'", "9'", "10'", "11'", "12'", "Vaulted", "Custom"] },
  { key: "cab_ht", label: "Cab Ht", presets: ["Standard (34.5\")", "Tall (36\")", "Custom"] },
  { key: "notes", label: "Notes", presets: null },
];

/**
 * Parse specs from the new `specs` JSON field.
 * Falls back to the old `notes` JSON format for migration.
 */
export function parseSpecs(slide) {
  if (slide?.specs) {
    try {
      const parsed = JSON.parse(slide.specs);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }
  // Migrate from old notes JSON
  if (slide?.notes) {
    try {
      const old = JSON.parse(slide.notes);
      if (old && typeof old === "object" && !Array.isArray(old)) {
        return {
          wood_species: old.wood_species || "",
          finish: old.finish || "",
          crown_type: old.crown_type || "",
          door_profile: old.door_profile || "",
          ceiling_ht: old.ceiling_height || old.ceiling_ht || "",
          cab_ht: old.cab_finished_height || old.cab_ht || "",
          notes: old.notes_bullets || old.notes || "",
        };
      }
    } catch {}
  }
  return {};
}

/**
 * Parse a plain image URL from various legacy formats:
 * - Plain string URL
 * - JSON array of {url, width} objects
 * - JSON object with {url}
 */
export function parseImageUrl(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const item = parsed[0];
      return typeof item === "string" ? item : item?.url || null;
    }
    if (parsed && typeof parsed === "object" && parsed.url) {
      return parsed.url;
    }
  } catch {
    return raw;
  }
  return null;
}

/**
 * Parse the positioned images array from the `images` JSON field.
 * Falls back to a single full-size image from `image_3d_url` for migration.
 * Returns: [{url, x, y, width, height, crop, zIndex}]
 */
export function parseImagesLayout(slide) {
  if (slide?.images) {
    try {
      const parsed = JSON.parse(slide.images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const url = parseImageUrl(slide?.image_3d_url);
  if (url) return [{ url, x: 5, y: 5, width: 90, height: 90, crop: null, zIndex: 0 }];
  return [];
}

// ─── Cover slide helpers ──────────────────────────────────────────────────────
export function isCoverSlide(slide) {
  const specs = parseSpecs(slide);
  return specs.slide_type === "cover";
}

export function parseCoverSpecs(slide) {
  const specs = parseSpecs(slide);
  if (specs.slide_type !== "cover") return null;
  return {
    slide_type: "cover",
    client_name: specs.client_name || "",
    project_name: specs.project_name || "",
    address: specs.address || "",
    prepared_date: specs.prepared_date || "",
    proposal_number: specs.proposal_number || "",
    overview_text: specs.overview_text || "",
    scope_of_work: Array.isArray(specs.scope_of_work) ? specs.scope_of_work : [],
    cover_image: specs.cover_image || "",
    show_pricing: specs.show_pricing !== false,
    deposit_percentage: specs.deposit_percentage ?? 30,
    pricing_items: Array.isArray(specs.pricing_items) ? specs.pricing_items : [],
  };
}

export function makeDefaultCoverSpecs(projectName = "", clientName = "", address = "") {
  return {
    slide_type: "cover",
    client_name: clientName,
    project_name: projectName,
    address: address,
    prepared_date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    proposal_number: "",
    overview_text: "",
    scope_of_work: [],
    cover_image: "",
    show_pricing: true,
    deposit_percentage: 30,
    pricing_items: [],
  };
}

/**
 * Get plain-text notes for the client portal.
 * Old slides stored JSON in `notes` — hide that.
 */
export function getNotesText(slide) {
  if (!slide?.notes) return "";
  const trimmed = slide.notes.trim();
  if (trimmed.startsWith("{")) return "";
  return slide.notes;
}