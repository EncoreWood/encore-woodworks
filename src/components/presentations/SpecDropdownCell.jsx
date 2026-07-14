import { useState, useRef, useEffect } from "react";

/**
 * Dropdown cell for the specs table — preset options + custom text input.
 */
export default function SpecDropdownCell({ value, presets, onChange, placeholder = "—" }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [dropdownUp, setDropdownUp] = useState(false);
  const cellRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (cellRef.current && !cellRef.current.contains(e.target) &&
          popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const openDropdown = () => {
    if (!presets) return;
    // Check if there's room below; if not, open above
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setDropdownUp(rect.bottom + 240 > window.innerHeight);
    }
    setCustomText("");
    setOpen(true);
  };

  const selectPreset = (preset) => {
    onChange(preset);
    setOpen(false);
  };

  const saveCustom = (e) => {
    e.preventDefault();
    if (customText.trim()) {
      onChange(customText.trim());
      setOpen(false);
    }
  };

  if (!presets) {
    // Notes column — plain text input
    return (
      <input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent px-1.5 py-1 text-[11px] outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-400 rounded-sm"
      />
    );
  }

  return (
    <div ref={cellRef} className="relative w-full h-full">
      <button
        type="button"
        onClick={openDropdown}
        className={`w-full h-full px-1.5 py-1 text-[11px] text-left outline-none rounded-sm transition-colors ${
          open ? "bg-amber-50 ring-1 ring-amber-400" : "hover:bg-slate-100 focus:bg-amber-50 focus:ring-1 focus:ring-amber-400"
        }`}
      >
        {value ? (
          <span className="text-blue-700 font-medium truncate block">{value}</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`absolute z-50 min-w-full bg-white border border-slate-300 rounded-md shadow-lg ${dropdownUp ? "bottom-full mb-1" : "top-full mt-1"}`}
          style={{ maxWidth: "200px", maxHeight: "240px", overflowY: "auto" }}
        >
          <div className="py-0.5">
            {presets.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => selectPreset(preset)}
                className={`w-full text-left px-2.5 py-1 text-[11px] transition-colors ${
                  value === preset ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 p-1.5">
            <form onSubmit={saveCustom} className="flex items-center gap-1">
              <input
                autoFocus
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="+ Custom..."
                className="flex-1 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none focus:ring-1 focus:ring-amber-400"
                style={{ minWidth: 0 }}
              />
              <button
                type="submit"
                className="text-[11px] text-blue-600 font-medium hover:text-blue-800 px-1"
              >
                ↵
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}