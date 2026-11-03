import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Stage points for a Denver date window (week, month). Runs through the same server
// calculation the daily pills use, so a window figure can never disagree with a pill.
// Shares the ["productionTodayPoints"] query key prefix, so existing invalidations
// after a card move refresh this too.
export default function useProductionStageWindowPoints(from, to, enabled) {
  return useQuery({
    queryKey: ["productionTodayPoints", "window", from, to],
    queryFn: async () => (await base44.functions.invoke("getProductionTodayPoints", { from, to })).data,
    enabled: !!enabled && !!from && !!to,
    staleTime: 30_000,
  });
}