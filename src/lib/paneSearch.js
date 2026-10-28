import { createContext, useContext } from "react";

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