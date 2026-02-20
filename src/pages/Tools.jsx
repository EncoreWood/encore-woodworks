import AngleCalculator from "../components/sop/AngleCalculator";
import CircleCalculator from "../components/sop/CircleCalculator";
import KerfCalculator from "../components/sop/KerfCalculator";
import WoodworkingCalculator from "../components/production/WoodworkingCalculator";

export default function Tools() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tools & Calculators</h1>
          <p className="text-slate-500 mt-1">Woodworking calculators and shop tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          <WoodworkingCalculator />
          <AngleCalculator />
          <CircleCalculator />
          <KerfCalculator />
        </div>
      </div>
    </div>
  );
}