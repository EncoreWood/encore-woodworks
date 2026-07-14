export const SPEC_FIELDS = [
  { key: "wood_species", label: "Wood Species" },
  { key: "finish", label: "Finish" },
  { key: "crown_type", label: "Crown Type" },
  { key: "door_profile", label: "Door Profile" },
  { key: "ceiling_ht", label: "Ceiling Ht" },
  { key: "cab_ht", label: "Cab Ht" },
  { key: "notes", label: "Notes" },
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
 * Get plain-text notes for the client portal.
 * Old slides stored JSON in `notes` — hide that.
 */
export function getNotesText(slide) {
  if (!slide?.notes) return "";
  const trimmed = slide.notes.trim();
  if (trimmed.startsWith("{")) return "";
  return slide.notes;
}