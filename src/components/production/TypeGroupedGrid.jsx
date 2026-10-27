/**
 * Groups production card grids by card Type (Cabinet / Cut / Misc / Pick up).
 * Only types with at least one item render a section. Each section shows a
 * small header with the type name and count, followed by the standard card grid.
 */

const TYPE_ORDER = [
  { key: "cabinet", label: "Cabinet" },
  { key: "cut", label: "Cut" },
  { key: "misc", label: "Misc" },
  { key: "pickup", label: "Pick up" },
  { key: "end_panel", label: "End Panel" },
];

export default function TypeGroupedGrid({ items, renderCard, gridClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1 pt-3" }) {
  const groups = TYPE_ORDER
    .map(t => ({ ...t, items: items.filter(i => (i.type || "cabinet") === t.key) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.key}>
          <div className="flex items-center gap-2 px-1 pt-2 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</span>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{g.items.length}</span>
          </div>
          <div className={gridClassName}>
            {g.items.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
}