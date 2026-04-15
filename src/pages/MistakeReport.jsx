import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Camera, X, CheckCircle2, Loader2, AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOTAL_STEPS = 7;

const STATUS_COLORS = {
  Submitted: "bg-blue-100 text-blue-700",
  "In Review": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
};

function ProgressBar({ step }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
      <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TileGrid({ options, onSelect, cols = 2 }) {
  const gridClass = cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid ${gridClass} gap-4 mt-6`}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="min-h-[100px] flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-xl font-bold shadow-sm hover:border-amber-400 hover:bg-amber-50 active:scale-95 transition-all touch-manipulation"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Data Tab ────────────────────────────────────────────────────────────────
function DataTab() {
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: reports = [], refetch } = useQuery({
    queryKey: ["mistake_reports"],
    queryFn: () => base44.entities.MistakeReport.list("-created_date", 200),
  });

  const filtered = reports.filter(r =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const handleStatusChange = async (id, status) => {
    await base44.entities.MistakeReport.update(id, { status });
    refetch();
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
              {["Date", "Submitted By", "Mistake Of", "Type", "Origin", "Pick Up", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">No reports yet.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-slate-100 hover:bg-amber-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">{r.created_date ? format(new Date(r.created_date), "MM/dd/yy") : "—"}</td>
                <td className="px-4 py-3 font-medium">{r.submitted_by}</td>
                <td className="px-4 py-3">{r.mistake_of}</td>
                <td className="px-4 py-3">{r.mistake_type}</td>
                <td className="px-4 py-3">{r.stem_of_mistake}</td>
                <td className="px-4 py-3">{r.pickup_required || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Mistake Report Detail</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Status:</span>
                  <Select value={selected.status || "Submitted"} onValueChange={val => handleStatusChange(selected.id, val)}>
                    <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {[
                    ["Submitted By", selected.submitted_by],
                    ["Project", selected.project_name || "—"],
                    ["Date", selected.created_date ? format(new Date(selected.created_date), "MM/dd/yyyy h:mm a") : "—"],
                    ["Mistake Of", selected.mistake_of],
                    ["Mistake Type", selected.mistake_type],
                    ["Origin / Stem", selected.stem_of_mistake],
                    ["Followed SOP", selected.followed_sop],
                    ["SOP Task Created", selected.sop_task_created ? "Yes" : "No"],
                    ["Pick Up Required", selected.pickup_required || "—"],
                    ...(selected.pickup_required === "Yes" ? [
                      ["Row / Col", `${selected.pickup_row || "—"} / ${selected.pickup_col || "—"}`],
                      ["Size", selected.pickup_size || "—"],
                      ["Species", selected.pickup_species || "—"],
                      ["Finish", selected.pickup_finish || "—"],
                      ["Notes", selected.pickup_notes || "—"],
                    ] : []),
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-start gap-2 px-4 py-2.5">
                      <span className="text-xs font-semibold text-slate-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
                {selected.photos?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`photo ${i+1}`} className="rounded-lg aspect-square object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Wizard Tab ───────────────────────────────────────────────────────────────
function WizardTab() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    mistake_of: null, mistake_type: null, stem_of_mistake: null,
    followed_sop: null, sop_task_created: false, pickup_required: null,
    pickup_row: "", pickup_col: "", pickup_size: "", pickup_species: "",
    pickup_finish: "", pickup_notes: "", photos: [], submitted_by: "", project_name: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const photoInputRef = useRef(null);

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const goBack = () => {
    if (step === 6 && data.pickup_required !== "Yes") { setStep(5); return; }
    if (step === 7 && data.pickup_required !== "Yes") { setStep(5); return; }
    setStep(s => s - 1);
  };

  const handleMistakeOf = (val) => { set("mistake_of", val); setStep(2); };
  const handleMistakeType = (val) => { set("mistake_type", val); setStep(3); };
  const handleStem = (val) => { set("stem_of_mistake", val); setStep(4); };
  const handleSOP = (val) => {
    const sopTask = val === "No" || val === "Don't Have One";
    setData(prev => ({ ...prev, followed_sop: val, sop_task_created: sopTask }));
    setStep(5);
  };
  const handlePickup = (val) => {
    set("pickup_required", val);
    if (val === "Fixed Mistake") setStep(7);
    else setStep(6);
  };
  const handlePickupNext = () => setStep(7);
  const handlePhotoSkip = () => setStep(8);
  const handlePhotoNext = () => setStep(8);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const toUpload = files.slice(0, 3 - data.photos.length);
    setUploadingPhoto(true);
    for (const file of toUpload) {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) setData(prev => ({ ...prev, photos: [...prev.photos, result.file_url] }));
    }
    setUploadingPhoto(false);
  };

  const removePhoto = (idx) => setData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!data.submitted_by.trim()) return;
    setSubmitting(true);
    await base44.entities.MistakeReport.create({
      submitted_by: data.submitted_by,
      project_name: data.project_name || undefined,
      mistake_of: data.mistake_of, mistake_type: data.mistake_type,
      stem_of_mistake: data.stem_of_mistake, followed_sop: data.followed_sop,
      sop_task_created: data.sop_task_created, pickup_required: data.pickup_required,
      pickup_row: data.pickup_row || undefined, pickup_col: data.pickup_col || undefined,
      pickup_size: data.pickup_size || undefined, pickup_species: data.pickup_species || undefined,
      pickup_finish: data.pickup_finish || undefined, pickup_notes: data.pickup_notes || undefined,
      photos: data.photos, status: "Submitted",
    });
    if (data.sop_task_created) {
      await base44.entities.GroupLeanItem.create({
        title: `Create SOP: ${data.stem_of_mistake}`, category: "Training",
        priority: "high", status: "open", assigned_to: "",
      });
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  const reset = () => {
    setData({ mistake_of: null, mistake_type: null, stem_of_mistake: null, followed_sop: null, sop_task_created: false, pickup_required: null, pickup_row: "", pickup_col: "", pickup_size: "", pickup_species: "", pickup_finish: "", pickup_notes: "", photos: [], submitted_by: "", project_name: "" });
    setStep(1);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="w-24 h-24 text-green-500 mb-6" />
        <h1 className="text-4xl font-bold text-green-800 mb-3">Report Submitted ✓</h1>
        <p className="text-xl text-green-700 mb-10">Thank you. The report has been recorded.</p>
        {data.sop_task_created && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-xl px-6 py-4 mb-8 max-w-md">
            <p className="text-yellow-800 font-semibold">📋 A SOP task was created for <span className="font-bold">{data.stem_of_mistake}</span>.</p>
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/ShopProduction")} className="bg-slate-600 hover:bg-slate-700 text-white text-xl px-10 py-6 rounded-2xl h-auto">
            Back to Production Board
          </Button>
          <Button onClick={reset} className="bg-amber-600 hover:bg-amber-700 text-white text-xl px-10 py-6 rounded-2xl h-auto">
            Submit Another Report
          </Button>
        </div>
      </div>
    );
  }

  const stepNum = Math.min(step, TOTAL_STEPS);

  return (
    <div className="flex flex-col">
      {/* Progress header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={goBack} className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 touch-manipulation">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="flex-1">
              <ProgressBar step={stepNum} />
              <p className="text-xs text-slate-500 mt-1">Step {stepNum} of {TOTAL_STEPS}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 max-w-2xl mx-auto w-full">
        {step === 1 && <div><h1 className="text-3xl font-bold text-slate-900 mt-4">What was the mistake made on?</h1><TileGrid options={["Door", "Frame", "Cab Parts", "Drawer Box"]} onSelect={handleMistakeOf} /></div>}
        {step === 2 && <div><h1 className="text-3xl font-bold text-slate-900 mt-4">What type of mistake?</h1><TileGrid options={["Wrong Size", "Wrong Species", "Wrong Finish", "Damaged"]} onSelect={handleMistakeType} /></div>}
        {step === 3 && <div><h1 className="text-3xl font-bold text-slate-900 mt-4">Where did the mistake originate?</h1><TileGrid options={["Office", "Face Frame", "Spray", "Build", "Cut", "Install"]} onSelect={handleStem} cols={3} /></div>}
        {step === 4 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Did you follow the SOP for this process?</h1>
            {(data.followed_sop === "No" || data.followed_sop === "Don't Have One") && (
              <div className="mt-4 bg-yellow-100 border border-yellow-400 rounded-xl px-4 py-3">
                <p className="text-yellow-800 font-semibold">⚠️ A SOP task will be created for this process.</p>
              </div>
            )}
            <TileGrid options={["Yes", "No", "Other Area", "Don't Have One"]} onSelect={handleSOP} />
          </div>
        )}
        {step === 5 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Does this require a pick up order?</h1>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <button onClick={() => handlePickup("Yes")} className="min-h-[90px] flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-xl font-bold shadow-sm hover:border-amber-400 hover:bg-amber-50 active:scale-95 transition-all touch-manipulation">Yes — need a replacement part</button>
              <button onClick={() => handlePickup("Fixed Mistake")} className="min-h-[90px] flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-xl font-bold shadow-sm hover:border-green-400 hover:bg-green-50 active:scale-95 transition-all touch-manipulation">Fixed Mistake — already resolved</button>
            </div>
          </div>
        )}
        {step === 6 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Enter pick up details</h1>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">R# (Row)</label><Input value={data.pickup_row} onChange={e => set("pickup_row", e.target.value)} placeholder="e.g. R3" className="h-14 text-lg" /></div>
                <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">C# (Column)</label><Input value={data.pickup_col} onChange={e => set("pickup_col", e.target.value)} placeholder="e.g. C7" className="h-14 text-lg" /></div>
              </div>
              <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">Size</label><Input value={data.pickup_size} onChange={e => set("pickup_size", e.target.value)} placeholder="e.g. 18x30" className="h-14 text-lg" /></div>
              <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">Species</label><Input value={data.pickup_species} onChange={e => set("pickup_species", e.target.value)} placeholder="e.g. Maple" className="h-14 text-lg" /></div>
              <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">Finish</label><Input value={data.pickup_finish} onChange={e => set("pickup_finish", e.target.value)} placeholder="e.g. White Paint" className="h-14 text-lg" /></div>
              <div><label className="text-sm font-semibold text-slate-600 mb-1.5 block">Notes (optional)</label><Textarea value={data.pickup_notes} onChange={e => set("pickup_notes", e.target.value)} placeholder="Any additional details..." className="min-h-[80px] text-base" /></div>
              <Button onClick={handlePickupNext} className="w-full h-16 text-xl bg-amber-600 hover:bg-amber-700 rounded-2xl mt-2">Next →</Button>
            </div>
          </div>
        )}
        {step === 7 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Add a photo of the mistake</h1>
            <p className="text-slate-500 mt-2 text-base">Optional but helpful for review</p>
            {data.photos.length < 3 && (
              <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="mt-6 w-full min-h-[160px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 hover:border-amber-400 hover:bg-amber-50 transition-all touch-manipulation">
                {uploadingPhoto ? (<><Loader2 className="w-10 h-10 animate-spin mb-2" /><span className="text-base">Uploading...</span></>) : (<><Camera className="w-12 h-12 mb-2" /><span className="text-lg font-semibold">Tap to add photo</span><span className="text-sm mt-1">{3 - data.photos.length} remaining</span></>)}
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*,image/heic" multiple capture="environment" className="hidden" onChange={handlePhotoUpload} />
            {data.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {data.photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={handlePhotoSkip} className="flex-1 h-16 text-xl rounded-2xl text-slate-600">Skip</Button>
              {data.photos.length > 0 && <Button onClick={handlePhotoNext} className="flex-1 h-16 text-xl bg-amber-600 hover:bg-amber-700 rounded-2xl">Next →</Button>}
            </div>
          </div>
        )}
        {step === 8 && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Review & Submit</h1>
            {data.sop_task_created && (
              <div className="mt-4 bg-yellow-100 border border-yellow-400 rounded-xl px-4 py-3">
                <p className="text-yellow-800 font-semibold">⚠️ A SOP task will be created for <span className="font-bold">{data.stem_of_mistake}</span>.</p>
              </div>
            )}
            <div className="mt-5 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {[
                ["Mistake Of", data.mistake_of], ["Mistake Type", data.mistake_type],
                ["Origin / Stem", data.stem_of_mistake], ["Followed SOP", data.followed_sop],
                ["Pick Up Required", data.pickup_required],
                data.pickup_required === "Yes" && ["Pick Up: Row / Col", `${data.pickup_row || "—"} / ${data.pickup_col || "—"}`],
                data.pickup_required === "Yes" && ["Pick Up: Size", data.pickup_size || "—"],
                data.pickup_required === "Yes" && ["Pick Up: Species", data.pickup_species || "—"],
                data.pickup_required === "Yes" && ["Pick Up: Finish", data.pickup_finish || "—"],
                data.photos.length > 0 && ["Photos", `${data.photos.length} uploaded`],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-semibold text-slate-500">{label}</span>
                  <span className="text-base font-bold text-slate-800">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Your Name <span className="text-red-500">*</span></label>
                <Input value={data.submitted_by} onChange={e => set("submitted_by", e.target.value)} placeholder="Full name" className="h-14 text-lg" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Project Name (optional)</label>
                <Input value={data.project_name} onChange={e => set("project_name", e.target.value)} placeholder="e.g. Smith Kitchen" className="h-14 text-lg" />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !data.submitted_by.trim()} className="w-full h-20 text-2xl font-bold bg-amber-600 hover:bg-amber-700 rounded-2xl mt-6">
              {submitting ? <><Loader2 className="w-6 h-6 animate-spin mr-2" /> Submitting...</> : "Submit Report"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MistakeReport() {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Page Header with tabs */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto">
          {/* Tag / title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold text-base shadow-sm border border-red-200">
              <AlertTriangle className="w-5 h-5" />
              Mistake Report
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("board")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${activeTab === "board" ? "border-amber-500 text-amber-700 bg-amber-50" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <AlertTriangle className="w-4 h-4" />
              Production Board
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${activeTab === "data" ? "border-amber-500 text-amber-700 bg-amber-50" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <ClipboardList className="w-4 h-4" />
              Data
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "board" && <WizardTab />}
        {activeTab === "data" && <DataTab />}
      </div>
    </div>
  );
}