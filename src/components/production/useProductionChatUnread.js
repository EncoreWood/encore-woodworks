import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const PRODUCTION_CHAT_MESSAGES_KEY = ["productionChatMessages"];

// Live count of unread team-chat messages for the current user.
// A message is unread when it's newer than the user's read marker and not sent by them.
export function useProductionChatUnread(user) {
  const queryClient = useQueryClient();
  const email = user?.email;

  const { data: messages = [] } = useQuery({
    queryKey: PRODUCTION_CHAT_MESSAGES_KEY,
    queryFn: () => base44.entities.ProductionChatMessage.list("-created_date", 200),
    staleTime: 30_000,
    enabled: !!email,
  });

  const { data: readMarker } = useQuery({
    queryKey: ["productionChatRead", email],
    queryFn: async () => {
      const rows = await base44.entities.ProductionChatRead.filter({ user_email: email });
      return rows[0] || null;
    },
    staleTime: 30_000,
    enabled: !!email,
  });

  // Real-time: refresh counts the moment a new message lands
  useEffect(() => {
    const unsub = base44.entities.ProductionChatMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_CHAT_MESSAGES_KEY });
    });
    return unsub;
  }, [queryClient]);

  if (!email) return 0;
  const lastRead = readMarker?.last_read_at ? new Date(readMarker.last_read_at) : null;
  return messages.filter(
    m => m.user_email !== email && (!lastRead || new Date(m.created_date) > lastRead)
  ).length;
}