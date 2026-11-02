import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Pending inventory order requests sent from the shop floor. */
export function usePendingInventoryRequests(enabled = true) {
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["inventoryRequests"],
    queryFn: async () => {
      const rows = await base44.entities.InventoryRequest.filter({ status: "pending" });
      return [...rows].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    },
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities.InventoryRequest.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["inventoryRequests"] });
    });
    return unsubscribe;
  }, [enabled, queryClient]);

  return data;
}