import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Collapsible meeting section card.
 * `headerAction` renders an optional control (e.g. a button) on the right of the
 * header, outside the collapse toggle so it stays tappable.
 * `onTitleClick` makes the title itself an action (e.g. open the Production board) —
 * the chevron and count sit in their own button, so collapsing still works alone.
 */
export default function SectionCard({ title, icon: Icon, color, count, children, defaultOpen = false, headerAction, onTitleClick }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    red:    { border: "border-l-red-500",    header: "bg-gradient-to-r from-red-100 to-red-50",       text: "text-red-700",    badge: "bg-red-500 text-white",    icon: "text-red-600" },
    amber:  { border: "border-l-amber-500",  header: "bg-gradient-to-r from-amber-100 to-yellow-50",  text: "text-amber-800",  badge: "bg-amber-500 text-white",  icon: "text-amber-600" },
    blue:   { border: "border-l-blue-500",   header: "bg-gradient-to-r from-blue-100 to-sky-50",      text: "text-blue-800",   badge: "bg-blue-500 text-white",   icon: "text-blue-600" },
    green:  { border: "border-l-green-500",  header: "bg-gradient-to-r from-green-100 to-emerald-50", text: "text-green-800",  badge: "bg-green-500 text-white",  icon: "text-green-600" },
    purple: { border: "border-l-purple-500", header: "bg-gradient-to-r from-purple-100 to-violet-50", text: "text-purple-800", badge: "bg-purple-500 text-white", icon: "text-purple-600" },
    slate:  { border: "border-l-slate-500",  header: "bg-gradient-to-r from-slate-200 to-slate-100",  text: "text-slate-700",  badge: "bg-slate-500 text-white",  icon: "text-slate-600" },
    orange: { border: "border-l-orange-500", header: "bg-gradient-to-r from-orange-100 to-amber-50",  text: "text-orange-800", badge: "bg-orange-500 text-white", icon: "text-orange-600" },
  };
  const c = colors[color] || colors.slate;

  return (
    <Card className={`overflow-hidden border-l-[6px] ${c.border} shadow-xl`}>
      <div className={`w-full flex items-center gap-2 px-6 py-5 ${c.header}`}>
        <button
          type="button"
          className={`flex-1 flex items-center gap-3 min-w-0 text-left rounded-lg transition-all hover:brightness-95 ${onTitleClick ? "pr-2" : ""}`}
          onClick={onTitleClick || (() => setOpen(o => !o))}
          title={onTitleClick ? `Open ${title}` : undefined}
        >
          <Icon className={`w-6 h-6 flex-shrink-0 ${c.icon}`} />
          <span className={`text-xl font-extrabold ${c.text} truncate`}>{title}</span>
          {onTitleClick && <ExternalLink className={`w-5 h-5 flex-shrink-0 opacity-70 ${c.text}`} />}
        </button>
        <button
          type="button"
          className="flex items-center gap-3 flex-shrink-0 rounded-lg py-1 pl-2 hover:brightness-95 transition-all"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          {count !== undefined && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm ${c.badge}`}>{count}</span>
          )}
          <ChevronDown className={`w-5 h-5 ${c.text} transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
      </div>
      {open && <div className="p-5">{children}</div>}
    </Card>
  );
}