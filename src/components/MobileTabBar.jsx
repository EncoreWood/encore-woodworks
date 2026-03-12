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

// Always accessible regardless of permissions
const ALWAYS_ALLOWED = new Set(["AccountSettings", "PrivacyPolicy"]);

export default function MobileTabBar({ currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(ALL_TABS);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      if (user?.role === "admin") {
        setTabs(ALL_TABS);
        return;
      }
      const emps = await base44.entities.Employee.list();
      const emp = emps.find(e => e.user_email === user?.email || e.email === user?.email);
      if (emp) {
        const allowed = new Set(emp.allowed_pages || []);
        setTabs(ALL_TABS.filter(tab => tab.scope.some(p => allowed.has(p) || ALWAYS_ALLOWED.has(p))));
      }
    };
    load();
  }, []);

  // Save current full URL to the owning tab's storage slot
  useEffect(() => {
    for (const tab of tabs) {
      if (tab.scope.includes(currentPageName)) {
        sessionStorage.setItem(`tab_last_${tab.page}`, location.pathname + location.search);
        break;
      }
    }
  }, [currentPageName, location, tabs]);

  const handleTabClick = (e, tab) => {
    const saved = sessionStorage.getItem(`tab_last_${tab.page}`);
    const current = location.pathname + location.search;
    if (saved && saved !== current) {
      e.preventDefault();
      navigate(saved);
    }
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.scope.includes(currentPageName);
        return (
          <a
            key={tab.page}
            href={createPageUrl(tab.page)}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick(e, tab);
              if (!e.defaultPrevented) navigate(createPageUrl(tab.page));
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
              isActive ? "text-amber-600" : "text-slate-500"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}