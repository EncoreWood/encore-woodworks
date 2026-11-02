import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { SHOP_AREAS } from "@/components/shop-areas/shopAreaConfig";

export default function ShopAreas() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
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
            return (
              <Link
                key={area.name}
                to={createPageUrl(area.page)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                  <Icon className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{area.name}</p>
                  <p className="text-xs text-slate-500 leading-snug">{area.blurb}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}