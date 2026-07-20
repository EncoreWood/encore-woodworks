import { X, Upload } from "lucide-react";
import { parseCoverSpecs } from "./slideHelpers";
import PricingSummary from "./PricingSummary";
import CabinetSelectionsTable from "./CabinetSelectionsTable";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png";

export default function CoverSlide({ slide, onUpdate, editable = true }) {
  const specs = parseCoverSpecs(slide);
  if (!specs) return null;

  const update = (key, value) => {
    const newSpecs = { ...specs, [key]: value };
    const patch = { specs: JSON.stringify(newSpecs) };
    if (key === "project_name") patch.room_name = value;
    onUpdate(patch);
  };

  const updatePricingItem = (idx, field, value) => {
    const items = [...specs.pricing_items];
    items[idx] = { ...items[idx], [field]: value };
    update("pricing_items", items);
  };
  const addPricingItem = () => update("pricing_items", [...specs.pricing_items, { label: "", amount: 0 }]);
  const removePricingItem = (idx) => update("pricing_items", specs.pricing_items.filter((_, i) => i !== idx));

  const uploadCoverImage = async (file) => {
    if (!file) return;
    const { base44 } = await import("@/api/base44Client");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("cover_image", file_url);
  };

  const showPricing = specs.show_pricing || editable;

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden relative" style={{ aspectRatio: "11 / 8.5", width: "100%" }}>
      {specs.cover_image && (
        <div className="absolute inset-0 z-0">
          <img src={specs.cover_image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/85" />
        </div>
      )}

      <div className="relative z-10 h-full overflow-y-auto flex flex-col items-center px-10 py-8 text-center">
        <img src={LOGO_URL} alt="Encore Woodworks" className="h-14 mb-0.5" />
        <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase mb-5">Custom Cabinetry</p>
        <div className="w-16 h-0.5 bg-amber-600 mb-5" />

        {editable ? (
          <input
            className="text-2xl font-bold text-slate-900 text-center border-none outline-none bg-transparent placeholder-slate-300"
            style={{ fontFamily: "Georgia, serif" }}
            value={specs.project_name}
            onChange={e => update("project_name", e.target.value)}
            placeholder="Project Name"
          />
        ) : (
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia, serif" }}>{specs.project_name}</h1>
        )}

        <div className="text-sm text-slate-600 mt-1">
          for{" "}
          {editable ? (
            <input
              className="inline-block text-sm text-slate-600 text-center border-none outline-none bg-transparent placeholder-slate-300"
              style={{ width: `${Math.max(80, (specs.client_name?.length || 0) * 8 + 20)}px` }}
              value={specs.client_name}
              onChange={e => update("client_name", e.target.value)}
              placeholder="Client Name"
            />
          ) : specs.client_name}
        </div>

        {editable ? (
          <input
            className="text-xs text-slate-500 text-center border-none outline-none bg-transparent placeholder-slate-300 mt-2"
            value={specs.address}
            onChange={e => update("address", e.target.value)}
            placeholder="Project Address"
          />
        ) : (
          specs.address && <p className="text-xs text-slate-500 mt-2">{specs.address}</p>
        )}

        <div className="flex gap-6 mt-3 text-[11px] text-slate-400">
          <span>
            Prepared:{" "}
            {editable ? (
              <input
                className="inline-block w-28 text-center border-none outline-none bg-transparent placeholder-slate-300"
                value={specs.prepared_date}
                onChange={e => update("prepared_date", e.target.value)}
                placeholder="Date"
              />
            ) : specs.prepared_date}
          </span>
          <span>
            Proposal #:{" "}
            {editable ? (
              <input
                className="inline-block w-20 text-center border-none outline-none bg-transparent placeholder-slate-300"
                value={specs.proposal_number}
                onChange={e => update("proposal_number", e.target.value)}
                placeholder="PRP-001"
              />
            ) : specs.proposal_number}
          </span>
        </div>

        {/* Cabinet Selections Table */}
        <CabinetSelectionsTable specs={specs} editable={editable} onUpdate={update} />

        {/* Pricing Summary */}
        {showPricing && (
          <PricingSummary
            specs={specs}
            editable={editable}
            onUpdatePricingItem={updatePricingItem}
            onAddPricingItem={addPricingItem}
            onRemovePricingItem={removePricingItem}
            onShowPricingChange={v => update("show_pricing", v)}
          />
        )}

        {/* Cover image upload */}
        {editable && (
          <div className="mt-5 flex items-center gap-3">
            <label className="text-[10px] text-slate-500 cursor-pointer flex items-center gap-1 hover:text-amber-600">
              <Upload className="w-3 h-3" />
              {specs.cover_image ? "Change cover image" : "Add cover image"}
              <input type="file" accept="image/*" className="hidden" onChange={e => { uploadCoverImage(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {specs.cover_image && (
              <button onClick={() => update("cover_image", "")} className="text-[10px] text-red-500 hover:text-red-600">Remove</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}