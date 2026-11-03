import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, UserCircle, X } from "lucide-react";

/**
 * Mobile navigation drawer. Rendered into document.body so it always sits above
 * the tab bar and page chrome, with a single scroll region so touch scrolling
 * and taps behave on phones.
 */
export default function MobileNavDrawer({
  groups,
  currentPageName,
  pendingTaskCount = 0,
  onClose,
}) {
  // Lock the page behind the drawer so touch scrolling can't leak through
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const drawer = (
    <div
      className="sm:hidden fixed inset-0 z-[100] flex"
      style={{ height: "100dvh", overscrollBehavior: "contain" }}
    >
      {/* Backdrop — tap anywhere outside the panel to close */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 touch-manipulation"
      />

      <div className="relative flex h-full max-h-full">
        {/* Panel: header + footer stay put, only the nav list scrolls */}
        <div
          className="encore-neu-surface relative w-64 max-w-[78vw] h-full flex flex-col overflow-hidden shadow-2xl"
          style={{ backgroundColor: "#9ca3af" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-400 shrink-0">
            <span className="font-bold text-slate-900 text-sm">Menu</span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 text-slate-800 touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {groups.map(({ key, name, items }) => (
              <div key={key}>
                <p className="text-xs font-bold text-slate-600 uppercase px-2 mb-1 tracking-wider">
                  {name}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={onClose}
                      className="encore-neu-link flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium touch-manipulation select-none min-h-[40px]"
                      data-active={currentPageName === item.page}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{item.name}</span>
                      {item.page === "MyAssignments" && pendingTaskCount > 0 && (
                        <span className="ml-auto min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {pendingTaskCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-400 shrink-0">
            <Link
              to={createPageUrl("AccountSettings")}
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-800 text-xs font-medium touch-manipulation"
            >
              <UserCircle className="w-3.5 h-3.5" /> Account
            </Link>
          </div>
        </div>

        {/* Collapse tab on the panel edge */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-20 rounded-r-xl shadow-md border border-l-0 border-slate-400 text-slate-700 touch-manipulation"
            style={{ backgroundColor: "#9ca3af" }}
            title="Collapse menu"
            aria-label="Collapse menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}