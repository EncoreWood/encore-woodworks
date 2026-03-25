import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Home, Factory, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const ALL_TABS = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard", scope: ["Dashboard"] },
  { label: "Projects", icon: Home, page: "Kanban", scope: ["Kanban", "ProjectDetails"] },
  { label: "Shop", icon: Factory, page: "ShopProduction", scope: ["ShopProduction"] },
  { label: "Chat", icon: MessageSquare, page: "ChatBoard", scope: ["ChatBoard"] },
];

const ALWAYS_ALLOWED = new Set(["AccountSettings", "PrivacyPolicy"]);

export default function MobileTabBar({ currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(ALL_TABS);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      if (user?.role === "admin") { setTabs(ALL_TABS); return; }
      const emps = await base44.entities.Employee.list();
      const emp = emps.find(e => e.user_email === user?.email || e.email === user?.email);
      if (emp) {
        const allowed = new Set(emp.allowed_pages || []);
        setTabs(ALL_TABS.filter(tab => tab.scope.some(p => allowed.has(p) || ALWAYS_ALLOWED.has(p))));
      }
    };
    load();
  }, []);

  // Save current URL to owning tab's storage slot
  useEffect(() => {
    for (const tab of tabs) {
      if (tab.scope.includes(currentPageName)) {
        sessionStorage.setItem(`tab_last_${tab.page}`, location.pathname + location.search);
        break;
      }
    }
  }, [currentPageName, location, tabs]);

  const handleTabPress = (tab) => {
    const saved = sessionStorage.getItem(`tab_last_${tab.page}`);
    const current = location.pathname + location.search;
    const target = saved && saved !== current ? saved : createPageUrl(tab.page);
    navigate(target);
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 flex"
      style={{ backgroundColor: "#9ca3af", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.scope.includes(currentPageName);
        return (
          <button
            key={tab.page}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); handleTabPress(tab); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] transition-colors active:opacity-60 touch-manipulation select-none",
              isActive ? "text-amber-800" : "text-slate-700"
            )}
          >
            <tab.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
            <span className={cn("text-[10px] font-semibold", isActive ? "text-amber-800" : "text-slate-700")}>
              {tab.label}
            </span>
            {isActive && <div className="absolute bottom-0 w-8 h-0.5 rounded-full bg-amber-600" />}
          </button>
        );
      })}
    </nav>
  );
}