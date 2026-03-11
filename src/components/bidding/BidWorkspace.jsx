import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Sparkles, Plus, Trash2, Save, Check, RefreshCw, FileText, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BidPricingSettings from "./BidPricingSettings";

const BID_STYLES = [
  { key: "basic_euro",          label: "Basic Euro" },
  { key: "high_end_euro",       label: "High End Euro" },
  { key: "basic_face_frame",    label: "Basic Face Frame" },
  { key: "mid_face_frame",      label: "Mid Face Frame" },
  { key: "high_end_face_frame", label: "High End Face Frame" },
];

const CATEGORY_OPTIONS = [
  { key: "base",  label: "Base" },
  { key: "upper", label: "Upper" },
  { key: "tall",  label: "Tall" },
];

export default function BidWorkspace({ bidId, onClose, onSaved }) {
  const isNew = !bidId;

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [planFileUrl, setPlanFileUrl] = useState(null);
  const [planFileName, setPlanFileName] = useState(null);
  const [bidType, setBidType] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [aiNotes, setAiNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [pricingConfigs, setPricingConfigs] = useState([]);

  const { data: bidData } = useQuery({
    queryKey: ["bid", bidId],
    queryFn: () => base44.entities.Bid.filter({ id: bidId }),
    enabled: !!bidId,
  });

  useEffect(() => {
    loadPricing();
  }, []);

  useEffect(() => {
    if (bidData?.[0]) {
      const b = bidData[0];
      setProjectName(b.project_name || "");
      setClientName(b.client_name || "");
      setAddress(b.address || "");
      setPlanFileUrl(b.plan_file_url || null);
      setPlanFileName(b.plan_file_name || null);
      setBidType(b.bid_type || null);
      setRooms(b.rooms || []);
      setAiNotes(b.ai_notes || "");
      setNotes(b.notes || "");
      setStatus(b.status || "draft");
    }
  }, [bidData]);

  const loadPricing = async () => {
    const configs = await base44.entities.BidPricingConfig.list();
    setPricingConfigs(configs);
  };

  const getPriceForCategory = (category) => {
    if (!bidType) return 0;
    const config = pricingConfigs.find((c) => c.style_key === bidType);
    if (!config) return 0;
    if (category === "base") return config.bases_lf || 0;
    if (category === "upper") return config.uppers_lf || 0;
    if (category === "tall") return config.tall_lf || 0;
    return 0;
  };

  // When bid type changes, update all row prices
  const handleBidTypeChange = (val) => {
    setBidType(val);
    setRooms((prev) =>
      prev.map((r) => {
        const config = pricingConfigs.find((c) => c.style_key === val);
        if (!config) return r;
        let price = 0;
        if (r.cabinet_category === "base") price = config.bases_lf || 0;
        else if (r.cabinet_category === "upper") price = config.uppers_lf || 0;
        else if (r.cabinet_category === "tall") price = config.tall_lf || 0;
        return { ...r, price_per_lf: price };
      })
    );
  };

  const totalLf = rooms.reduce((sum, r) => sum + (parseFloat(r.linear_feet) || 0), 0);
  const total = rooms.reduce((sum, r) => sum + (parseFloat(r.linear_feet) || 0) * (parseFloat(r.price_per_lf) || 0), 0);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPlanFileUrl(file_url);
    setPlanFileName(file.name);
    setIsUploading(false);
  };

  const handleAnalyze = async () => {
    if (!planFileUrl) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);

    const styleLabel = BID_STYLES.find((s) => s.key === bidType)?.label || "standard";
    const config = pricingConfigs.find((c) => c.style_key === bidType);
    const pricingNote = config
      ? `Pricing rates: Base cabinets $${config.bases_lf}/LF, Upper/Wall cabinets $${config.uppers_lf}/LF, Tall cabinets $${config.tall_lf}/LF.`
      : "";

    // Step 1: Extract any text/annotation data from the file (works for PDFs and images)
    let extractedText = "";
    try {
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: planFileUrl,
        json_schema: {
          type: "object",
          properties: {
            room_labels: { type: "array", items: { type: "string" }, description: "All room names found in the plans" },
            dimensions: { type: "array", items: { type: "string" }, description: "Any dimensions or measurements found" },
            notes: { type: "string", description: "Any text annotations or notes found in the plans" }
          }
        }
      });
      if (extracted?.status === "success" && extracted.output) {
        extractedText = `\n\nExtracted text from the plans: ${JSON.stringify(extracted.output)}`;
      }
    } catch (_) { /* continue without extracted text */ }

    // Step 2: Visual AI analysis of the plans
    const result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_pro",
      prompt: `You are a professional cabinet estimator. You are looking at architectural floor plans for a residential home. Your job is to identify EVERY location where cabinetry will be installed and estimate linear footage.

Cabinet style: ${styleLabel}. ${pricingNote}
${extractedText}

INSTRUCTIONS:
1. Look carefully at the entire floor plan for ALL of these cabinet locations: Kitchen (base cabs, wall cabs, island), all Bathrooms (vanities), Pantry, Laundry room, Mudroom, Closets, Built-ins, Home office, Bar, any other cabinet areas.
2. For EACH cabinet run, create a SEPARATE line item entry.
3. Split bases, uppers/wall cabs, and tall cabinets into separate rows.
4. Estimate linear feet by looking at the wall dimensions shown — base cabinet runs typically follow wall lengths.
5. If you can see dimension lines or room sizes, use them to estimate LF accurately.

For cabinet_category use ONLY:
- "base" = floor-level base cabinets and islands
- "upper" = wall-mounted upper/wall cabinets above counters  
- "tall" = full-height pantry towers, tall cabinets, linen closets, full-height built-ins

Be thorough — a typical house has 40–120+ linear feet of cabinetry across all rooms.
If the image is unclear or this does not appear to be a floor plan, still provide your best estimate based on what you can see.`,
      file_urls: [planFileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          rooms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                room_name: { type: "string" },
                cabinet_type: { type: "string" },
                cabinet_category: { type: "string" },
                linear_feet: { type: "number" },
                notes: { type: "string" }
              }
            }
          },
          general_notes: { type: "string" },
          plan_readable: { type: "boolean", description: "Was the AI able to read and interpret the floor plan?" }
        }
      }
    });

    if (!result.rooms || result.rooms.length === 0) {
      setAnalyzeError("AI couldn't identify cabinet areas. Try uploading a clearer image of the floor plan (PNG/JPG works best), or add rows manually below.");
      setIsAnalyzing(false);
      return;
    }

    const newRooms = result.rooms.map((r, i) => {
      const cat = ["base", "upper", "tall"].includes(r.cabinet_category) ? r.cabinet_category : "base";
      const price = getPriceForCategory(cat);
      return {
        id: `r_${Date.now()}_${i}`,
        room_name: r.room_name || "",
        cabinet_type: r.cabinet_type || "",
        cabinet_category: cat,
        linear_feet: r.linear_feet || 0,
        price_per_lf: price,
        notes: r.notes || ""
      };
    });

    setRooms(newRooms);
    setAiNotes(result.general_notes || "");
    setIsAnalyzing(false);
  };

  const addRow = () => {
    setRooms((prev) => [...prev, {
      id: `r_${Date.now()}`,
      room_name: "",
      cabinet_type: "",
      cabinet_category: "base",
      linear_feet: 0,
      price_per_lf: getPriceForCategory("base"),
      notes: ""
    }]);
  };

  const updateRow = (id, field, value) => {
    setRooms((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Auto-update price when category changes
      if (field === "cabinet_category" && bidType) {
        updated.price_per_lf = getPriceForCategory(value);
      }
      return updated;
    }));
  };

  const removeRow = (id) => setRooms((prev) => prev.filter((r) => r.id !== id));

  const handleSave = async () => {
    setIsSaving(true);
    const data = {
      project_name: projectName || "Untitled Bid",
      client_name: clientName,
      address,
      plan_file_url: planFileUrl,
      plan_file_name: planFileName,
      bid_type: bidType,
      rooms,
      total: Math.round(total),
      total_lf: Math.round(totalLf * 10) / 10,
      ai_notes: aiNotes,
      notes,
      status
    };
    if (bidId) {
      await base44.entities.Bid.update(bidId, data);
    } else {
      await base44.entities.Bid.create(data);
    }
    setIsSaving(false);
    setSaved(true);
    onSaved?.();
    setTimeout(() => setSaved(false), 2500);
  };

  const categoryBadgeColor = { base: "bg-amber-100 text-amber-700", upper: "bg-blue-100 text-blue-700", tall: "bg-purple-100 text-purple-700" };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project Name"
          className="text-lg font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent flex-1"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-9">
          {saved ? <><Check className="w-4 h-4 mr-1" />Saved</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save</>}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Project Info */}
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Client Name</label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Project Address" />
          </div>
        </Card>

        {/* Bid Type Selection */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Cabinet Style</h2>
            <Button variant="outline" size="sm" onClick={() => setShowPricingSettings(true)} className="h-9 gap-1.5">
              <Settings2 className="w-4 h-4" /> Edit Pricing
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BID_STYLES.map((s) => {
              const config = pricingConfigs.find((c) => c.style_key === s.key);
              const isSelected = bidType === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => handleBidTypeChange(s.key)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isSelected ? "text-amber-800" : "text-slate-800"}`}>{s.label}</div>
                  {config ? (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>Base: <span className="font-medium text-slate-700">${config.bases_lf}/LF</span></div>
                      <div>Upper: <span className="font-medium text-slate-700">${config.uppers_lf}/LF</span></div>
                      <div>Tall: <span className="font-medium text-slate-700">${config.tall_lf}/LF</span></div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Loading...</div>
                  )}
                </button>
              );
            })}
          </div>
          {!bidType && <p className="text-sm text-amber-600 mt-2 font-medium">Select a cabinet style before analyzing plans.</p>}
        </Card>

        {/* Plan Upload & AI Analysis */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" /> AI Plan Analysis
            </h2>
            {planFileUrl && (
              <button onClick={() => { setPlanFileUrl(null); setPlanFileName(null); }} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
            )}
          </div>

          {!planFileUrl ? (
            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${isUploading ? "border-amber-300 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50"}`}>
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Upload Architect Plans</p>
                <p className="text-sm text-slate-500">PDF or image — AI reads plans and estimates all cabinet areas</p>
              </div>
              {isUploading ? <span className="text-sm text-amber-600 font-medium">Uploading...</span> : <span className="text-xs text-slate-400">PDF, PNG, JPG supported</span>}
              <input type="file" accept=".pdf,image/*" onChange={handleUpload} className="hidden" disabled={isUploading} />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{planFileName}</span>
                <label className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer font-medium">
                  Replace
                  <input type="file" accept=".pdf,image/*" onChange={handleUpload} className="hidden" />
                </label>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !bidType}
                className="w-full bg-amber-600 hover:bg-amber-700 h-11"
              >
                {isAnalyzing
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing plans with AI...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />{rooms.length > 0 ? "Re-Analyze Plans" : "Analyze Plans with AI"}</>
                }
              </Button>
              {!bidType && <p className="text-xs text-amber-600 text-center">Select a cabinet style above first</p>}
              {isAnalyzing && <p className="text-xs text-center text-slate-500">Reading plans and identifying cabinet locations... 30–60 seconds.</p>}
            </div>
          )}

          {aiNotes && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1">AI Notes</p>
              <p className="text-sm text-amber-900">{aiNotes}</p>
            </div>
          )}
        </Card>

        {/* Pricing Table */}
        {rooms.length > 0 && (
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Cabinet Areas &amp; Pricing</h2>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Base</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Upper</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>Tall</span>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="text-left py-2 pr-3 font-semibold w-36">Room</th>
                    <th className="text-left py-2 pr-3 font-semibold">Cabinet Type</th>
                    <th className="text-center py-2 pr-3 font-semibold w-28">Category</th>
                    <th className="text-center py-2 pr-3 font-semibold w-24">Lin. Feet</th>
                    <th className="text-center py-2 pr-3 font-semibold w-24">$/LF</th>
                    <th className="text-right py-2 pr-3 font-semibold w-28">Subtotal</th>
                    <th className="text-left py-2 font-semibold">Notes</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((r) => {
                    const sub = (parseFloat(r.linear_feet) || 0) * (parseFloat(r.price_per_lf) || 0);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3">
                          <Input value={r.room_name} onChange={(e) => updateRow(r.id, "room_name", e.target.value)} className="h-8 text-sm" placeholder="Room" />
                        </td>
                        <td className="py-2 pr-3">
                          <Input value={r.cabinet_type} onChange={(e) => updateRow(r.id, "cabinet_type", e.target.value)} className="h-8 text-sm" placeholder="Type" />
                        </td>
                        <td className="py-2 pr-3">
                          <Select value={r.cabinet_category} onValueChange={(v) => updateRow(r.id, "cabinet_category", v)}>
                            <SelectTrigger className={`h-8 text-xs font-semibold ${categoryBadgeColor[r.cabinet_category]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Input type="number" value={r.linear_feet} onChange={(e) => updateRow(r.id, "linear_feet", e.target.value)} className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-2 pr-3">
                          <Input type="number" value={r.price_per_lf} onChange={(e) => updateRow(r.id, "price_per_lf", e.target.value)} className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-800">
                          ${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2">
                          <Input value={r.notes} onChange={(e) => updateRow(r.id, "notes", e.target.value)} className="h-8 text-sm" placeholder="Notes" />
                        </td>
                        <td className="py-2 pl-2">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)} className="h-8 w-8 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={3} className="py-3 text-sm">TOTAL</td>
                    <td className="py-3 text-center text-sm">{totalLf.toFixed(1)} LF</td>
                    <td></td>
                    <td className="py-3 text-right text-base text-amber-700">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {rooms.map((r) => {
                const sub = (parseFloat(r.linear_feet) || 0) * (parseFloat(r.price_per_lf) || 0);
                return (
                  <div key={r.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <Input value={r.room_name} onChange={(e) => updateRow(r.id, "room_name", e.target.value)} className="h-8 text-sm flex-1 mr-2" placeholder="Room" />
                      <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)} className="h-8 w-8 text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <Input value={r.cabinet_type} onChange={(e) => updateRow(r.id, "cabinet_type", e.target.value)} className="h-8 text-sm" placeholder="Cabinet Type" />
                    <Select value={r.cabinet_category} onValueChange={(v) => updateRow(r.id, "cabinet_category", v)}>
                      <SelectTrigger className={`h-8 text-xs font-semibold ${categoryBadgeColor[r.cabinet_category]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-xs text-slate-500">Lin. Feet</label>
                        <Input type="number" value={r.linear_feet} onChange={(e) => updateRow(r.id, "linear_feet", e.target.value)} className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">$/LF</label>
                        <Input type="number" value={r.price_per_lf} onChange={(e) => updateRow(r.id, "price_per_lf", e.target.value)} className="h-8 text-sm mt-0.5" />
                      </div>
                      <div className="text-right">
                        <label className="text-xs text-slate-500">Subtotal</label>
                        <p className="font-bold text-amber-700 text-sm mt-1">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    <Input value={r.notes} onChange={(e) => updateRow(r.id, "notes", e.target.value)} className="h-8 text-sm" placeholder="Notes" />
                  </div>
                );
              })}
              <div className="border-t border-slate-300 pt-3 flex justify-between font-bold text-slate-900">
                <span>Total: {totalLf.toFixed(1)} LF</span>
                <span className="text-amber-700 text-lg">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <Button onClick={addRow} variant="outline" className="mt-4 w-full h-10 border-dashed text-slate-600">
              <Plus className="w-4 h-4 mr-1" /> Add Row
            </Button>
          </Card>
        )}

        {/* Notes */}
        <Card className="p-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Additional Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." className="min-h-[80px]" />
        </Card>

        <div className="flex justify-between items-center py-2">
          <div className="text-slate-500 text-sm">{rooms.length} areas · {totalLf.toFixed(1)} total LF</div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-11 px-6">
            {saved ? <><Check className="w-4 h-4 mr-1" />Saved!</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save Bid</>}
          </Button>
        </div>
      </div>

      <BidPricingSettings
        open={showPricingSettings}
        onClose={() => setShowPricingSettings(false)}
        onPricingUpdated={loadPricing}
      />
    </div>
  );
}