import { useEffect } from "react";

// Shared "something is happening that a reload would destroy" counter. Any write,
// upload, or annotation save holds it; the update watcher refuses to reload while
// a hold is active.
let holds = 0;

export function holdUpdates() {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
  };
}

export const updatesHeld = () => holds > 0;

// Blocks reloads while mounted/active — used by surfaces that are always "mid-work"
// (open plan annotator, sketch pad).
export function useUpdateGuard(active = true) {
  useEffect(() => {
    if (!active) return;
    return holdUpdates();
  }, [active]);
}