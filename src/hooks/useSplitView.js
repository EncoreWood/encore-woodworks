import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "encoreSplitView";
const DEFAULTS = { enabled: false, rightPage: "Kanban", ratio: 0.5 };

function readSplit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore unreadable storage — fall back to defaults
  }
  return { ...DEFAULTS };
}

/**
 * Split screen preference: whether it is on, which page sits on the right,
 * and how wide the left pane is. Persisted so it survives a refresh.
 */
export function useSplitView() {
  const [split, setSplit] = useState(readSplit);

  const updateSplit = useCallback((patch) => {
    setSplit((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage may be unavailable — the session still works
      }
      return next;
    });
  }, []);

  return { split, updateSplit };
}

/** Split screen only makes sense with room for two panes. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}