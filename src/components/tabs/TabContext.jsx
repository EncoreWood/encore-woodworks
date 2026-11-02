import { createContext, useContext } from "react";

export const TabsContext = createContext(null);

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("useTabs must be used inside TabShell");
  return context;
}