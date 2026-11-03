import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { denverDateStr } from "@/lib/stagePoints";

// One call serves the day, the week and the month. The server reads the board's cards
// once and derives all three from that read — three separate calls per screen is what
// exhausted the app's entity-read limit and stalled the board.
export default function useProductionBoardPoints({ enabled, weekFrom, monthFrom }) {
  const [date, setDate] = useState(() => denverDateStr(new Date()));

  useEffect(() => {
    const refreshDate = () => setDate(denverDateStr(new Date()));
    // Clock-only tick, not a request: kept-open tabs change days in Denver.
    const timer = setInterval(refreshDate, 60_000);
    window.addEventListener("focus", refreshDate);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
    };
  }, []);

  const query = useQuery({
    // Keeps the existing key prefix, so every invalidation after a card move still lands.
    queryKey: ["productionTodayPoints", "board", date, weekFrom || "", monthFrom || ""],
    queryFn: async () => (await base44.functions.invoke("getProductionTodayPoints", {
      date,
      windows: {
        week: { from: weekFrom, to: date },
        month: { from: monthFrom, to: date },
      },
    })).data,
    enabled: !!enabled && !!weekFrom && !!monthFrom,
    staleTime: 30_000,
    // A throttled call retried three times only deepens the throttle.
    retry: false,
    // Self-heal after a throttle without waiting for someone to touch a card.
    refetchInterval: 120_000,
  });

  return { ...query, date };
}