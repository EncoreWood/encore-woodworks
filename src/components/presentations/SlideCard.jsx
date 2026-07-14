import { parseSpecs, SPEC_FIELDS, isCoverSlide } from "./slideHelpers";
import SlideCanvas from "./SlideCanvas";
import CoverSlide from "./CoverSlide";

/**
 * Structured slide layout — pure HTML/CSS, no canvas.
 * Top: room name + label. Middle: image layer. Bottom: specs table.
 */
export default function SlideCard({ slide, onUpdate, editable = true }) {
  if (isCoverSlide(slide)) {
    return <CoverSlide slide={slide} onUpdate={onUpdate} editable={editable} />;
  }

  const specs = parseSpecs(slide);

  const updateSpec = (key, value) => {
    const newSpecs = { ...specs, [key]: value };
    onUpdate({ specs: JSON.stringify(newSpecs) });
  };

  return (
    <div
      className="bg-white shadow-xl flex flex-col rounded-lg overflow-hidden"
      style={{ aspectRatio: "11 / 8.5", width: "100%" }}
    >
      {/* ── Top: room name + label ── */}
      <div className="px-6 pt-4 pb-3 border-b-2 border-slate-800 flex-shrink-0">
        {editable ? (
          <input
            className="text-2xl font-bold text-slate-900 w-full border-none outline-none bg-transparent placeholder-slate-300"
            value={slide.room_name || ""}
            onChange={e => onUpdate({ room_name: e.target.value })}
            placeholder="Room Name"
          />
        ) : (
          <h2 className="text-2xl font-bold text-slate-900">{slide.room_name}</h2>
        )}
        {editable ? (
          <input
            className="text-sm text-slate-500 w-full border-none outline-none bg-transparent placeholder-slate-300 mt-0.5"
            value={slide.slide_label || ""}
            onChange={e => onUpdate({ slide_label: e.target.value })}
            placeholder="Slide label (optional)"
          />
        ) : (
          slide.slide_label ? <p className="text-sm text-slate-500 mt-0.5">{slide.slide_label}</p> : null
        )}
      </div>

      {/* ── Middle: Fabric.js annotation canvas ── */}
      <div className="flex-1 min-h-0 p-2">
        <SlideCanvas slide={slide} onUpdate={onUpdate} editable={editable} />
      </div>

      {/* ── Bottom: specs table ── */}
      <div className="px-6 pb-4 pt-2 flex-shrink-0">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "37%" }} />
          </colgroup>
          <tbody>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td
                  key={f.key}
                  className="border border-slate-300 px-1.5 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {f.label}
                </td>
              ))}
            </tr>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td key={f.key} className="border border-slate-300 p-0">
                  {editable ? (
                    <input
                      value={specs[f.key] || ""}
                      onChange={e => updateSpec(f.key, e.target.value)}
                      placeholder="—"
                      className="w-full border-none bg-transparent px-1.5 py-1 text-[11px] outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    />
                  ) : (
                    <div className="px-1.5 py-1 text-[11px] text-slate-700 truncate" title={specs[f.key] || ""}>
                      {specs[f.key] || "—"}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}