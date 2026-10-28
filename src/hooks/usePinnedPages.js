import { useState } from "react";

const STORAGE_KEY = "pinnedNavPages";
const DEFAULT_PINNED = ["ShopProduction", "Kanban"];

function loadPinned() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PINNED;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : DEFAULT_PINNED;
  } catch {
    return DEFAULT_PINNED;
  }
}

/**
 * Pages the user keeps at the top of the nav. Stored per browser.
 */
export function usePinnedPages() {
  const [pinnedPages, setPinnedPages] = useState(loadPinned);

  const togglePin = (page) => {
    setPinnedPages((prev) => {
      const next = prev.includes(page)
        ? prev.filter((p) => p !== page)
        : [...prev, page];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const isPinned = (page) => pinnedPages.includes(page);

  return { pinnedPages, togglePin, isPinned };
}