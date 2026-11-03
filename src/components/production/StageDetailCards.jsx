// Day / Week / Month points per production stage. Lived on the Shop Production
// header until it moved into the Pacing tab to free up a full row.
export default function StageDetailCards({ stages, labels, stats }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stages.map(stage => {
        const s = stats[stage] || { day: 0, week: 0, month: 0 };
        return (
          <div
            key={stage}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
          >
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{labels[stage]}</p>
            <div className="flex flex-shrink-0 gap-2">
              {[{ label: "D", val: s.day }, { label: "W", val: s.week }, { label: "M", val: s.month }].map(({ label, val }) => (
                <div
                  key={label}
                  className="text-center leading-none"
                  title={label === "D" ? "Day" : label === "W" ? "Week" : "Month"}
                >
                  <p className="text-[9px] text-slate-400">{label}</p>
                  <p className="mt-0.5 text-xs font-bold text-green-700">
                    {val}<span className="text-[9px] font-medium opacity-60">p</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}