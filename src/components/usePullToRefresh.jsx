import { useEffect, useRef, useState } from "react";

/**
 * usePullToRefresh — attaches a native pull-to-refresh gesture to a scrollable element.
 * @param {Function} onRefresh - async function to call when pull threshold is met
 * @param {Object}   options
 * @param {number}   options.threshold   - px to pull before triggering (default 80)
 * @param {boolean}  options.disabled    - disable the hook (e.g. on desktop)
 */
export default function usePullToRefresh(onRefresh, { threshold = 80, disabled = false } = {}) {
  const containerRef = useRef(null);
  const startYRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current || document.documentElement;

    const onTouchStart = (e) => {
      // Only activate when scrolled to top
      const scrollTop = el === document.documentElement
        ? window.scrollY
        : el.scrollTop;
      if (scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null || isRefreshing) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy, threshold * 1.5));
        // Prevent native scroll bounce while pulling
        if (dy > 8) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(0);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, threshold, disabled, pullDistance, isRefreshing]);

  return { containerRef, pullDistance, isRefreshing };
}