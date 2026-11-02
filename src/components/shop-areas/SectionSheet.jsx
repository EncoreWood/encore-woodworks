import { X } from "lucide-react";

/**
 * Full-screen section view used by every shop-area section tile.
 * Replaces the old popup dialog: it covers the app, scrolls its own content,
 * and leaves through the Exit button in the header.
 */
export default function SectionSheet({ open, onOpenChange, icon: Icon, title, subtitle, actions, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
      <header
        className="flex items-center gap-2 px-3 sm:px-4 h-14 bg-slate-900 text-white flex-shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {Icon && <Icon className="w-5 h-5 flex-shrink-0 text-amber-400" strokeWidth={1.9} />}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-300 leading-tight truncate">{subtitle}</p>}
        </div>
        {actions}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex-shrink-0 touch-manipulation"
        >
          <X className="w-4 h-4" /> Exit
        </button>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto bg-white min-h-full shadow-sm">{children}</div>
      </div>
    </div>
  );
}