import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Per-user notifications (the bell) — records addressed to the signed-in user
 * that they have not opened yet. The 5:25 PM End of Day reminder lands here.
 */
export function useMyNotifications(email) {
  const queryClient = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["my_notifications", email],
    queryFn: async () => {
      const res = await base44.entities.Notification.filter(
        { user_email: email, read: false },
        { sort: "-created_date", limit: 20 }
      );
      return Array.isArray(res) ? res : res?.items || [];
    },
    enabled: !!email,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!email) return;
    const unsubscribe = base44.entities.Notification.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["my_notifications", email] })
    );
    return unsubscribe;
  }, [email, queryClient]);

  return rows.map((n) => ({
    id: `notification-${n.id}`,
    notificationId: n.id,
    kind: n.kind || "end_of_day",
    title: n.title,
    description: n.message,
    page: n.page || "ShopProduction",
    action: n.action,
    date: n.created_date,
  }));
}