import { useEffect, useState } from "react";
import { isEodWindow } from "@/lib/shopTime";

/**
 * True while the shop clock sits in the 5:25–5:35 PM End of Day window, so the
 * End of Day action can pulse. Re-checks twice a minute; the reminder itself is
 * delivered by the bell notification, never by chat.
 */
export function useEodWindow() {
  const [active, setActive] = useState(() => isEodWindow());

  useEffect(() => {
    const id = setInterval(() => setActive(isEodWindow()), 30_000);
    return () => clearInterval(id);
  }, []);

  return active;
}