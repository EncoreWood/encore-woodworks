/**
 * Returns the card style (borderLeft + backgroundColor) for pickup items
 * based on priority. Used in both ProductionCard and PickupList.
 */
export function getPickupCardStyle(priority) {
  switch (priority) {
    case "high":
      return { borderLeft: "4px solid #22c55e", backgroundColor: "#f0fdf4" };
    case "medium":
      return { borderLeft: "4px solid #f59e0b", backgroundColor: "#fffbeb" };
    case "low":
      return { borderLeft: "4px solid #3b82f6", backgroundColor: "#eff6ff" };
    default:
      return {};
  }
}