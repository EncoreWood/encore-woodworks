import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Single-row, horizontally-scrollable portal tab bar.
// - First tab stays fully visible by default (scrolls start at left edge).
// - Active tab is scrolled into view whenever it changes.
// - Faded edges + chevron indicators show when more tabs are available.
export default function PortalTabBar({ tabs, activeKey, onChange }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Reset to left edge whenever the set of tabs changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    update();
  }, [tabs, update]);

  // Keep the active tab within the visible viewport.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector(`[data-tab-key="${activeKey}"]`);
    if (active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < el.scrollLeft) el.scrollLeft = Math.max(0, left - 8);
      else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth + 8;
    }
    update();
  }, [activeKey, update]);

  const nudge = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-2 relative">
        {canLeft && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label="Scroll tabs left"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
        {canRight && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label="Scroll tabs right"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        <div ref={scrollRef} onScroll={update} className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              data-tab-key={t.key}
              onClick={() => onChange(t.key)}
              className={cn(
                "px-3.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                activeKey === t.key ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}