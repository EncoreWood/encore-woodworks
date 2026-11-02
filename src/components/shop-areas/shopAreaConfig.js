import {
  Scissors, Frame, SprayCan, Hammer, Truck, HardHat, Sparkles, BookOpen, Building2,
  ClipboardList, GraduationCap, Package, Wrench, History, Target, Workflow,
} from "lucide-react";

// The nine shop areas shown on the landing page and in the navigation group.
export const SHOP_AREAS = [
  { name: "Cut", page: "ShopAreaCut", icon: Scissors, blurb: "Cut lists, saw set-up and material breakdown" },
  { name: "Face Frame", page: "ShopAreaFaceFrame", icon: Frame, blurb: "Face frames, doors and edge banding" },
  { name: "Spray", page: "ShopAreaSpray", icon: SprayCan, blurb: "Finishing, spray booth and cure times" },
  { name: "Build", page: "ShopAreaBuild", icon: Hammer, blurb: "Assembly, hardware and cabinet build" },
  { name: "Delivery", page: "ShopAreaDelivery", icon: Truck, blurb: "Loading, transport and site delivery" },
  { name: "Install", page: "ShopAreaInstall", icon: HardHat, blurb: "Install crews, site work and punch lists" },
  { name: "Specialty", page: "ShopAreaSpecialty", icon: Sparkles, blurb: "Custom pieces, curves and one-off work" },
  { name: "General", page: "ShopAreaGeneral", icon: BookOpen, blurb: "Shop-wide standards and shared procedures" },
  { name: "Office", page: "ShopAreaOffice", icon: Building2, blurb: "Admin, scheduling and office supplies" },
];

export const SHOP_AREA_NAMES = SHOP_AREAS.map((a) => a.name);

// Each section gets its own color so the tile grid reads at a glance.
export const SECTION_TINTS = {
  sop: "bg-indigo-50 text-indigo-600 border-indigo-200",
  training: "bg-blue-50 text-blue-600 border-blue-200",
  flow: "bg-sky-50 text-sky-600 border-sky-200",
  lean: "bg-emerald-50 text-emerald-600 border-emerald-200",
  inventory: "bg-amber-50 text-amber-600 border-amber-200",
  cleaning: "bg-teal-50 text-teal-600 border-teal-200",
  maintenance: "bg-orange-50 text-orange-600 border-orange-200",
  history: "bg-violet-50 text-violet-600 border-violet-200",
};

// The sections on every area page. `fields` decides what the form shows;
// statuses drives the status dropdown (omit for sections without one).
export const SECTIONS = [
  {
    key: "sop",
    label: "SOPs",
    icon: ClipboardList,
    fields: ["description", "owner", "status", "date"],
    statuses: ["Draft", "Active", "Archived"],
  },
  {
    key: "training",
    label: "Trainings",
    icon: GraduationCap,
    fields: ["description", "owner", "status", "date"],
    statuses: ["Not Started", "In Progress", "Complete"],
  },
  {
    key: "flow",
    label: "Shop Flow",
    icon: Workflow,
  },
  {
    key: "lean",
    label: "Lean",
    icon: Target,
    fields: ["description", "owner", "status", "estimated_time_saved", "project_cost", "images"],
    statuses: ["Idea", "Planned", "In Progress", "Complete"],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
    fields: ["quantity", "unit", "owner", "status", "description"],
    statuses: ["In Stock", "Low", "Out of Stock"],
  },
  {
    key: "cleaning",
    label: "Cleaning Checklist",
    icon: Sparkles,
    fields: ["frequency", "owner", "status", "date", "checklist", "images", "description"],
    statuses: ["Pending", "Done"],
  },
  {
    key: "maintenance",
    label: "Maintenance Schedule",
    icon: Wrench,
    fields: ["frequency", "owner", "status", "date", "description"],
    statuses: ["Scheduled", "Due", "Complete"],
  },
  {
    key: "history",
    label: "Production History",
    icon: History,
    fields: ["description", "owner", "date"],
    statuses: [],
  },
];