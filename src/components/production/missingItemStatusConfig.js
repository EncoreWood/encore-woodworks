// Missing-item resolution flow. Items start "Open" when reported, then advance
// through the flow. "Resolved" is a legacy value treated the same as "Completed".
export const STATUS_FLOW = ["Open", "Ordered", "Received", "In Production", "Ready", "Completed"];
export const DONE_STATUSES = ["Completed", "Resolved"];

export const STATUS_CONFIG = {
  Open:            { label: "Open",         color: "bg-red-100 text-red-700",      dot: "bg-red-500" },
  Ordered:         { label: "Ordered",       color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400" },
  Received:        { label: "Received",      color: "bg-cyan-100 text-cyan-800",    dot: "bg-cyan-500" },
  "In Production": { label: "In Production", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  Ready:           { label: "Ready",         color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  Completed:       { label: "Completed",     color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  Resolved:        { label: "Completed",     color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
};