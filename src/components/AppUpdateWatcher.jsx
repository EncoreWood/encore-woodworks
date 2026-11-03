import { useEffect, useRef, useState } from "react";
import {
  loadedStamp,
  fetchLiveStamp,
  sameStamp,
  alreadyReloadedFor,
  markReloadedFor,
} from "@/lib/appVersion";
import { updatesHeld } from "@/lib/updateGuards";

const POLL_MS = 60_000;        // steady check while the app is on screen
const EVENT_THROTTLE_MS = 5_000; // a wake-up fires several events at once
const RETRY_PENDING_MS = 1_500;  // how often a waiting update re-checks "safe?"

const TEXT_INPUT_TYPES = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"]);

// Reloading is only safe when nothing the user is doing would be lost.
export function isSafeToReload() {
  if (updatesHeld()) return false;
  if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return false;

  const active = document.activeElement;
  if (active && active !== document.body) {
    if (active.isContentEditable) return false;
    if (active.tagName === "TEXTAREA" || active.tagName === "SELECT") return false;
    if (active.tagName === "INPUT" && !TEXT_INPUT_TYPES.has((active.getAttribute("type") || "").toLowerCase())) return false;
  }
  return true;
}

export default function AppUpdateWatcher() {
  const [pending, setPending] = useState(null); // the live build waiting to be applied
  const loadedRef = useRef(loadedStamp());
  const lastCheckRef = useRef(0);
  const inFlightRef = useRef(false);

  const applyUpdate = (stamp) => {
    markReloadedFor(stamp);
    window.location.reload();
  };

  useEffect(() => {
    const check = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const live = await fetchLiveStamp();
        if (!live || sameStamp(loadedRef.current, live)) return;
        const stamp = live.value;
        if (!stamp) return;
        // A build that survived one reload isn't going to change by reloading again.
        if (!alreadyReloadedFor(stamp) && isSafeToReload()) {
          applyUpdate(stamp);
          return;
        }
        setPending(stamp);
      } finally {
        inFlightRef.current = false;
      }
    };

    const checkSoon = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastCheckRef.current < EVENT_THROTTLE_MS) return;
      lastCheckRef.current = now;
      check();
    };

    const onVisible = () => { if (document.visibilityState === "visible") checkSoon(); };
    const onPageShow = (event) => {
      if (event.persisted) {
        // Restored from the back/forward cache: it may be an old build entirely.
        lastCheckRef.current = 0;
      }
      checkSoon();
    };

    // Initial load
    lastCheckRef.current = Date.now();
    check();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkSoon);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", checkSoon);

    const poll = setInterval(checkSoon, POLL_MS);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkSoon);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", checkSoon);
    };
  }, []);

  // An update already known: apply it the moment the user is back on a safe screen.
  useEffect(() => {
    if (!pending) return;
    const tryApply = () => {
      if (isSafeToReload()) applyUpdate(pending);
    };
    const timer = setInterval(tryApply, RETRY_PENDING_MS);
    document.addEventListener("visibilitychange", tryApply);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tryApply);
    };
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      data-update-banner="true"
      className="fixed left-1/2 bottom-4 z-[95] -translate-x-1/2 px-2 w-auto max-w-[calc(100vw-1rem)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="status"
    >
      <button
        type="button"
        onClick={() => applyUpdate(pending)}
        className="flex items-center gap-2 rounded-full bg-slate-900 text-white shadow-lg border border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-800 active:opacity-80"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
        Update available — tap to refresh
      </button>
    </div>
  );
}