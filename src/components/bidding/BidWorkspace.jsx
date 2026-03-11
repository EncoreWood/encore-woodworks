import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Sparkles, Plus, Trash2, Save, Check, RefreshCw, FileText, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BidWorkspace({ bidId, onClose, onSaved }) {
  const isNew = !bidId;

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [planFileUrl, setPlanFileUrl] = useState(null);
  const [planFileName, setPlanFileName] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [defaultPriceLf, setDefaultPriceLf] = useState(650);
  const [aiNotes, setAiNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const { data: bidData } = useQuery({
    queryKey: ["bid", bidId],
    queryFn: () => base44.entities.Bid.filter({ id: bidId }),
    enabled: !!bidId,
  });

  useEffect(() => {
    if (bidData?.[0]) {
      const b = bidData[0];
      setProjectName(b.project_name || "");
      setClientName(b.client_name || "");
      setAddress(b.address || "");
      setPlanFileUrl(b.plan_file_url || null);
      setPlanFileName(b.plan_file_name || null);
      setRooms(b.rooms || []);
      setDefaultPriceLf(b.price_per_lf || 650);
      setAiNotes(b.ai_notes || "");
      setNotes(b.notes || "");
      setStatus(b.status || "draft");
    }
  }, [bidData]);

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
    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `You are a professional cabinet estimator reviewing architectural floor plans. Carefully analyze these plans and identify EVERY area where cabinetry will be installed: kitchens, bathrooms, pantries, laundry rooms, mudrooms, closets, built-ins, bars, offices — anywhere cabinets go.

For each area provide:
- room_name: e.g. "Kitchen", "Master Bath", "Pantry", "Mudroom"
- cabinet_type: e.g. "Base + Wall Cabinets", "Island", "Vanity", "Tall Pantry Cabinets", "Built-in Closet", "Linen Closet"
- linear_feet: Estimated linear feet. Measure the wall run length where cabinets sit. For islands, estimate perimeter footprint. Be realistic and detailed.
- notes: Any important notes — corner cabinets, tricky layouts, special features, multiple rows of wall cabinets, etc.

Also provide general_notes about overall project complexity and any observations a cabinet shop estimator would want to know.`,
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
                linear_feet: { type: "number" },
                notes: { type: "string" }
              }
            }
          },
          general_notes: { type: "string" }
        }
      }
    });

    const newRooms = (result.rooms || []).map((r, i) => ({
      id: `r_${Date.now()}_${i}`,
      room_name: r.room_name || "",
      cabinet_type: r.cabinet_type || "",
      linear_feet: r.linear_feet || 0,
      price_per_lf: defaultPriceLf,
      notes: r.notes || ""
    }));

    setRooms(newRooms);
    setAiNotes(result.general_notes || "");
    setIsAnalyzing(false);
  };

  const addRow = () => {
    setRooms(prev => [...prev, {
      id: `r_${Date.now()}`,
      room_name: "",
      cabinet_type: "Base + Wall Cabinets",
      linear_feet: 0,
      price_per_lf: defaultPriceLf,
      notes: ""
    }]);
  };

  const updateRow = (id, field, value) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id) => setRooms(prev => prev.filter(r => r.id !== id));

  const applyDefaultPrice = () => {
    setRooms(prev => prev.map(r => ({ ...r, price_per_lf: defaultPriceLf })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const data = {
      project_name: projectName || "Untitled Bid",
      client_name: clientName,
      address,
      plan_file_url: planFileUrl,
      plan_file_name: planFileName,
      rooms,
      price_per_lf: defaultPriceLf,
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

        {/* Plan Upload & AI Analysis */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" /> AI Plan Analysis
            </h2>
            {planFileUrl && (
              <button onClick={() => { setPlanFileUrl(null); setPlanFileName(null); }} className="text-xs text-slate-400 hover:text-red-500">Remove file</button>
            )}
          </div>

          {!planFileUrl ? (
            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${isUploading ? "border-amber-300 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50"}`}>
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Upload Architect Plans</p>
                <p className="text-sm text-slate-500">PDF or image — AI will read the plans and estimate cabinet areas</p>
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
                disabled={isAnalyzing}
                className="w-full bg-amber-600 hover:bg-amber-700 h-11"
              >
                {isAnalyzing ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing plans with AI...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />{rooms.length > 0 ? "Re-Analyze Plans" : "Analyze Plans with AI"}</>
                )}
              </Button>

              {isAnalyzing && (
                <p className="text-xs text-center text-slate-500">Reading architectural plans and identifying cabinet locations... this may take 30–60 seconds.</p>
              )}
              {analyzeError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {analyzeError}
                </div>
              )}
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
        {(rooms.length > 0 || !isNew) && (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-slate-900">Cabinet Areas &amp; Pricing</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Default $/LF:</span>
                <Input
                  type="number"
                  value={defaultPriceLf}
                  onChange={(e) => setDefaultPriceLf(parseFloat(e.target.value) || 0)}
                  className="w-24 h-9 text-sm"
                />
                <Button variant="outline" size="sm" onClick={applyDefaultPrice} className="h-9 text-xs">
                  Apply All
                </Button>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="text-left py-2 pr-3 font-semibold w-40">Room / Area</th>
                    <th className="text-left py-2 pr-3 font-semibold w-44">Cabinet Type</th>
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
                          <Input value={r.room_name} onChange={(e) => updateRow(r.id, "room_name", e.target.value)}
                            className="h-8 text-sm" placeholder="Room" />
                        </td>
                        <td className="py-2 pr-3">
                          <Input value={r.cabinet_type} onChange={(e) => updateRow(r.id, "cabinet_type", e.target.value)}
                            className="h-8 text-sm" placeholder="Type" />
                        </td>
                        <td className="py-2 pr-3">
                          <Input type="number" value={r.linear_feet} onChange={(e) => updateRow(r.id, "linear_feet", e.target.value)}
                            className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-2 pr-3">
                          <Input type="number" value={r.price_per_lf} onChange={(e) => updateRow(r.id, "price_per_lf", e.target.value)}
                            className="h-8 text-sm text-center" />
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-slate-800">
                          ${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2">
                          <Input value={r.notes} onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                            className="h-8 text-sm" placeholder="Notes" />
                        </td>
                        <td className="py-2 pl-2">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}
                            className="h-8 w-8 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={2} className="py-3 text-sm">TOTAL</td>
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
                    <div className="flex justify-between items-start">
                      <Input value={r.room_name} onChange={(e) => updateRow(r.id, "room_name", e.target.value)}
                        className="h-8 text-sm font-semibold flex-1 mr-2" placeholder="Room" />
                      <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}
                        className="h-8 w-8 text-red-400 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Input value={r.cabinet_type} onChange={(e) => updateRow(r.id, "cabinet_type", e.target.value)}
                      className="h-8 text-sm" placeholder="Cabinet Type" />
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-xs text-slate-500">Lin. Feet</label>
                        <Input type="number" value={r.linear_feet} onChange={(e) => updateRow(r.id, "linear_feet", e.target.value)}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">$/LF</label>
                        <Input type="number" value={r.price_per_lf} onChange={(e) => updateRow(r.id, "price_per_lf", e.target.value)}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div className="text-right">
                        <label className="text-xs text-slate-500">Subtotal</label>
                        <p className="font-bold text-amber-700 text-sm mt-1">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    <Input value={r.notes} onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                      className="h-8 text-sm" placeholder="Notes" />
                  </div>
                );
              })}
              <div className="border-t border-slate-300 pt-3 flex justify-between items-center font-bold text-slate-900">
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
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this bid..." className="min-h-[80px]" />
        </Card>

        {/* Bottom Save */}
        <div className="flex justify-between items-center py-2">
          <div className="text-slate-500 text-sm">{rooms.length} areas · {totalLf.toFixed(1)} total LF</div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-11 px-6">
            {saved ? <><Check className="w-4 h-4 mr-1" />Saved!</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save Bid</>}
          </Button>
        </div>
      </div>
    </div>
  );
}