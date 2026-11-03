import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useTabStripBottom } from "@/hooks/useTabStripBottom";

/**
 * Standard layer for anything that opens over the app (full-screen views,
 * slide-overs, sheets). It starts just below the app's header bars, so the
 * layer's own header, title and close/exit button are always reachable and
 * never hidden behind the top navigation.
 *
 * Use `portal` for layers opened from a page that animates with a transform
 * (which would otherwise capture the fixed positioning).
 */
export default function AppOverlay({ className, style, children, portal = false, ...rest }) {
  const top = useTabStripBottom();

  const layer = (
    <div
      className={cn("fixed inset-x-0 bottom-0", className)}
      style={{ top, ...style }}
      {...rest}
    >
      {children}
    </div>
  );

  return portal ? createPortal(layer, document.body) : layer;
}