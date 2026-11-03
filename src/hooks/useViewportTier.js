import { useEffect, useState } from "react";

// "narrow" < 768px · "tablet" 768–1279px · "desktop" ≥ 1280px
export default function useViewportTier() {
  const read = () => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 768) return "narrow";
    if (window.innerWidth < 1280) return "tablet";
    return "desktop";
  };
  const [tier, setTier] = useState(read);

  useEffect(() => {
    const onResize = () => setTier(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return tier;
}