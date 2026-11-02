import {
  Scissors, Frame, SprayCan, Hammer, Truck, HardHat, Sparkles, BookOpen, Building2,
  FileText, GraduationCap, Package, ClipboardCheck, Wrench, History, Target,
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

// The six sections on every area page. `fields` decides what the form shows;
// statuses drives the status dropdown (omit for sections without one).
export const SECTIONS = [
  {
    key: "sop",
    label: "SOPs",
    icon: FileText,
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
    key: "lean",
    label: "Lean",
    icon: Target,
    fields: ["description", "owner", "status", "date"],
    statuses: ["Idea", "Testing", "Standard Work", "Complete"],
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
    icon: ClipboardCheck,
    fields: ["frequency", "owner", "status", "date", "description"],
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