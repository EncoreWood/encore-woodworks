export default function StagePills({ stages, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {stages.map(stage => {
        const active = stage.id === value;
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onChange(stage.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active ? `${stage.activeBg} ${stage.activeText} ${stage.border}` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {stage.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/70" : "bg-slate-100"}`}>
              {stage.points}
            </span>
          </button>
        );
      })}
    </div>
  );
}