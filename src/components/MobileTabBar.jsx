import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Home, Factory, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "Projects", icon: Home, page: "Kanban" },
  { label: "Shop", icon: Factory, page: "ShopProduction" },
  { label: "Chat", icon: MessageSquare, page: "ChatBoard" },
];

export default function MobileTabBar({ currentPageName }) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = currentPageName === tab.page;
        return (
          <Link
            key={tab.page}
            to={createPageUrl(tab.page)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
              isActive ? "text-amber-600" : "text-slate-500"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}