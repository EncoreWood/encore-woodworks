import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Sparkles, Plus, Save, Check, RefreshCw, FileText, Settings2, AlertCircle, BookOpen, Send, Link2, Kanban, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BidPricingSettings from "./BidPricingSettings";
import BidCatalogEditor from "./BidCatalogEditor";
import BidRoomSection from "./BidRoomSection";
import BidClientView from "./BidClientView";
import BidPlanViewer from "./BidPlanViewer";

const BID_STYLES = [
  { key: "basic_euro",          label: "Tier 1 Euro" },
  { key: "high_end_euro",       label: "Tier 3 Euro" },
  { key: "basic_face_frame",    label: "Tier 1 Face Frame" },
  { key: "mid_face_frame",      label: "Tier 2 Face Frame" },
  { key: "high_end_face_frame", label: "Tier 3 Face Frame" },
];

// project prop: optional pre-linked project object (when opened from ProjectDetails)
export default function BidWorkspace({ bidId, project: linkedProject, onClose, onSaved }) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState(linkedProject?.id || null);
  const [planFileUrl, setPlanFileUrl] = useState(null);
  const [planFileName, setPlanFileName] = useState(null);
  const [bidType, setBidType] = useState(null);
  const [specs, setSpecs] = useState({ wood_species: "", door_style: "", handles: "", drawerbox: "", drawer_glides: "", hinges: "" });
  const [rooms, setRooms] = useState([]);
  const [aiNotes, setAiNotes] = useState("");
  const [planAnnotations, setPlanAnnotations] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [showCatalogEditor, setShowCatalogEditor] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [showPlanViewer, setShowPlanViewer] = useState(false);
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showLinkProjectDialog, setShowLinkProjectDialog] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [allProjects, setAllProjects] = useState([]);

  const { data: bidData } = useQuery({
    queryKey: ["bid", bidId],
    queryFn: () => base44.entities.Bid.filter({ id: bidId }),
    enabled: !!bidId,
  });

  useEffect(() => {
    loadPricing();
    loadCatalog();
    loadCategories();
  }, []);

  // Pre-fill from linked project when creating a new bid from a project card
  useEffect(() => {
    if (!bidId && linkedProject) {
      setProjectName(linkedProject.project_name || "");
      setClientName(linkedProject.client_name || linkedProject.home_owner?.name || linkedProject.contractor?.name || "");
      setAddress(linkedProject.address || "");
      setLinkedProjectId(linkedProject.id);
    }
  }, [linkedProject, bidId]);

  useEffect(() => {
    if (bidData?.[0]) {
      const b = bidData[0];
      setProjectName(b.project_name || "");
      setClientName(b.client_name || "");
      setAddress(b.address || "");
      setLinkedProjectId(b.project_id || null);
      setPlanFileUrl(b.plan_file_url || null);
      setPlanFileName(b.plan_file_name || null);
      setBidType(b.bid_type || null);
      setRooms(b.rooms || []);
      setSpecs({ wood_species: b.wood_species || "", door_style: b.door_style || "", handles: b.handles || "", drawerbox: b.drawerbox || "", drawer_glides: b.drawer_glides || "", hinges: b.hinges || "" });
      setAiNotes(b.ai_notes || "");
      setNotes(b.notes || "");
      setStatus(b.status || "draft");
      setPlanAnnotations(b.plan_annotations || []);
    }
  }, [bidData]);

  const loadPricing = async () => {
    const configs = await base44.entities.BidPricingConfig.list();
    setPricingConfigs(configs);
  };

  const loadCatalog = async () => {
    const items = await base44.entities.BidItemCatalog.list("sort_order");
    setCatalogItems(items);
  };

  const loadCategories = async () => {
    const cats = await base44.entities.BidCategory.list("sort_order");
    if (cats.length > 0) {
      setCategories(cats);
    } else {
      // Seed defaults if none exist yet
      const { DEFAULT_CATEGORIES } = await import("./BidCatalogEditor");
      const created = await Promise.all(DEFAULT_CATEGORIES.map(c => base44.entities.BidCategory.create(c)));
      setCategories(created);
    }
  };

  const getPriceForCategory = (category) => {
    if (!bidType) return 0;
    const config = pricingConfigs.find(c => c.style_key === bidType);
    if (!config) return 0;
    if (category === "base") return config.bases_lf || 0;
    if (category === "upper") return config.uppers_lf || 0;
    if (category === "tall") return config.tall_lf || 0;
    return 0;
  };

  const handleBidTypeChange = (val) => {
    setBidType(val);
    // Auto-fill specs from pricing config
    const cfg = pricingConfigs.find(c => c.style_key === val);
    if (cfg) {
      setSpecs({ wood_species: cfg.wood_species || "", door_style: cfg.door_style || "", handles: cfg.handles || "", drawerbox: cfg.drawerbox || "", drawer_glides: cfg.drawer_glides || "", hinges: cfg.hinges || "" });
    }
    // Update all LF-based items prices when style changes
    setRooms(prev => prev.map(room => ({
      ...room,
      items: (room.items || []).map(item => {
        if (item.measure_type !== "lf" || item.cabinet_category === "misc") return item;
        const cfg = pricingConfigs.find(c => c.style_key === val);
        if (!cfg) return item;
        let price = 0;
        if (item.cabinet_category === "base") price = cfg.bases_lf || 0;
        else if (item.cabinet_category === "upper") price = cfg.uppers_lf || 0;
        else if (item.cabinet_category === "tall") price = cfg.tall_lf || 0;
        return { ...item, unit_price: price };
      })
    })));
  };

  const grandTotal = rooms.reduce((s, room) =>
    s + (room.items || []).reduce((rs, item) => rs + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0), 0
  );
  const totalLf = rooms.reduce((s, room) =>
    s + (room.items || []).filter(i => i.measure_type === "lf").reduce((rs, i) => rs + (parseFloat(i.quantity) || 0), 0), 0
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzeError(null);
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

    const styleLabel = pricingConfigs.find(c => c.style_key === bidType)?.style_label || BID_STYLES.find(s => s.key === bidType)?.label || "standard";
    const config = pricingConfigs.find(c => c.style_key === bidType);
    const pricingNote = config
      ? `Pricing: Base $${config.bases_lf}/LF, Upper/Wall $${config.uppers_lf}/LF, Tall $${config.tall_lf}/LF.`
      : "";

    let extractedText = "";
    try {
      // Only attempt text extraction for smaller files (under 8MB)
      const headRes = await fetch(planFileUrl, { method: "HEAD" }).catch(() => null);
      const contentLength = headRes ? parseInt(headRes.headers.get("content-length") || "0") : 0;
      if (!contentLength || contentLength < 8 * 1024 * 1024) {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: planFileUrl,
          json_schema: {
            type: "object",
            properties: {
              room_labels: { type: "array", items: { type: "string" } },
              dimensions: { type: "array", items: { type: "string" } },
              notes: { type: "string" }
            }
          }
        });
        if (extracted?.status === "success" && extracted.output) {
          extractedText = `\n\nExtracted plan text: ${JSON.stringify(extracted.output)}`;
        }
      }
    } catch (_) {}

    const roomNotes = rooms
       .filter(r => r.pdf_notes)
       .map(r => `${r.room_name || "Room"}: ${r.pdf_notes}`)
       .join("\n");
     const roomNotesSection = roomNotes ? `\n\nAdditional notes from room annotations:\n${roomNotes}` : "";
     const mainPlanNotesSection = aiNotes ? `\n\nMain plan annotations and notes:\n${aiNotes}` : "";

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_1_pro",
      prompt: `You are a professional cabinet estimator analyzing architectural floor plans for a ${styleLabel} cabinet project. ${pricingNote}
${extractedText}${mainPlanNotesSection}${roomNotesSection}

CRITICAL: First, locate and read the SCALE RATIO on the plans (e.g., "1/4" = 1", "1/8" = 1", etc.). Use this scale to accurately convert measured distances to actual linear feet. If no scale is visible, assume 1/4" = 1" standard architectural scale.

Identify EVERY cabinet location (Kitchen, Bathrooms, Pantry, Laundry, Mudroom, Closets, Built-ins, Bars, Offices, etc.).

Group by room. For each room provide a list of items. Split Base Cabinets, Wall/Upper Cabinets, and Tall Cabinets into separate items per room. Measure linear feet from wall dimensions using the scale ratio.

For measure_type: use "lf" for cabinet runs (base, upper, tall), use "qty" for individual pieces (islands, towers, appliance panels).
For cabinet_category: "base" = floor cabinets/islands, "upper" = wall-mounted upper cabs, "tall" = full-height pantries/towers, "misc" = accessories.

A typical home has 40–120+ LF of cabinetry. Be thorough and accurate with scale conversions.`,
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
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      cabinet_category: { type: "string" },
                      measure_type: { type: "string" },
                      quantity: { type: "number" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          general_notes: { type: "string" }
        }
      }
    });
    } catch (err) {
      setAnalyzeError(`Analysis failed: ${err?.message || "Unknown error"}`);
      setIsAnalyzing(false);
      return;
    }

    if (!result.rooms || result.rooms.length === 0) {
      setAnalyzeError("AI couldn't identify cabinet areas. Try a clearer image (PNG/JPG works best), or add rooms manually.");
      setIsAnalyzing(false);
      return;
    }

    const newRooms = result.rooms.map((room, ri) => ({
      id: `room_${Date.now()}_${ri}`,
      room_name: room.room_name || `Room ${ri + 1}`,
      items: (room.items || []).map((item, ii) => {
        const cat = ["base", "upper", "tall", "misc"].includes(item.cabinet_category) ? item.cabinet_category : "base";
        const mt = item.measure_type === "qty" ? "qty" : "lf";
        let price = 0;
        if (mt === "lf" && cat !== "misc") {
          price = getPriceForCategory(cat);
        }
        return {
          id: `item_${Date.now()}_${ri}_${ii}`,
          name: item.name || "",
          cabinet_category: cat,
          measure_type: mt,
          quantity: item.quantity || 0,
          unit_price: price,
          notes: item.notes || ""
        };
      })
    }));

    setRooms(newRooms);
    setAiNotes(result.general_notes || "");
    setIsAnalyzing(false);
  };

  const handleCreateProjectCard = async () => {
    setIsCreatingProject(true);
    const name = projectName || "Untitled Bid";
    const newProject = await base44.entities.Project.create({
      project_name: name,
      client_name: clientName,
      address,
      project_type: "kitchen",
      status: "inquiry",
      estimated_budget: grandTotal > 0 ? Math.round(grandTotal) : undefined,
    });
    // Link bid to the new project
    const bidData = {
      project_name: name,
      client_name: clientName,
      address,
      project_id: newProject.id,
      plan_file_url: planFileUrl,
      plan_file_name: planFileName,
      bid_type: bidType,
      ...specs,
      rooms,
      total: Math.round(grandTotal),
      total_lf: Math.round(totalLf * 10) / 10,
      ai_notes: aiNotes,
      notes,
      status,
      plan_annotations: planAnnotations
    };
    if (bidId) {
      await base44.entities.Bid.update(bidId, bidData);
    } else {
      await base44.entities.Bid.create(bidData);
    }
    setLinkedProjectId(newProject.id);
    setIsCreatingProject(false);
    onSaved?.();
    // Navigate to the project board
    window.location.href = createPageUrl("Kanban");
  };

  const addRoom = () => {
    setRooms(prev => [...prev, { id: `room_${Date.now()}`, room_name: "", items: [] }]);
  };

  const openLinkDialog = async () => {
    const projs = await base44.entities.Project.list("-created_date", 200);
    setAllProjects(projs.filter(p => !p.archived));
    setProjectSearch("");
    setShowLinkProjectDialog(true);
  };

  const handleLinkProject = async (project) => {
    setLinkedProjectId(project.id);
    setShowLinkProjectDialog(false);
    // Also save the link immediately if bid already exists
    if (bidId) {
      await base44.entities.Bid.update(bidId, { project_id: project.id });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const name = projectName || "Untitled Bid";

    const data = {
      project_name: name,
      client_name: clientName,
      address,
      project_id: linkedProjectId || null,
      plan_file_url: planFileUrl,
      plan_file_name: planFileName,
      bid_type: bidType,
      ...specs,
      rooms,
      total: Math.round(grandTotal),
      total_lf: Math.round(totalLf * 10) / 10,
      ai_notes: aiNotes,
      notes,
      status,
      plan_annotations: planAnnotations
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
          onChange={e => setProjectName(e.target.value)}
          placeholder="Project Name"
          className="text-lg font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent flex-1"
        />
        {linkedProjectId ? (
          <div className="hidden sm:flex items-center gap-1">
            <a href={createPageUrl("ProjectDetails") + "?id=" + linkedProjectId} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors">
              <Link2 className="w-3.5 h-3.5" /> View Project
            </a>
            <button onClick={() => setLinkedProjectId(null)} className="text-slate-400 hover:text-red-500 p-1" title="Unlink project"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={openLinkDialog}
            className="hidden sm:flex h-9 gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <Link2 className="w-4 h-4" />
            Link Project
          </Button>
        )}
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
        {rooms.length > 0 && (
          <Button onClick={() => setShowClientView(true)} variant="outline" className="h-9 gap-1.5 hidden sm:flex">
            <Send className="w-4 h-4" /> Client View
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-9">
          {saved ? <><Check className="w-4 h-4 mr-1" />Saved</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save</>}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Project Info */}
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Client Name</label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Project Address" />
          </div>
        </Card>

        {/* Cabinet Style */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Cabinet Style</h2>
            <Button variant="outline" size="sm" onClick={() => setShowPricingSettings(true)} className="h-9 gap-1.5">
              <Settings2 className="w-4 h-4" /> Edit Pricing
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BID_STYLES.map(s => {
              const cfg = pricingConfigs.find(c => c.style_key === s.key);
              const label = cfg?.style_label || s.label;
              const isSelected = bidType === s.key;
              return (
                <button
                 key={s.key}
                 onClick={() => handleBidTypeChange(s.key)}
                 className={`rounded-xl border-2 p-3 text-left transition-all ${isSelected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50"}`}
                >
                 <div className={`text-sm font-semibold mb-1 ${isSelected ? "text-amber-800" : "text-slate-800"}`}>{label}</div>
                 {cfg?.description && (
                   <div className="text-xs text-slate-500 italic mb-1 leading-snug">{cfg.description}</div>
                 )}
                 {cfg ? (
                   <div className="text-xs text-slate-500 space-y-0.5">
                     <div>Base: <span className="font-medium text-slate-700">${cfg.bases_lf}/LF</span></div>
                     <div>Upper: <span className="font-medium text-slate-700">${cfg.uppers_lf}/LF</span></div>
                     <div>Tall: <span className="font-medium text-slate-700">${cfg.tall_lf}/LF</span></div>
                   </div>
                 ) : <div className="text-xs text-slate-400">Loading...</div>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Job Specifications */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-slate-900 mb-3">Job Specifications</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { field: "wood_species", label: "Wood Species" },
              { field: "door_style",   label: "Door Style" },
              { field: "handles",      label: "Handles" },
              { field: "drawerbox",    label: "Drawerbox" },
              { field: "drawer_glides",label: "Drawer Glides" },
              { field: "hinges",       label: "Hinges" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                <Input
                  value={specs[field] || ""}
                  onChange={e => setSpecs(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={bidType ? label : "Select style first"}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Plan Analysis */}
         <Card className="p-4 sm:p-5">
           <div className="flex items-center justify-between mb-3">
             <h2 className="font-bold text-slate-900 flex items-center gap-2">
               <Sparkles className="w-5 h-5 text-amber-600" /> AI Plan Analysis
             </h2>
             <div className="flex items-center gap-2">
               {planFileUrl && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setShowPlanViewer(true)}
                   className="h-8 gap-1.5 text-xs"
                 >
                   View & Mark Up
                 </Button>
               )}
               {planFileUrl && <button onClick={() => { setPlanFileUrl(null); setPlanFileName(null); setAiNotes(""); }} className="text-xs text-slate-400 hover:text-red-500">Remove</button>}
             </div>
           </div>

          {!planFileUrl ? (
            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${isUploading ? "border-amber-300 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-amber-50"}`}>
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-slate-700">Upload Architect Plans</p>
                <p className="text-sm text-slate-500">AI identifies all cabinet areas and groups them by room</p>
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
              <Button onClick={handleAnalyze} disabled={isAnalyzing || !bidType} className="w-full bg-amber-600 hover:bg-amber-700 h-11">
                {isAnalyzing
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing plans...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />{rooms.length > 0 ? "Re-Analyze Plans" : "Analyze Plans with AI"}</>
                }
              </Button>
              {!bidType && <p className="text-xs text-amber-600 text-center">Select a cabinet style above first</p>}
              {isAnalyzing && <p className="text-xs text-center text-slate-500">Reading plans and grouping by room... up to 60 seconds.</p>}
              {analyzeError && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{analyzeError}</span>
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

        {/* Rooms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{rooms.length > 0 ? `Rooms (${rooms.length})` : "Rooms"}</h2>
            <Button variant="outline" size="sm" onClick={() => setShowCatalogEditor(true)} className="h-9 gap-1.5">
              <BookOpen className="w-4 h-4" /> Edit Catalog
            </Button>
          </div>

          {rooms.map(room => (
            <BidRoomSection
              key={room.id}
              room={room}
              catalogItems={catalogItems}
              categories={categories}
              pricingConfigs={pricingConfigs}
              bidType={bidType}
              onChange={updated => setRooms(prev => prev.map(r => r.id === room.id ? updated : r))}
              onDelete={() => setRooms(prev => prev.filter(r => r.id !== room.id))}
            />
          ))}

          <Button onClick={addRoom} variant="outline" className="w-full h-11 border-dashed text-slate-600 border-slate-300">
            <Plus className="w-4 h-4 mr-1" /> Add Room
          </Button>
        </div>

        {/* Notes */}
        <Card className="p-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Additional Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." className="min-h-[80px]" />
        </Card>

        {/* Grand Total Footer */}
        {rooms.length > 0 && (
          <Card className="p-4 bg-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-sm">{rooms.length} rooms · {totalLf.toFixed(1)} total LF</div>
                <div className="text-2xl font-bold text-amber-400 mt-0.5">${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-11 px-6">
                {saved ? <><Check className="w-4 h-4 mr-1" />Saved!</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save Bid</>}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Link Project Dialog */}
      <Dialog open={showLinkProjectDialog} onOpenChange={setShowLinkProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link to Project</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {allProjects
              .filter(p => !projectSearch || p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) || p.client_name?.toLowerCase().includes(projectSearch.toLowerCase()))
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLinkProject(p)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                >
                  <div className="font-medium text-sm text-slate-800">{p.project_name}</div>
                  {p.client_name && <div className="text-xs text-slate-500">{p.client_name}</div>}
                </button>
              ))}
            {allProjects.filter(p => !projectSearch || p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) || p.client_name?.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No projects found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BidPricingSettings open={showPricingSettings} onClose={() => setShowPricingSettings(false)} onPricingUpdated={loadPricing} />
      <BidCatalogEditor open={showCatalogEditor} onClose={() => setShowCatalogEditor(false)} onSaved={() => { loadCatalog(); loadCategories(); }} />
      <BidClientView open={showClientView} onClose={() => setShowClientView(false)} bid={{ project_name: projectName, client_name: clientName, address, rooms, notes, ...specs }} bidType={pricingConfigs.find(c => c.style_key === bidType)?.style_label || BID_STYLES.find(s => s.key === bidType)?.label} />
      <BidPlanViewer
        open={showPlanViewer}
        onOpenChange={setShowPlanViewer}
        pdfUrl={planFileUrl}
        annotations={planAnnotations}
        onSave={async (savedAnnotations, notes) => {
          setPlanAnnotations(savedAnnotations);
          setAiNotes(notes);
          // Persist immediately so annotations survive page reload
          if (bidId) {
            await base44.entities.Bid.update(bidId, { plan_annotations: savedAnnotations, ai_notes: notes });
          }
        }}
        projectName={projectName}
        showNotesField={true}
        initialNotes={aiNotes}
        rooms={rooms}
        onAddToRoom={(roomId, category, lf, label) => {
          setRooms(prev => prev.map(room => {
            if (room.id !== roomId) return room;
            const newItem = {
              id: `item_${Date.now()}`,
              name: label || `${category} run`,
              cabinet_category: category,
              measure_type: "lf",
              quantity: Math.round(lf * 10) / 10,
              unit_price: getPriceForCategory(category),
              notes: "From plan measurement"
            };
            return { ...room, items: [...(room.items || []), newItem] };
          }));
        }}
      />
      </div>
      );
      }