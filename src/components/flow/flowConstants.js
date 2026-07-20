export const CANVAS_INCHES = 594;

export const ZONE_COLORS = {
  blue:   { zone: "bg-blue-200 border-blue-500 text-blue-900",       fill: "#60a5fa" },
  amber:  { zone: "bg-amber-200 border-amber-500 text-amber-900",     fill: "#fbbf24" },
  purple: { zone: "bg-purple-200 border-purple-500 text-purple-900",  fill: "#c084fc" },
  orange: { zone: "bg-orange-200 border-orange-500 text-orange-900", fill: "#fb923c" },
  teal:   { zone: "bg-teal-200 border-teal-500 text-teal-900",       fill: "#2dd4bf" },
  green:  { zone: "bg-green-200 border-green-500 text-green-900",    fill: "#4ade80" },
  gray:   { zone: "bg-gray-200 border-gray-500 text-gray-900",       fill: "#d1d5db" },
  red:    { zone: "bg-red-200 border-red-500 text-red-900",          fill: "#f87171" },
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

export const DEFAULT_ZONES = [
  { name: "Lumber Storage", zone_type: "storage",     color: "amber",  icon: "📦", flow_order: 1,    flow_direction: "down",  x: 20,  y: 20,  width: 130, height: 80, flow_tags: ["Standard Cabinet Flow"] },
  { name: "CNC",            zone_type: "machine",     color: "blue",   icon: "🔧", flow_order: 3,    flow_direction: "right", x: 20,  y: 130, width: 110, height: 70, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Cut",            zone_type: "machine",     color: "blue",   icon: "🪚", flow_order: 2,    flow_direction: "down",  x: 20,  y: 230, width: 110, height: 70, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Face Frame",     zone_type: "workstation", color: "purple", icon: "🔨", flow_order: 4,    flow_direction: "right", x: 180, y: 20,  width: 120, height: 70, flow_tags: ["Standard Cabinet Flow"] },
  { name: "Custom",         zone_type: "workstation", color: "purple", icon: "⭐", flow_order: 5,    flow_direction: "right", x: 340, y: 20,  width: 100, height: 70, flow_tags: ["Custom Work Flow"] },
  { name: "Build",          zone_type: "assembly",    color: "orange", icon: "🔨", flow_order: 6,    flow_direction: "down",  x: 470, y: 20,  width: 100, height: 80, flow_tags: ["Standard Cabinet Flow", "Custom Work Flow"] },
  { name: "Spray",          zone_type: "finish",       color: "teal",   icon: "🎨", flow_order: 7,    flow_direction: "down",  x: 470, y: 180, width: 100, height: 70, flow_tags: ["Standard Cabinet Flow", "Spray Only"] },
  { name: "Staging",        zone_type: "staging",     color: "green",  icon: "📋", flow_order: 8,    flow_direction: "none",  x: 470, y: 300, width: 100, height: 70, flow_tags: ["Standard Cabinet Flow", "Spray Only"] },
  { name: "Office",         zone_type: "office",      color: "gray",   icon: "🖥️", flow_order: null, flow_direction: "none",  x: 120, y: 450, width: 90,  height: 55, flow_tags: [] },
  { name: "Design Room",    zone_type: "office",      color: "gray",   icon: "🖥️", flow_order: null, flow_direction: "none",  x: 230, y: 450, width: 100, height: 55, flow_tags: [] },
  { name: "Bathroom 1",     zone_type: "utility",     color: "gray",   icon: "🚿", flow_order: null, flow_direction: "none",  x: 350, y: 450, width: 70,  height: 50, flow_tags: [] },
  { name: "Bathroom 2",     zone_type: "utility",     color: "gray",   icon: "🚿", flow_order: null, flow_direction: "none",  x: 440, y: 450, width: 70,  height: 50, flow_tags: [] },
];