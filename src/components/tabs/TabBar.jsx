import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "./TabContext";

const prettify = (page) => page.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");

/**
 * Tab strip under the top bar: switch between open pages, open a fresh tab on
 * the main page, or close the ones no longer needed.
 */
export default function TabBar({ navGroups = {} }) {
  const { tabs, activeId, activateTab, openTab, closeTab } = useTabs();

  const labels = useMemo(() => {
    const labelsMap = {};
    Object.values(navGroups).forEach((group) => {
      (group.items || []).forEach((item) => { labelsMap[item.page] = item.name; });
    });
    return labelsMap;
  }, [navGroups]);

  const labelFor = (path) => {
    const [pathname, search = ""] = path.split("?");
    const page = pathname.replace(/^\//, "");
    // Some tabs carry their own label (e.g. an open PDF uses the file name).
    const tabLabel = new URLSearchParams(search).get("name");
    if (tabLabel) return tabLabel;
    if (!page) return "Home";
    return labels[page] || prettify(page);
  };

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 pl-2 pr-2 h-9 flex-shrink-0 border-b border-slate-400"
      style={{ backgroundColor: "#c7ccd3" }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => activateTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activateTab(tab.id);
                }
              }}
              title={labelFor(tab.path)}
              className={cn(
                "group flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-md text-[11px] max-w-[190px] cursor-pointer select-none flex-shrink-0 transition-colors",
                active
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-700 hover:bg-white/60"
              )}
            >
              <span className="truncate">{labelFor(tab.path)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                disabled={tabs.length === 1}
                className={cn(
                  "w-4 h-4 rounded flex items-center justify-center flex-shrink-0",
                  tabs.length === 1
                    ? "opacity-0 pointer-events-none"
                    : "text-slate-400 hover:text-red-600 hover:bg-slate-200"
                )}
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => openTab("/")}
        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:bg-white/70 flex-shrink-0 touch-manipulation"
        title="Open a new tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}