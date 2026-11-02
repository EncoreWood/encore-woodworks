import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TabsContext } from "./TabContext";

// Pages that render outside the app shell (no sidebar / top bar).
const BARE_PAGES = new Set(["ClientPortal", "InventoryScan"]);

let seq = 0;
const newId = () => `tab-${++seq}`;

const currentPath = () => window.location.pathname + window.location.search;

/**
 * Browser-style tabs: every open tab keeps its page mounted, so scroll position
 * and in-page state survive while switching between tabs.
 */
export default function TabShell({ RouteView, LayoutWrapper }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState(() => {
    const tab = { id: newId(), path: currentPath() };
    return { tabs: [tab], activeId: tab.id };
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Links clicked inside the active tab move that tab, never the other ones.
  useEffect(() => {
    const path = location.pathname + location.search;
    setState((prev) => {
      const active = prev.tabs.find((t) => t.id === prev.activeId);
      if (!active || active.path === path) return prev;
      return {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === prev.activeId ? { ...t, path } : t)),
      };
    });
  }, [location.pathname, location.search]);

  const activateTab = useCallback(
    (id) => {
      const tab = stateRef.current.tabs.find((t) => t.id === id);
      if (!tab) return;
      setState((prev) => ({ ...prev, activeId: id }));
      if (tab.path !== currentPath()) navigate(tab.path);
    },
    [navigate]
  );

  const openTab = useCallback(
    (path) => {
      const existing = stateRef.current.tabs.find((t) => t.path === path);
      if (existing) {
        activateTab(existing.id);
        return;
      }
      const tab = { id: newId(), path };
      setState((prev) => ({ tabs: [...prev.tabs, tab], activeId: tab.id }));
      if (path !== currentPath()) navigate(path);
    },
    [activateTab, navigate]
  );

  const closeTab = useCallback(
    (id) => {
      const { tabs, activeId } = stateRef.current;
      if (tabs.length <= 1) return;
      const index = tabs.findIndex((t) => t.id === id);
      const remaining = tabs.filter((t) => t.id !== id);

      if (id !== activeId) {
        setState((prev) => ({ ...prev, tabs: remaining }));
        return;
      }

      const next = remaining[Math.min(index, remaining.length - 1)];
      setState({ tabs: remaining, activeId: next.id });
      if (next.path !== currentPath()) navigate(next.path);
    },
    [navigate]
  );

  const activeTab = state.tabs.find((t) => t.id === state.activeId) || state.tabs[0];
  const pageName = activeTab.path.split("?")[0].replace(/^\//, "");
  const bare = BARE_PAGES.has(pageName);

  const api = useMemo(
    () => ({
      tabs: state.tabs,
      activeId: state.activeId,
      activateTab,
      openTab,
      closeTab,
    }),
    [state.tabs, state.activeId, activateTab, openTab, closeTab]
  );

  const panels = (
    <div className="relative h-full min-h-0">
      {state.tabs.map((tab) => {
        const queryIndex = tab.path.indexOf("?");
        const pathname = queryIndex === -1 ? tab.path : tab.path.slice(0, queryIndex);
        const search = queryIndex === -1 ? "" : tab.path.slice(queryIndex);
        return (
          <div
            key={tab.id}
            aria-hidden={tab.id !== state.activeId}
            className={
              tab.id === state.activeId
                ? "absolute inset-0 overflow-auto"
                : "absolute inset-0 overflow-auto invisible pointer-events-none"
            }
          >
            <RouteView location={{ pathname, search, hash: "", state: null, key: tab.id }} />
          </div>
        );
      })}
    </div>
  );

  return (
    <TabsContext.Provider value={api}>
      {bare ? (
        <div className="h-screen w-full overflow-hidden">{panels}</div>
      ) : (
        <LayoutWrapper currentPageName={pageName}>{panels}</LayoutWrapper>
      )}
    </TabsContext.Provider>
  );
}