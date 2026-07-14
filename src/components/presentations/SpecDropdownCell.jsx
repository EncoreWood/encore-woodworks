import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Dropdown cell for the specs table — preset options + custom text input.
 * Popover is rendered via portal to escape overflow-hidden containers.
 */
export default function SpecDropdownCell({ value, presets, onChange, placeholder = "—" }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [popoverStyle, setPopoverStyle] = useState(null);
  const cellRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (cellRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleClose = () => setOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [open]);

  const openDropdown = () => {
    if (!presets || !cellRef.current) return;
    const rect = cellRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 250 && rect.top > 250;
    const top = openUp ? rect.top - 250 : rect.bottom + 4;
    setPopoverStyle({
      position: "fixed",
      top: Math.max(4, Math.min(top, window.innerHeight - 250)),
      left: rect.left,
      width: Math.max(rect.width, 140),
      maxHeight: 240,
      overflowY: "auto",
    });
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

      {open && popoverStyle && createPortal(
        <div
          ref={popoverRef}
          className="z-[9999] bg-white border border-slate-300 rounded-md shadow-lg"
          style={popoverStyle}
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
          <div className="border-t border-slate-200 p-1.5 sticky bottom-0 bg-white">
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
        </div>,
        document.body
      )}
    </div>
  );
}