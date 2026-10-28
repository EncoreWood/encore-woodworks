import { createContext, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";

/**
 * In split screen the right pane keeps its own location. Pages that build
 * their state from the URL query read this context so each pane sees its
 * own parameters instead of the browser address bar.
 */
export const PaneSearchContext = createContext(null);

export function usePaneSearch() {
  const paneSearch = useContext(PaneSearchContext);
  return paneSearch === null || paneSearch === undefined ? window.location.search : paneSearch;
}

/**
 * Set by the right pane in split screen. Present only inside that pane, so a
 * page can move itself without disturbing the page on the other side.
 */
export const PaneNavContext = createContext(null);

/**
 * Drop-in replacement for react-router's navigate: inside the right pane it
 * moves that pane, everywhere else it moves the app.
 */
export function usePaneNavigate() {
  const routerNavigate = useNavigate();
  const paneGoTo = useContext(PaneNavContext);

  return useCallback(
    (to, options) => {
      if (!paneGoTo || typeof to !== "string") return routerNavigate(to, options);
      const url = new URL(to, window.location.origin);
      paneGoTo(url.pathname.replace(/^\//, ""), url.search);
    },
    [paneGoTo, routerNavigate]
  );
}