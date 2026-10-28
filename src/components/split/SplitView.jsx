import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SplitPaneBar from "./SplitPaneBar";
import SplitPageRoutes from "./SplitPageRoutes";

const ALWAYS_ALLOWED = new Set([
  "AccountSettings", "PrivacyPolicy", "MyAssignments", "Trainings", "TimeSheet", "MyProfile",
]);

function buildGroups(navGroups, currentUser, allowedPages) {
  if (!navGroups || !currentUser) return [];
  return Object.entries(navGroups)
    .filter(([key]) => key !== "admin" || currentUser.role === "admin")
    .map(([key, group]) => {
      const items = (group.items || []).filter(
        (it) =>
          currentUser.role === "admin" ||
          allowedPages?.has(it.page) ||
          ALWAYS_ALLOWED.has(it.page)
      );
      return { key, name: group.name, items };
    })
    .filter((g) => g.items.length > 0);
}

/**
 * Two pages side by side. The left pane is the page the app is on; the right
 * pane runs its own history so each side can be worked independently.
 */
export default function SplitView({
  children,
  navGroups,
  allowedPages,
  currentUser,
  currentPageName,
  rightPage,
  ratio,
  onUpdate,
  onClose,
}) {
  const navigate = useNavigate();
  const [width, setWidth] = useState(ratio ?? 0.5);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    setWidth(ratio ?? 0.5);
  }, [ratio]);

  const groups = buildGroups(navGroups, currentUser, allowedPages);
  const pickablePages = groups.flatMap((g) => g.items.map((it) => it.page));
  // A stored page this person can no longer open falls back to their first allowed page.
  const activeRight = pickablePages.includes(rightPage)
    ? rightPage
    : pickablePages[0] || "Dashboard";

  const startDrag = useCallback(
    (e) => {
      e.preventDefault();
      const container = e.currentTarget.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const move = (ev) => {
        const next = Math.min(0.8, Math.max(0.2, (ev.clientX - rect.left) / rect.width));
        setWidth(next);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        onUpdate({ ratio: widthRef.current });
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onUpdate]
  );

  return (
    <div className="flex h-full min-h-0 w-full">
      <style>{`
        .split-pane .min-h-screen{ min-height:100%; }
        .split-pane .h-screen{ height:100%; }
      `}</style>

      <section
        className="split-pane flex min-h-0 min-w-0 flex-col"
        style={{ flex: `1 1 ${width * 100}%` }}
      >
        <SplitPaneBar
          side="left"
          page={currentPageName}
          groups={groups}
          onChange={(page) => navigate(createPageUrl(page))}
        />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        onPointerDown={startDrag}
        className="relative w-2 shrink-0 cursor-col-resize touch-none bg-slate-400/70 transition-colors hover:bg-amber-700/70 active:bg-amber-800/80"
      >
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50" />
      </div>

      <section
        className="split-pane flex min-h-0 min-w-0 flex-col"
        style={{ flex: `1 1 ${(1 - width) * 100}%` }}
      >
        <SplitPaneBar
          side="right"
          page={activeRight}
          groups={groups}
          onChange={(page) => onUpdate({ rightPage: page })}
          onClose={onClose}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <MemoryRouter key={activeRight} initialEntries={[`/${activeRight}`]}>
            <SplitPageRoutes />
          </MemoryRouter>
        </div>
      </section>
    </div>
  );
}