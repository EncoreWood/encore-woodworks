import { createContext, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight, non-portal dialog used by full-screen viewers (plan viewer /
 * annotator). It renders *inside the page* instead of on top of the whole app,
 * and starts below the tab strip — so the tab bar stays clickable while the
 * viewer is open, and switching tabs simply hides it until you come back.
 */

const CloseContext = createContext(() => {});

const stripBottom = () => {
  const bar = document.querySelector("[data-app-tabbar]");
  if (!bar) return 0;
  const rect = bar.getBoundingClientRect();
  return rect.height > 0 ? Math.max(0, Math.round(rect.bottom)) : 0;
};

export function Dialog({ open, onOpenChange, children }) {
  const close = () => onOpenChange?.(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return <CloseContext.Provider value={close}>{children}</CloseContext.Provider>;
}

export function DialogContent({ className, children, ...props }) {
  const close = useContext(CloseContext);
  const [top, setTop] = useState(stripBottom);

  useEffect(() => {
    const sync = () => setTop(stripBottom());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex p-2" style={{ top }}>
      <div
        className={cn(
          "relative w-full",
          className,
          "max-h-full bg-background rounded-lg border shadow-2xl flex flex-col overflow-hidden"
        )}
        {...props}
      >
        <button
          type="button"
          onClick={close}
          title="Close"
          className="absolute right-3 top-3 z-10 w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return (
    <div
      className={cn("text-lg font-semibold leading-none tracking-tight pr-10", className)}
      {...props}
    />
  );
}