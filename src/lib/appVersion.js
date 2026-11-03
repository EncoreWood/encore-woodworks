// Build identity for this running copy of the app. A new publish changes either the
// injected build id or the hashed entry bundle, so comparing either one tells us a
// newer build is live.

const META_NAME = "app-version";
const CHECK_TIMEOUT_MS = 6000;

const usable = (value) => !!value && !String(value).includes("%");

function metaVersion(doc) {
  const content = doc.querySelector?.(`meta[name="${META_NAME}"]`)?.getAttribute("content")?.trim() || "";
  return usable(content) ? content : "";
}

export function entryScriptSrc(doc = document) {
  return doc.querySelector?.('script[type="module"][src]')?.getAttribute("src") || "";
}

export function loadedStamp() {
  const id = metaVersion(document);
  const entry = entryScriptSrc();
  return { id, entry, value: id || entry || null };
}

// Prefer matching like with like: build id against build id, else the hashed entry
// bundle against the hashed entry bundle. Unknown on either side means "no news".
export function sameStamp(loaded, live) {
  if (!live) return true;
  if (loaded.id && live.id) return loaded.id === live.id;
  if (loaded.entry && live.entry) return loaded.entry === live.entry;
  if (!live.value) return true;
  return loaded.value === live.value;
}

async function withTimeout(run) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function fromVersionFile(signal) {
  const res = await fetch(`/version.json?v=${Date.now()}`, { cache: "no-store", signal });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const id = usable(data?.version) ? String(data.version) : "";
  const entry = usable(data?.entry) ? String(data.entry) : "";
  return id || entry ? { id, entry, value: id || entry } : null;
}

async function fromShellHtml(signal) {
  const res = await fetch(`${window.location.origin}/?v=${Date.now()}`, {
    cache: "no-store",
    signal,
    headers: { Accept: "text/html" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const metaTag = html.match(/<meta[^>]+name=["']app-version["'][^>]*>/i)?.[0] || "";
  const meta = metaTag.match(/content=["']([^"']+)["']/i)?.[1]?.trim() || "";
  const scriptTag = html.match(/<script[^>]+type=["']module["'][^>]*>/i)?.[0] || "";
  const entry = scriptTag.match(/src=["']([^"']+)["']/i)?.[1]?.trim() || "";
  const id = usable(meta) ? meta : "";
  const src = usable(entry) ? entry : "";
  return id || src ? { id, entry: src, value: id || src } : null;
}

// Never throws: an offline iPad or a network blip simply reports "no answer".
export async function fetchLiveStamp() {
  try {
    const fromFile = await withTimeout(fromVersionFile);
    if (fromFile) return fromFile;
  } catch {
    // fall through to the shell, which also works when version.json is unavailable
  }
  try {
    return await withTimeout(fromShellHtml);
  } catch {
    return null;
  }
}

// ---- reload-once bookkeeping (prevents a deploy-time reload loop) ----
const RELOAD_KEY = "encore:update-reloaded-for";

export function alreadyReloadedFor(stamp) {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === stamp;
  } catch {
    return false;
  }
}

export function markReloadedFor(stamp) {
  try {
    sessionStorage.setItem(RELOAD_KEY, stamp);
  } catch {
    // storage unavailable (private mode) — the in-memory guard still applies
  }
}