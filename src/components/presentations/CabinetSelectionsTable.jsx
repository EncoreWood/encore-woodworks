import { useState } from "react";

const GOLD = "#b8860b";

const SELECTION_OPTIONS = {
  cabinet_style: ["Basic Euro", "High End Euro", "Tier 1 Face Frame Inset", "Tier 2 Face Frame Inset", "Tier 3 Face Frame Inset", "Face Frame Inset", "Custom"],
  wood_species: ["Painted", "Maple", "Cherry", "White Oak", "Walnut", "Rustic Walnut", "Alder", "MDF", "Paint Grade MDF", "Rustic Walnut/Paint Grade Maple", "TBD", "Custom"],
  door_style: ["Shaker", "Flat Panel", "Raised Panel", "Beadboard", "Glass Insert", "Slab", "Custom"],
  handles: ["No Hardware", "$10 Allowance Per", "$20 Allowance Per", "Client Supplied", "Custom"],
  drawerbox: ["5/8 Baltic Birch", "Dovetail", "Undermount", "Custom"],
  drawer_glides: ["Soft Close", "Standard", "Heavy Duty", "Custom"],
  hinges: ["Soft Close", "Standard", "Blum", "Custom"],
};

const FIELD_LABELS = {
  cabinet_style: "Cabinet Style",
  wood_species: "Wood Species",
  door_style: "Door Style",
  handles: "Handles",
  drawerbox: "Drawerbox",
  drawer_glides: "Drawer Glides",
  hinges: "Hinges",
};

const GRID_FIELDS = [
  ["wood_species", "door_style"],
  ["handles", "drawerbox"],
  ["drawer_glides", "hinges"],
];

function SelectionDropdown({ field, value, options, editable, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const isCustomValue = value && !options.includes(value);

  const handleChange = (e) => {
    const v = e.target.value;
    if (v === "Custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  if (!editable) {
    return <span className="text-[11px] text-slate-800 font-medium">{value || "—"}</span>;
  }

  if (showCustom || isCustomValue) {
    return (
      <div className="flex items-center gap-1">
        <input
          className="text-[11px] text-slate-800 border-b border-amber-400/50 outline-none bg-transparent w-full min-w-0"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Type custom value..."
          autoFocus
        />
        <button
          onClick={() => { setShowCustom(false); onChange(""); }}
          className="text-[9px] text-slate-400 hover:text-amber-600 flex-shrink-0"
        >✕</button>
      </div>
    );
  }

  return (
    <select
      className="text-[11px] text-slate-800 border-none outline-none bg-transparent cursor-pointer w-full"
      value=""
      onChange={handleChange}
    >
      <option value="" disabled>{value || "Select..."}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function CabinetSelectionsTable({ specs, editable, onUpdate }) {
  const borderColor = GOLD;

  const cellClass = "border border-[#b8860b]/40 px-2 py-1 flex items-center justify-between gap-2";
  const labelClass = "text-[9px] font-semibold uppercase tracking-wide text-amber-700 whitespace-nowrap";

  return (
    <div className="mt-5 max-w-lg w-full" style={{ fontFamily: "Georgia, serif" }}>
      {/* Header row */}
      <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-amber-700 mb-1.5 text-center">
        Cabinet Selections
      </div>

      <div className="border border-[#b8860b]/50 rounded overflow-hidden bg-[#fefdfb]">
        {/* Full-width Cabinet Style row */}
        <div className={cellClass} style={{ borderBottomColor: borderColor + "60" }}>
          <span className={labelClass}>Cabinet Style:</span>
          <div className="flex-1 min-w-0">
            <SelectionDropdown
              field="cabinet_style"
              value={specs.cabinet_style}
              options={SELECTION_OPTIONS.cabinet_style}
              editable={editable}
              onChange={v => onUpdate("cabinet_style", v)}
            />
          </div>
        </div>

        {/* 2-column grid for remaining 6 fields */}
        {GRID_FIELDS.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-2"
            style={{ borderTop: rowIdx === 0 ? `1px solid ${borderColor}60` : "none" }}
          >
            {row.map((field, colIdx) => (
              <div
                key={field}
                className={cellClass}
                style={{
                  borderLeft: colIdx === 1 ? `1px solid ${borderColor}60` : "none",
                  borderBottom: rowIdx < GRID_FIELDS.length - 1 ? `1px solid ${borderColor}60` : "none",
                  borderRight: "none",
                  borderTop: "none",
                }}
              >
                <span className={labelClass}>{FIELD_LABELS[field]}:</span>
                <div className="flex-1 min-w-0">
                  <SelectionDropdown
                    field={field}
                    value={specs[field]}
                    options={SELECTION_OPTIONS[field]}
                    editable={editable}
                    onChange={v => onUpdate(field, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}