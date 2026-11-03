import { useEffect, useRef, useState } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Factory, Package, PackageX, MessageSquare, History, LineChart as LineChartIcon } from "lucide-react";

const TAB_CLASS =
  "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm";

// Single-line tab strip: never wraps. When the tabs don't fit (iPad portrait) the row
// scrolls sideways with a hidden scrollbar, the active tab is centred into view, and a
// soft fade hints there is more on either side.
export default function ProductionTabStrip({ activeTab, chatUnread }) {
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  };

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  // Keep the active tab visible when it changes (and on first mount).
  useEffect(() => {
    const el = scrollerRef.current;
    const active = el?.querySelector('[data-state="active"]');
    if (!el || !active) return;
    const left = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    const timer = setTimeout(updateEdges, 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <div className="relative mb-2">
      <div ref={scrollerRef} className="no-scrollbar relative overflow-x-auto">
        <TabsList className="h-8 w-max min-w-full flex-nowrap items-center justify-start gap-0.5 rounded-lg bg-muted p-1 text-muted-foreground md:h-9">
          <TabsTrigger value="production" className={TAB_CLASS}>
            <Factory /> Production
          </TabsTrigger>
          <TabsTrigger value="pacing" className={TAB_CLASS}>
            <LineChartIcon /> Pacing
          </TabsTrigger>
          <TabsTrigger value="job_packets" className={TAB_CLASS}>
            <Package /> Job Packets
          </TabsTrigger>
          <TabsTrigger value="missing_items" className={TAB_CLASS}>
            <PackageX /> Missing
          </TabsTrigger>
          <TabsTrigger value="production_chat" className={TAB_CLASS}>
            <MessageSquare /> Chat
            {activeTab !== "production_chat" && chatUnread > 0 && (
              <span className="ml-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="move_history" className={TAB_CLASS}>
            <History /> History
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Edge fades: only while there is more to scroll */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-slate-50 to-transparent transition-opacity ${edges.left ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-slate-50 to-transparent transition-opacity ${edges.right ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}