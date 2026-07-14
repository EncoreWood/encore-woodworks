import { parseSpecs, SPEC_FIELDS, isCoverSlide } from "./slideHelpers";
import SlideCanvas from "./SlideCanvas";
import CoverSlide from "./CoverSlide";
import SpecDropdownCell from "./SpecDropdownCell";

/**
 * Structured slide layout — pure HTML/CSS, no canvas.
 * Top: room name + label. Middle: image layer. Bottom: specs table.
 */
export default function SlideCard({ slide, onUpdate, editable = true }) {
  if (isCoverSlide(slide)) {
    return <CoverSlide slide={slide} onUpdate={onUpdate} editable={editable} />;
  }

  const specs = parseSpecs(slide);

  const roomPricingItems = Array.isArray(specs.room_pricing_items) ? specs.room_pricing_items : [];
  const roomTotal = roomPricingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const hasRoomPricing = roomPricingItems.length > 0 && roomTotal > 0;

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
      <div className="px-6 pt-4 pb-3 border-b-2 border-slate-800 flex-shrink-0 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
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
          {hasRoomPricing && (
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Room Total</p>
              <p className="text-xl font-bold text-amber-700">${roomTotal.toLocaleString()}</p>
            </div>
          )}
        </div>
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
                    <SpecDropdownCell
                      value={specs[f.key] || ""}
                      presets={f.presets}
                      onChange={(val) => updateSpec(f.key, val)}
                    />
                  ) : (
                    <div className="px-1.5 py-1 text-[11px] text-blue-700 font-medium truncate" title={specs[f.key] || ""}>
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