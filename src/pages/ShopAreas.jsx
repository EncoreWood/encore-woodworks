import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { SHOP_AREAS } from "@/components/shop-areas/shopAreaConfig";

// One color family per area so the grid reads at a glance.
const AREA_TINTS = {
  Cut: {
    panel: "from-amber-400 to-orange-500",
    card: "border-amber-200 from-white to-amber-50",
    accent: "text-amber-500 group-hover:text-amber-600",
  },
  "Face Frame": {
    panel: "from-sky-400 to-blue-500",
    card: "border-sky-200 from-white to-sky-50",
    accent: "text-sky-500 group-hover:text-sky-700",
  },
  Spray: {
    panel: "from-violet-400 to-purple-500",
    card: "border-violet-200 from-white to-violet-50",
    accent: "text-violet-500 group-hover:text-violet-700",
  },
  Build: {
    panel: "from-emerald-400 to-teal-500",
    card: "border-emerald-200 from-white to-emerald-50",
    accent: "text-emerald-500 group-hover:text-emerald-700",
  },
  Delivery: {
    panel: "from-cyan-400 to-sky-500",
    card: "border-cyan-200 from-white to-cyan-50",
    accent: "text-cyan-500 group-hover:text-cyan-700",
  },
  Install: {
    panel: "from-rose-400 to-red-500",
    card: "border-rose-200 from-white to-rose-50",
    accent: "text-rose-500 group-hover:text-rose-700",
  },
  Specialty: {
    panel: "from-fuchsia-400 to-pink-500",
    card: "border-fuchsia-200 from-white to-fuchsia-50",
    accent: "text-fuchsia-500 group-hover:text-fuchsia-700",
  },
  General: {
    panel: "from-lime-400 to-green-500",
    card: "border-lime-200 from-white to-lime-50",
    accent: "text-lime-600 group-hover:text-green-700",
  },
  Office: {
    panel: "from-indigo-400 to-slate-500",
    card: "border-indigo-200 from-white to-indigo-50",
    accent: "text-indigo-500 group-hover:text-indigo-700",
  },
};

export default function ShopAreas() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-slate-50 to-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Shop Areas</h1>
            <p className="text-sm text-slate-500 hidden sm:block">
              SOPs, trainings, inventory and schedules for every area of the shop
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SHOP_AREAS.map((area) => {
            const Icon = area.icon;
            const tint = AREA_TINTS[area.name] || AREA_TINTS.Cut;
            return (
              <Link
                key={area.name}
                to={createPageUrl(area.page)}
                className={`group flex items-center gap-3 rounded-xl border bg-gradient-to-br p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${tint.card}`}
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm ${tint.panel}`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{area.name}</p>
                  <p className="text-xs text-slate-500 leading-snug">{area.blurb}</p>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${tint.accent}`} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}