import { Card } from "@/components/ui/card";

export default function PtsOverviewSection({ dayPts, weekPts, monthPts }) {
  return (
    <Card className="lg:col-span-2 p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">PTS Overview</h3>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Day", value: dayPts },
          { label: "Week", value: weekPts },
          { label: "Month", value: monthPts },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center bg-slate-50 rounded-xl py-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <p className="text-5xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}