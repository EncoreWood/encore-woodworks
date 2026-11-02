import { useEffect, useState } from "react";

/**
 * Distance from the top of the window to the bottom of the open-tab strip.
 * Full-page overlays start here so the app's tabs stay clickable above them.
 */
export function useTabStripBottom() {
  const read = () => {
    if (typeof document === "undefined") return 0;
    const bar = document.querySelector("[data-app-tabbar]");
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return rect.height > 0 ? Math.max(0, Math.round(rect.bottom)) : 0;
  };

  const [top, setTop] = useState(read);

  useEffect(() => {
    const sync = () => setTop(read());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const timer = setTimeout(sync, 150);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clearTimeout(timer);
    };
  }, []);

  return top;
}