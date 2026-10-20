import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useProductionStageHistory(stageId, search) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["productionStageHistory", stageId, search],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const response = await base44.functions.invoke("getProductionStageHistory", {
        stageId, search, offset: pageParam
      });
      return response.data;
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchInterval: 60_000
  });
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["productionStageHistory"] });
    const stopItems = base44.entities.ProductionItem.subscribe(refresh);
    const stopMoves = base44.entities.ColumnMoveLog.subscribe(refresh);
    return () => { stopItems(); stopMoves(); };
  }, [queryClient]);
  return {
    ...query,
    rows: query.data?.pages.flatMap(page => page.rows) || [],
    stats: query.data?.pages[0]?.stats
  };
}