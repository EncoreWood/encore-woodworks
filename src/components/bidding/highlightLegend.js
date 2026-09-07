// Shared highlight-color legend — one source of truth for the Annotate Plan toolbar
// and the client-facing "Where Your Cabinets Are Located" section, so colors and
// labels always match between the estimator's markup and the client's estimate.
export const HIGHLIGHT_COLORS = [
  { label: "Base",   color: "#d97706", hex: "rgba(217,119,6,0.28)" },
  { label: "Upper",  color: "#3b82f6", hex: "rgba(59,130,246,0.28)" },
  { label: "Tall",   color: "#ef4444", hex: "rgba(239,68,68,0.28)" },
  { label: "Misc",   color: "#6b7280", hex: "rgba(107,114,128,0.35)" },
  { label: "Custom", color: "#923a57", hex: "rgba(146,58,87,0.28)" },
  { label: "Base Paneling", color: "#667484", hex: "rgba(102,116,132,0.28)" },
];

export const legendLabelForColor = (color) =>
  HIGHLIGHT_COLORS.find(c => c.color === (color || "").toLowerCase())?.label || null;