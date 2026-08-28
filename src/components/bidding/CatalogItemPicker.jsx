import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Package } from "lucide-react";
import { getCategoryStyle } from "./BidCatalogEditor";

// Searchable dropdown of live Item Catalog items, grouped + filterable by
// category. Used by the Annotate Plan highlight tool to link a drawn highlight
// to a specific catalog item (storing catalog_item_id on the highlight).
// `value` is the currently selected catalog item id; `onChange(id, item)` fires
// on selection (pass null to clear).
export default function CatalogItemPicker({ catalogItems = [], categories = [], value, onChange, placeholder = "Link catalog item…", compact = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = useMemo(() => (catalogItems || []).find(c => c.id === value) || null, [catalogItems, value]);
  const activeCat = active ? (categories || []).find(c => c.key === active.cabinet_category) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalogItems || [])
      .filter(c => c.is_active !== false)
      .filter(c => catFilter === "all" || c.cabinet_category === catFilter)
      .filter(c => !q || (c.name || "").toLowerCase().includes(q));
  }, [catalogItems, query, catFilter]);

  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach(c => { const k = c.cabinet_category || "misc"; (m[k] = m[k] || []).push(c); });
    return m;
  }, [filtered]);

  const select = (item) => { onChange(item?.id || null, item || null); setOpen(false); setQuery(""); };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 ${compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm"} rounded-md border border-slate-300 bg-white hover:border-amber-400 transition-colors max-w-[220px]`}
        title={active ? active.name : placeholder}
      >
        <Package className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="truncate flex-1 text-left">
          {active ? active.name : <span className="text-slate-400">{placeholder}</span>}
        </span>
        {active && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); select(null); }}
            className="text-slate-400 hover:text-red-500 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col max-h-80">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search items…"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="flex gap-1 flex-wrap mt-2">
              <button onClick={() => setCatFilter("all")} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catFilter === "all" ? "bg-slate-700 text-white border-transparent" : "bg-slate-100 text-slate-600 border-slate-200"}`}>All</button>
              {(categories || []).map(c => {
                const s = getCategoryStyle(c.color);
                const on = catFilter === c.key;
                return (
                  <button key={c.key} onClick={() => setCatFilter(c.key)} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${on ? `${s.active} border-transparent` : `${s.bg} ${s.text} border-slate-200`}`}>{c.label}</button>
                );
              })}
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No items.</p>}
            {Object.entries(grouped).map(([cat, items]) => {
              const catObj = (categories || []).find(c => c.key === cat);
              const s = getCategoryStyle(catObj?.color || "slate");
              return (
                <div key={cat}>
                  <div className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.text}`}>{catObj?.label || cat}</div>
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}