export const CANVAS_INCHES = 594;
export const SHOP_BASE = 900; // base pixel size of the shop boundary at zoom=1

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ZONE_COLORS = {
  blue:   { zone: "bg-blue-200 border-blue-500 text-blue-900",       hex: "#3b82f6" },
  amber:  { zone: "bg-amber-200 border-amber-500 text-amber-900",    hex: "#f59e0b" },
  purple: { zone: "bg-purple-200 border-purple-500 text-purple-900", hex: "#a855f7" },
  orange: { zone: "bg-orange-200 border-orange-500 text-orange-900", hex: "#f97316" },
  teal:   { zone: "bg-teal-200 border-teal-500 text-teal-900",      hex: "#14b8a6" },
  green:  { zone: "bg-green-200 border-green-500 text-green-900",   hex: "#22c55e" },
  gray:   { zone: "bg-gray-200 border-gray-500 text-gray-900",       hex: "#6b7280" },
  red:    { zone: "bg-red-200 border-red-500 text-red-900",          hex: "#ef4444" },
};

export const FLOW_COLORS = {
  blue: "#3b82f6", amber: "#f59e0b", purple: "#a855f7", orange: "#f97316",
  teal: "#14b8a6", green: "#22c55e", gray: "#6b7280", red: "#ef4444",
};

export const ZONE_TYPES = ["storage", "machine", "workstation", "assembly", "finish", "staging", "office", "utility", "custom"];

export const ZONE_ICONS = ["📦", "🔧", "🪚", "🔨", "🎨", "📋", "🖥️", "🚿", "⭐"];

export const FLOW_DIRECTIONS = ["right", "left", "up", "down", "none"];

export const ARROW_COLORS = ["#475569", "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6"];

export const STROKE_WIDTHS = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 4 },
  { label: "Thick", value: 6 },
];

export const ARROWHEAD_STYLES = ["filled", "outline", "none"];

export const DEFAULT_FLOWS = [
  { name: "Standard Cabinet Flow", color: "blue" },
  { name: "Custom Work Flow", color: "purple" },
  { name: "Spray Only", color: "teal" },
];

// All positions/sizes are PERCENTAGES (0-100) of the shop boundary
export const DEFAULT_ZONES = [
  { name: "Lumber Storage", zone_type: "storage",     color: "amber",  icon: "📦", flow_order: 1,    flow_direction: "down",  x: 2,  y: 2,  width: 12, height: 18, flow_tags: ["Standard Cabinet Flow"] },
  { name: "CNC",            zone_type: "machine",     color: "blue",   icon: "🔧", flow_order: 3,    flow_direction: "right", x: 2,  y: 22, width: 12, height: 18, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Cut",            zone_type: "machine",     color: "blue",   icon: "🪚", flow_order: 2,    flow_direction: "down",  x: 2,  y: 52, width: 18, height: 20, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Face Frame",     zone_type: "workstation", color: "purple", icon: "🔨", flow_order: 4,    flow_direction: "right", x: 18, y: 2,  width: 28, height: 18, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Custom",         zone_type: "workstation", color: "purple", icon: "⭐", flow_order: 5,    flow_direction: "right", x: 50, y: 2,  width: 24, height: 18, flow_tags: ["Custom Work Flow"] },
  { name: "Build",          zone_type: "assembly",    color: "orange", icon: "🔨", flow_order: 6,    flow_direction: "down",  x: 72, y: 2,  width: 26, height: 35, flow_tags: ["Standard Cabinet Flow", "Custom Work Flow"] },
  { name: "Spray",          zone_type: "finish",       color: "teal",   icon: "🎨", flow_order: 7,    flow_direction: "down",  x: 72, y: 55, width: 26, height: 28, flow_tags: ["Standard Cabinet Flow", "Spray Only"] },
  { name: "Staging",        zone_type: "staging",     color: "green",  icon: "📋", flow_order: 8,    flow_direction: "none",  x: 45, y: 55, width: 25, height: 18, flow_tags: ["Standard Cabinet Flow", "Spray Only"] },
  { name: "Office",         zone_type: "office",      color: "gray",   icon: "🖥️", flow_order: null, flow_direction: "none",  x: 28, y: 72, width: 14, height: 14, flow_tags: [] },
  { name: "Design Room",    zone_type: "office",      color: "gray",   icon: "🖥️", flow_order: null, flow_direction: "none",  x: 44, y: 72, width: 14, height: 14, flow_tags: [] },
  { name: "Bathroom 1",     zone_type: "utility",     color: "gray",   icon: "🚿", flow_order: null, flow_direction: "none",  x: 28, y: 55, width: 10, height: 12, flow_tags: [] },
  { name: "Bathroom 2",     zone_type: "utility",     color: "gray",   icon: "🚿", flow_order: null, flow_direction: "none",  x: 40, y: 55, width: 10, height: 12, flow_tags: [] },
];