import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { SHOP_AREAS, SECTIONS } from "@/components/shop-areas/shopAreaConfig";
import AreaSection from "@/components/shop-areas/AreaSection";
import SopSection from "@/components/shop-areas/SopSection";
import InventorySection from "@/components/shop-areas/InventorySection";

export default function ShopAreaDetail({ area }) {
  const config = SHOP_AREAS.find((a) => a.name === area) || SHOP_AREAS[0];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/ShopAreas"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-amber-700 mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All shop areas
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{config.name}</h1>
            <p className="text-sm text-slate-500">{config.blurb}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {SECTIONS.map((section) => {
            if (section.key === "sop") {
              return <SopSection key={section.key} area={config.name} section={section} />;
            }
            if (section.key === "inventory") {
              return <InventorySection key={section.key} area={config.name} section={section} />;
            }
            return <AreaSection key={section.key} area={config.name} section={section} />;
          })}
        </div>
      </div>
    </div>
  );
}