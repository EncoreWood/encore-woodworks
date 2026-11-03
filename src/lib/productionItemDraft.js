// Draft protection for the Add/Edit Production Item form.
// Everything the user typed (and the raw sketch) is mirrored into local storage,
// so a crash, a refresh, or an accidental close never loses a half-entered card.

const PREFIX = "productionItemDraft:";
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SKETCH_CHARS = 2500000; // ~2.5MB of canvas JSON before we refuse to store it

export function productionItemDraftKey(initialData) {
  if (initialData?.id) return `${PREFIX}edit:${initialData.id}`;
  const project = initialData?.project_id || "board";
  const room = initialData?.room_name || "none";
  return `${PREFIX}new:${project}:${room}`;
}

// A sketch snapshot is only usable when it parses to a fabric JSON object with an
// objects array. Anything else (truncated write, quota cut-off) is dropped so a
// corrupt sketch can never break the card — the form fields still come back.
export function validSketchJson(value) {
  if (!value) return null;
  let json = value;
  if (typeof json === "string") {
    if (json.length > MAX_SKETCH_CHARS) return null;
    try {
      json = JSON.parse(json);
    } catch {
      return null;
    }
  }
  if (!json || typeof json !== "object" || !Array.isArray(json.objects)) return null;
  try {
    const str = JSON.stringify(json);
    return str.length > MAX_SKETCH_CHARS ? null : str;
  } catch {
    return null;
  }
}

export function loadProductionItemDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.data !== "object") return null;
    const savedAt = parsed.savedAt ? new Date(parsed.savedAt).getTime() : 0;
    if (savedAt && Date.now() - savedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return {
      data: parsed.data,
      sketchJson: validSketchJson(parsed.sketchJson),
      savedAt: parsed.savedAt || null,
    };
  } catch {
    return null;
  }
}

export function saveProductionItemDraft(key, { data, sketchJson }) {
  const payload = { data, savedAt: new Date().toISOString() };
  const sketch = validSketchJson(sketchJson);
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, sketchJson: sketch }));
    return true;
  } catch {
    // Storage full — keep the fields, drop the (much larger) sketch.
    try {
      localStorage.setItem(key, JSON.stringify({ ...payload, sketchJson: null }));
      return true;
    } catch {
      return false;
    }
  }
}

export function clearProductionItemDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // nothing to clear
  }
}