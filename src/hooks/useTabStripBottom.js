import { useEffect, useState } from "react";

const CHROME_SELECTOR = "[data-app-topbar], [data-app-tabbar]";

/**
 * Distance from the top of the window to the bottom of the app's top chrome
 * (group tabs + open-tab strip, or the phone header).
 * Full-page overlays start here so the app's navigation stays clickable above
 * them and never covers their own header/close buttons.
 */
export function useTabStripBottom() {
  const read = () => {
    if (typeof document === "undefined") return 0;
    let bottom = 0;
    document.querySelectorAll(CHROME_SELECTOR).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) bottom = Math.max(bottom, Math.round(rect.bottom));
    });
    return Math.max(0, bottom);
  };

  const [top, setTop] = useState(read);

  useEffect(() => {
    const sync = () => setTop(read());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    // The bars can still be settling on first paint (fonts, tabs, safe areas)
    const early = setTimeout(sync, 150);
    const late = setTimeout(sync, 600);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    if (observer) document.querySelectorAll(CHROME_SELECTOR).forEach((el) => observer.observe(el));
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clearTimeout(early);
      clearTimeout(late);
      observer?.disconnect();
    };
  }, []);

  return top;
}