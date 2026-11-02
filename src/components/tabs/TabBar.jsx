import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTabs } from "./TabContext";

const ALWAYS_ALLOWED = new Set([
  "AccountSettings", "PrivacyPolicy", "MyAssignments", "Trainings", "TimeSheet", "MyProfile",
]);

const prettify = (page) => page.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");

/**
 * Tab strip under the top bar: switch between open pages, open a new one,
 * or close the ones no longer needed.
 */
export default function TabBar({ navGroups = {}, currentUser, allowedPages }) {
  const { tabs, activeId, activateTab, openTab, closeTab } = useTabs();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { labels, groups } = useMemo(() => {
    const labelsMap = {};
    const groupsList = [];
    Object.entries(navGroups).forEach(([key, group]) => {
      if (key === "admin" && currentUser?.role !== "admin") return;
      const items = (group.items || []).filter(
        (item) =>
          currentUser?.role === "admin" ||
          allowedPages?.has(item.page) ||
          ALWAYS_ALLOWED.has(item.page)
      );
      items.forEach((item) => { labelsMap[item.page] = item.name; });
      if (items.length > 0) groupsList.push({ key, name: group.name, items });
    });
    return { labels: labelsMap, groups: groupsList };
  }, [navGroups, currentUser, allowedPages]);

  const labelFor = (path) => {
    const page = path.split("?")[0].replace(/^\//, "");
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

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:bg-white/70 flex-shrink-0 touch-manipulation"
            title="Open a page in a new tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0 max-h-[70vh] overflow-y-auto">
          <div className="p-2 space-y-2">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.name}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => {
                      openTab(`/${item.page}`);
                      setPickerOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 text-left"
                  >
                    {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />}
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}