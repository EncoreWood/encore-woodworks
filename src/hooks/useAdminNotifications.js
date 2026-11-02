import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const pendingRows = (entityName) =>
  base44.entities[entityName]
    .filter({ status: "pending" })
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch(() => []);

/**
 * Everything an admin needs to act on, in one list for the top-bar bell.
 * To add a new notification type later, add its pending query here and one
 * entry in the notifications useMemo — the bell picks it up automatically.
 */
export function useAdminNotifications(enabled = true) {
  const queryClient = useQueryClient();

  const { data: inventoryRequests = [] } = useQuery({
    queryKey: ["inventoryRequests"],
    queryFn: () => pendingRows("InventoryRequest"),
    enabled,
  });

  const { data: timeEditRequests = [] } = useQuery({
    queryKey: ["pending_time_edit_requests_list"],
    queryFn: () => pendingRows("TimeEditRequest"),
    enabled,
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["pending_vacations"],
    queryFn: () => pendingRows("Vacation"),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubs = [
      ["InventoryRequest", "inventoryRequests"],
      ["TimeEditRequest", "pending_time_edit_requests_list"],
      ["Vacation", "pending_vacations"],
    ].map(([entity, queryKey]) =>
      base44.entities[entity].subscribe(() => queryClient.invalidateQueries({ queryKey: [queryKey] }))
    );
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [enabled, queryClient]);

  return useMemo(() => {
    if (!enabled) return [];

    const items = [
      ...inventoryRequests.map((r) => ({
        id: `inventory-${r.id}`,
        kind: "inventory",
        title: `Order ${r.requested_quantity || ""}${r.unit ? ` ${r.unit}` : ""} of ${r.item_name}`,
        description: `${r.requested_by}${r.location ? ` · ${r.location}` : ""}${
          r.current_quantity != null ? ` · ${r.current_quantity} on hand` : ""
        }`,
        page: "Inventory",
        date: r.created_date,
      })),
      ...timeEditRequests.map((r) => ({
        id: `time-edit-${r.id}`,
        kind: "time_edit",
        title: `${r.employee_name || "Employee"} needs a time edit`,
        description: `${r.date ? `${format(new Date(`${r.date}T00:00:00`), "MMM d")} · ` : ""}${r.reason || ""}`,
        page: "TimeSheet",
        date: r.created_date,
      })),
      ...timeOffRequests.map((r) => ({
        id: `time-off-${r.id}`,
        kind: "time_off",
        title: `${r.employee_name || "Employee"} requested time off`,
        description:
          r.start_date && r.end_date
            ? `${format(new Date(`${r.start_date}T00:00:00`), "MMM d")} – ${format(
                new Date(`${r.end_date}T00:00:00`),
                "MMM d"
              )}${r.use_pto ? " · PTO" : ""}`
            : r.notes || "",
        page: "Team",
        date: r.created_date,
      })),
    ];

    return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [enabled, inventoryRequests, timeEditRequests, timeOffRequests]);
}