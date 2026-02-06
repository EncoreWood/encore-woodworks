import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Hammer, Kanban as KanbanIcon, Calendar, Factory, Coffee, Users, MessageSquare, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const { data: boardGroups = [] } = useQuery({
    queryKey: ["boardGroups"],
    queryFn: () => base44.entities.BoardGroup.list('-order'),
    initialData: []
  });

  const defaultGroups = [
    {
      name: "Boards",
      boards: [
        { name: "Calendar", icon: "Calendar", page: "Calendar" },
        { name: "Production", icon: "Factory", page: "ShopProduction" },
        { name: "Inventory", icon: "Coffee", page: "Inventory" },
        { name: "Chat", icon: "MessageSquare", page: "ChatBoard" },
        { name: "Team", icon: "Users", page: "Team" }
      ],
      order: 0
    }
  ];

  const allGroups = boardGroups.length > 0 ? boardGroups : defaultGroups;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900 tracking-tight">
              Encore
            </span>
          </Link>

          <nav className="space-y-6">
            {allGroups.map((group) => (
              <div key={group.name}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
                  {group.name}
                </h3>
                <div className="space-y-1">
                  {group.boards?.map((item) => {
                    const IconMap = { Calendar, Factory, Coffee, MessageSquare, Users };
                    const ItemIcon = IconMap[item.icon] || Coffee;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-sm",
                          currentPageName === item.page
                            ? "bg-amber-100 text-amber-700"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <ItemIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="border-t border-slate-200 pt-4">
              <Link
                to={createPageUrl("BoardSettings")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-sm",
                  currentPageName === "BoardSettings"
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Board Settings</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="px-8 py-4 flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 hover:opacity-80">
              <span className="text-sm text-slate-600">← Back to Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}