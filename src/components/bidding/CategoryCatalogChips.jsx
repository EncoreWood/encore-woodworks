import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { getCategoryStyle } from "./BidCatalogEditor";

// Per-category catalog item chips for the Annotate Plan toolbar. One chip per
// catalog category; clicking a chip opens THAT category's items directly — no
// combined-picker-then-filter step. `value` is the selected catalog item id;
// `onChange(id, item)` fires on selection (null clears back to generic).
export default function CategoryCatalogChips({ catalogItems = [], categories = [], value, onChange }) {
  const [openCat, setOpenCat] = useState(null); // category key whose dropdown is open
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpenCat(null); setQuery(""); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const activeItem = useMemo(() => (catalogItems || []).find(c => c.id === value) || null, [catalogItems, value]);

  const itemsFor = (key) => {
    const q = query.trim().toLowerCase();
    return (catalogItems || [])
      .filter(c => c.is_active !== false && c.cabinet_category === key)
      .filter(c => !q || (c.name || "").toLowerCase().includes(q));
  };

  const select = (item) => { onChange(item ? item.id : null, item || null); setOpenCat(null); setQuery(""); };

  return (
    <div className="flex items-center gap-1 flex-wrap" ref={wrapRef}>
      {(categories || []).map(cat => {
        const s = getCategoryStyle(cat.color);
        const open = openCat === cat.key;
        const selHere = activeItem && activeItem.cabinet_category === cat.key;
        const items = open ? itemsFor(cat.key) : [];
        return (
          <div key={cat.key} className="relative">
            <button
              type="button"
              onClick={() => { setOpenCat(open ? null : cat.key); setQuery(""); }}
              title={selHere ? `${activeItem.name} (click to change)` : `${cat.label} items`}
              className={`h-7 px-2 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1 ${selHere || open ? `${s.active} border-transparent` : `${s.bg} ${s.text} border-slate-200 hover:border-amber-400`}`}
            >
              <span className="max-w-[110px] truncate">{selHere ? activeItem.name : cat.label}</span>
              {selHere && (
                <span
                  role="button"
                  title="Clear (draw generic)"
                  onClick={(e) => { e.stopPropagation(); select(null); }}
                  className="text-slate-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
            {open && (
              <div className="absolute z-50 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col max-h-72">
                <div className="p-1.5 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={`Search ${cat.label}…`}
                      className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 py-1">
                  {items.length === 0 && <p className="text-center text-xs text-slate-400 py-3">No items.</p>}
                  {items.map(it => (
                    <button
                      key={it.id}
                      onClick={() => select(it)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-amber-50 flex items-center gap-2 ${value === it.id ? "bg-amber-50" : ""}`}
                    >
                      <span className="flex-1 truncate">{it.name}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {it.measure_type === "lf" ? "LF" : it.measure_type === "sqft" ? "SqFt" : it.measure_type === "percentage" ? "%" : "Qty"}
                        {it.pricing_mode === "tier_based" && <span className="ml-1 text-blue-500">⚡tier</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}