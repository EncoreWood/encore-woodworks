import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Non-cmd page shortcuts (single keys, only when not typing)
const PAGE_SHORTCUTS = {
  presentations: {
    ArrowUp: "slide-prev",
    ArrowDown: "slide-next",
    ArrowLeft: "slide-prev",
    ArrowRight: "slide-next",
    t: "tool-text",
    v: "tool-select",
    r: "tool-rect",
    c: "tool-crop",
    "+": "zoom-in",
    "=": "zoom-in",
    "-": "zoom-out",
    0: "zoom-reset",
    Delete: "delete-object",
    Backspace: "delete-object",
  },
  flow: {
    r: "tool-route",
    v: "tool-select",
    l: "tool-label",
    "+": "zoom-in",
    "=": "zoom-in",
    "-": "zoom-out",
    0: "zoom-fit",
    Delete: "delete-selected",
  },
  projects: {
    n: "new-project",
    ArrowUp: "card-prev",
    ArrowDown: "card-next",
  },
};

// Cmd-based page shortcuts (Ctrl/Cmd + key)
const CMD_SHORTCUTS = {
  presentations: {
    d: "duplicate-slide",
    s: "save",
    c: "copy",
    v: "paste",
    z: "undo",
  },
  projects: {
    f: "focus-search",
  },
};

function getPageFromPath(pathname) {
  const p = pathname.replace(/^\/+/, "").toLowerCase();
  if (p === "" || p === "dashboard") return "dashboard";
  if (p.startsWith("presentation")) return "presentations";
  if (p === "flow") return "flow";
  if (p === "kanban") return "projects";
  return p;
}

export function useKeyboardShortcuts({ onOpenPalette, onOpenHelp, onCloseOverlay }) {
  const location = useLocation();

  useEffect(() => {
    const handleKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      const activePage = getPageFromPath(location.pathname);

      const tag = e.target.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;

      // ── Global shortcuts (work even when typing) ──
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenPalette?.();
        return;
      }
      if (cmd && e.key === "/") {
        e.preventDefault();
        onOpenHelp?.();
        return;
      }
      if (e.key === "Escape") {
        onCloseOverlay?.();
        return;
      }

      // Skip all other shortcuts when typing
      if (isTyping) return;

      // ── Cmd-based page shortcuts ──
      if (cmd) {
        const key = e.key.toLowerCase();

        // Cmd+Shift+Z = redo (presentations only)
        if (key === "z" && e.shiftKey && activePage === "presentations") {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("encore:shortcut", { detail: { page: activePage, action: "redo" } })
          );
          return;
        }

        const cmdMap = CMD_SHORTCUTS[activePage];
        if (cmdMap && cmdMap[key]) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("encore:shortcut", {
              detail: { page: activePage, action: cmdMap[key] },
            })
          );
        }
        return; // Don't process other cmd combos as page shortcuts
      }

      // ── Non-cmd page shortcuts ──
      const pageMap = PAGE_SHORTCUTS[activePage];
      if (pageMap) {
        const action = pageMap[e.key];
        if (action) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("encore:shortcut", { detail: { page: activePage, action } })
          );
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [location.pathname, onOpenPalette, onOpenHelp, onCloseOverlay]);
}