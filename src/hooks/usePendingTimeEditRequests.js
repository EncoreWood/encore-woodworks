import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Count of time-edit requests still waiting on a review.
 * Only admins review these, so callers pass enabled=false for everyone else.
 */
export function usePendingTimeEditRequests(enabled = true) {
  const queryClient = useQueryClient();

  const { data = 0 } = useQuery({
    queryKey: ["pending_time_edit_requests"],
    queryFn: async () => {
      const rows = await base44.entities.TimeEditRequest.filter({ status: "pending" }).catch(() => []);
      return Array.isArray(rows) ? rows.length : 0;
    },
    enabled,
    staleTime: 20000,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities.TimeEditRequest.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["pending_time_edit_requests"] });
    });
    return unsubscribe;
  }, [enabled, queryClient]);

  return enabled ? data : 0;
}