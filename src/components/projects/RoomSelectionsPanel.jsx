const MULTI_FIELDS = [
  { key: "wood_species_selections", legacy: "wood_species", label: "Wood Species" },
  { key: "finish_selections", legacy: "finish", label: "Finish" },
];

const SINGLE_FIELDS = [
  { key: "door_style", label: "Door Style" },
  { key: "molding", label: "Molding" },
  { key: "handles", label: "Handles / Hardware" },
  { key: "cabinet_style", label: "Cabinet Style" },
  { key: "drawer_glides", label: "Drawer Glides" },
  { key: "hinges", label: "Hinges" },
  { key: "cabs_to_height", label: "Cabs Finished to Height" },
  { key: "cabinet_count", label: "Cabinet Count" },
];

/**
 * Read-only summary of a room's selections (the fields managed in the
 * Room Manager "Selections" tab). Used on the room card dialog and as the
 * right-side bar in image viewers. Pass dark=true for dark overlays.
 *
 * Wood species and finish are paired: each entry is a species with the
 * finish that goes with it, plus a note for the area/cabinets it applies
 * to. Rooms saved before pairing fall back to the legacy separate lists
 * or single values.
 */
export default function RoomSelectionsPanel({ room = {}, dark = false }) {
  const customs = room.custom_selections || [];
  const combined = Array.isArray(room.species_finish_selections) ? room.species_finish_selections : [];
  const singles = SINGLE_FIELDS.filter(f => room[f.key] !== undefined && room[f.key] !== null && room[f.key] !== "");
  // Legacy separate species/finish lists — only shown when no paired entries exist
  const multis = combined.length === 0 ? MULTI_FIELDS.filter(f => {
    const entries = Array.isArray(room[f.key]) ? room[f.key] : [];
    return entries.length > 0 || (room[f.legacy] !== undefined && room[f.legacy] !== null && room[f.legacy] !== "");
  }) : [];
  const hasAnything = combined.length > 0 || singles.length > 0 || multis.length > 0 || customs.length > 0 || room.notes;

  const labelCls = dark ? "text-white/50" : "text-slate-500";
  const valueCls = dark ? "text-white font-semibold" : "text-slate-800 font-semibold";
  const rowCls = dark
    ? "flex items-start justify-between gap-3 py-1.5 border-b border-white/10 last:border-b-0"
    : "flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0";

  return (
    <div className="space-y-3">
      {!hasAnything && (
        <p className={dark ? "text-white/50 text-sm" : "text-slate-400 text-sm"}>
          No selections set for this room yet.
        </p>
      )}

      {combined.length > 0 && (
        <div>
          <p className={`text-xs font-semibold mb-1 ${labelCls}`}>Species & Finish</p>
          {combined.map((e, i) => (
            <div key={i} className={rowCls}>
              <span className={`text-xs ${labelCls} flex-shrink-0`}>{e.note ? "→ " + e.note : ""}</span>
              <span className={`text-xs text-right ${valueCls}`}>
                {[e.wood_species, e.finish].filter(Boolean).join(" — ") || "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {multis.map(f => {
        const entries = Array.isArray(room[f.key]) ? room[f.key] : [];
        const hasEntries = entries.length > 0;
        return (
          <div key={f.key}>
            <p className={`text-xs font-semibold mb-1 ${labelCls}`}>{f.label}</p>
            {hasEntries ? (
              entries.map((e, i) => (
                <div key={i} className={rowCls}>
                  <span className={`text-xs ${labelCls} flex-shrink-0`}>{e.note ? "→ " + e.note : ""}</span>
                  <span className={`text-xs text-right ${valueCls}`}>{e.value || "—"}</span>
                </div>
              ))
            ) : (
              <div className={rowCls}>
                <span className={`text-xs ${labelCls}`}></span>
                <span className={`text-xs text-right ${valueCls}`}>{String(room[f.legacy])}</span>
              </div>
            )}
          </div>
        );
      })}

      {singles.length > 0 && (
        <div className={(multis.length > 0 || combined.length > 0) ? (dark ? "pt-2 border-t border-white/10" : "pt-2 border-t border-slate-100") : ""}>
          {singles.map(f => (
            <div key={f.key} className={rowCls}>
              <span className={`text-xs flex-shrink-0 ${labelCls}`}>{f.label}</span>
              <span className={`text-xs text-right ${valueCls}`}>{String(room[f.key])}</span>
            </div>
          ))}
        </div>
      )}

      {customs.length > 0 && (
        <div className={dark ? "pt-2 border-t border-white/10" : "pt-2 border-t border-slate-100"}>
          {customs.map((cs, i) => (
            <div key={i} className={rowCls}>
              <span className={`text-xs flex-shrink-0 ${labelCls}`}>{cs.label}</span>
              <span className={`text-xs text-right ${valueCls}`}>{cs.value || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {room.notes && (
        <div className={dark ? "pt-2 border-t border-white/10" : "pt-2 border-t border-slate-100"}>
          <p className={`text-xs mb-1 ${labelCls}`}>Room Notes</p>
          <p className={`text-xs whitespace-pre-wrap ${dark ? "text-white/80" : "text-slate-700"}`}>{room.notes}</p>
        </div>
      )}
    </div>
  );
}