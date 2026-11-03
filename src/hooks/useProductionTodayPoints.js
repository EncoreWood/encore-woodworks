import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { denverDateStr } from "@/lib/stagePoints";

export default function useProductionTodayPoints(enabled) {
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
    queryKey: ["productionTodayPoints", date],
    queryFn: async () => (await base44.functions.invoke("getProductionTodayPoints", {})).data,
    enabled,
    staleTime: 30_000,
  });
  return { ...query, date };
}