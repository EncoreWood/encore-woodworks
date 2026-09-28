const SELECTION_FIELDS = [
  { key: "cabinet_style", label: "Cabinet Style" },
  { key: "wood_species", label: "Wood Species" },
  { key: "finish", label: "Finish" },
  { key: "door_style", label: "Door Style" },
  { key: "handles", label: "Handles / Hardware" },
  { key: "drawer_glides", label: "Drawer Glides" },
  { key: "hinges", label: "Hinges" },
  { key: "molding", label: "Molding" },
  { key: "cabs_to_height", label: "Cabs Finished to Height" },
  { key: "cabinet_count", label: "Cabinet Count" },
];

/**
 * Read-only summary of a room's selections (the fields managed in the
 * Room Manager "Selections" tab). Used on the room card dialog and as the
 * right-side bar in image viewers. Pass dark=true for dark overlays.
 */
export default function RoomSelectionsPanel({ room = {}, dark = false }) {
  const rows = SELECTION_FIELDS.filter(f => room[f.key] !== undefined && room[f.key] !== null && room[f.key] !== "");
  const customs = room.custom_selections || [];
  const hasAnything = rows.length > 0 || customs.length > 0 || room.notes;

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

      {rows.length > 0 && (
        <div>
          {rows.map(f => (
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