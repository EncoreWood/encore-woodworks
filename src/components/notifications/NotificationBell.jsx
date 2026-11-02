import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Package, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createPageUrl } from "@/utils";

const KIND_STYLE = {
  inventory: { Icon: Package, chip: "bg-amber-100 text-amber-700" },
  time_edit: { Icon: Clock, chip: "bg-blue-100 text-blue-700" },
  time_off: { Icon: CalendarDays, chip: "bg-violet-100 text-violet-700" },
};

/**
 * Top-bar notification bell. Each item comes from useAdminNotifications and
 * links to the page where it gets handled.
 */
export default function NotificationBell({ notifications = [], triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = notifications.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={triggerClassName}
        style={{ position: "relative" }}
        onClick={() => setOpen((prev) => !prev)}
        title={count > 0 ? `${count} notification${count === 1 ? "" : "s"}` : "Notifications"}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-bold text-slate-900 flex-1">Notifications</p>
            {count > 0 && (
              <span className="text-[10px] font-bold text-white bg-red-600 rounded-full px-1.5 py-0.5">
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center">
              <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">You're all caught up</p>
            </div>
          ) : (
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
              {notifications.map((item) => {
                const style = KIND_STYLE[item.kind] || KIND_STYLE.inventory;
                const Icon = style.Icon;
                return (
                  <li key={item.id}>
                    <Link
                      to={createPageUrl(item.page)}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.chip}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 leading-snug">{item.title}</span>
                        {item.description && (
                          <span className="block text-[11px] text-slate-500 leading-snug truncate">{item.description}</span>
                        )}
                        {item.date && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}