import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Sparkles, Plus, Save, Check, RefreshCw, FileText, Settings2, AlertCircle, AlertTriangle, BookOpen, Send, Link2, Kanban, Search, X } from "lucide-react";
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

// Category → highlight color (matches the Annotate Plan highlight legend swatches:
// Base = tan/amber, Upper = blue, Tall = red, Misc = gray)
const CATEGORY_HIGHLIGHT_COLOR = { base: "#d97706", upper: "#3b82f6", tall: "#ef4444", misc: "#6b7280" };

// Render a specific PDF page (1-indexed) to a PNG blob for AI vision analysis
async function pdfToImageBlob(pdfUrl, pageNum = 1, scale = 2.0) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(pageNum);
  // Natural (scale=1) viewport — this is the SAME coordinate space the Annotate Plan
  // tool (react-pdf) stores annotations in, regardless of the scale we render the
  // image at for the AI. Returning it lets us convert AI fractions → natural px exactly.
  const natural = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  return { blob, naturalWidth: natural.width, naturalHeight: natural.height, imageWidth: viewport.width, imageHeight: viewport.height };
}

// Parse an architectural scale string like "1/4", "1/8", "3/16" → inches-per-foot.
function parseScaleInchesPerFoot(scaleStr) {
  if (!scaleStr) return 0;
  const s = String(scaleStr).trim();
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) { const n = +m[1], d = +m[2]; return n && d ? n / d : 0; }
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

// Extract line segments from a PDF page's vector operator list, transformed into the
// SAME natural (scale=1, top-down) pixel space the Annotate Plan tool stores annotations
// in — so a strip drawn "along segment N" lands pixel-accurate on the real wall, with no
// AI coordinate guessing. This is the geometry source the highlighting pass classifies against.
async function extractWallSegments(pdfUrl, pageNum) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const op = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  const segs = [];
  let cur = null, open = false;
  for (let i = 0; i < op.fnArray.length; i++) {
    const fn = op.fnArray[i], args = op.argsArray[i];
    if (fn === OPS.moveTo) { cur = [args[0], args[1]]; open = true; }
    else if (fn === OPS.lineTo) { if (open && cur) { segs.push([cur[0], cur[1], args[0], args[1]]); cur = [args[0], args[1]]; } }
    else if (fn === OPS.rectangle) {
      const [x, y, w, h] = args;
      if (w > 2 && h > 2) { segs.push([x, y, x + w, y]); segs.push([x + w, y, x + w, y + h]); segs.push([x + w, y + h, x, y + h]); segs.push([x, y + h, x, y]); }
      open = false; cur = null;
    }
    else if ([OPS.stroke, OPS.fill, OPS.fillStroke, OPS.closePath, OPS.eofFill, OPS.eofFillStroke].includes(fn)) { open = false; cur = null; }
  }
  return segs.map(([x1, y1, x2, y2]) => {
    const p1 = viewport.convertToViewportPoint(x1, y1);
    const p2 = viewport.convertToViewportPoint(x2, y2);
    return { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] };
  });
}

// Keep only long, orthogonal (wall-like) segments; dedupe near-duplicates; cap per page.
function filterWallSegments(segs, nw, nh) {
  const minLen = Math.min(nw, nh) * 0.02;
  const tol = Math.min(nw, nh) * 0.012;
  const walls = segs.filter(s => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    if (Math.hypot(dx, dy) < minLen) return false;
    return Math.abs(dy) < tol || Math.abs(dx) < tol; // horizontal or vertical
  });
  const dedup = [];
  for (const s of walls) {
    if (!dedup.some(d => Math.hypot(d.x1 - s.x1, d.y1 - s.y1) < tol && Math.hypot(d.x2 - s.x2, d.y2 - s.y2) < tol)) dedup.push(s);
  }
  dedup.sort((a, b) => Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
  return dedup.slice(0, 60);
}

// project prop: optional pre-linked project object (when opened from ProjectDetails)
export default function BidWorkspace({ bidId, project: linkedProject, onClose, onSaved, onOpenPricing }) {
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
  const [extractedData, setExtractedData] = useState(null);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
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
    if (cats.length === 0) {
      const { DEFAULT_CATEGORIES } = await import("./BidCatalogEditor");
      const created = await Promise.all(DEFAULT_CATEGORIES.map(c => base44.entities.BidCategory.create(c)));
      setCategories(created);
    } else {
      // Ensure "upgrades" category exists (may have been added after initial seed)
      const { DEFAULT_CATEGORIES } = await import("./BidCatalogEditor");
      let updated = [...cats];
      for (const def of DEFAULT_CATEGORIES) {
        if (!cats.find(c => c.key === def.key)) {
          const created = await base44.entities.BidCategory.create(def);
          updated = [...updated, created];
        }
      }
      setCategories(updated.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
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

  const getRoomTotal = (room) => {
    const items = room.items || [];
    const getItemSub = (item) => {
      if (item.measure_type === "percentage") {
        const appliesTo = item.upgrade_applies_to || ["base", "upper", "tall"];
        const base = items
          .filter(i => i.measure_type !== "percentage" && appliesTo.includes(i.cabinet_category))
          .reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
        return base * ((parseFloat(item.percentage) || 0) / 100);
      }
      return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    };
    return items.reduce((s, i) => s + getItemSub(i), 0);
  };
  const grandTotal = rooms.reduce((s, room) => s + getRoomTotal(room), 0);
  const totalLf = rooms.reduce((s, room) =>
    s + (room.items || []).filter(i => i.measure_type === "lf").reduce((rs, i) => rs + (parseFloat(i.quantity) || 0), 0), 0
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzeError(null);
    setExtractedData(null);
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

    const isPdf = planFileName?.toLowerCase().endsWith('.pdf') || planFileUrl?.toLowerCase().includes('.pdf');

    // Step 1: Extract real vector data from the PDF (rooms, dimensions, scale)
    let extractedSummary = null;
    let cabinetPricing = [];
    let extractedPageSelection = [];
    let extractedTotalPages = 0;
    if (isPdf) {
      try {
        const extractResponse = await fetch('https://vivica-d92c9f97.base44.app/functions/extractPlanMeasurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfUrl: planFileUrl })
        });
        const extracted = await extractResponse.json();
        if (extracted?.success) {
          extractedTotalPages = extracted.totalPages || 0;
          extractedPageSelection = extracted.pageSelection?.selectedPages || [];
          if (extracted.aiReadySummary) {
            extractedSummary = extracted.aiReadySummary;
            cabinetPricing = extracted.cabinetPricing || [];
          }
          setExtractedData(extracted);
        }
      } catch (err) {
        console.error('Plan extraction failed:', err);
      }
    } else {
      setExtractedData(null);
    }

    // Build the extracted-data section for the AI prompt
    let extractedDataSection = "";
    let extractedInstructions = "";
    if (extractedSummary) {
      const dimsText = (extractedSummary.roomsWithNearbyDimensions || [])
        .map(r => `- ${r.label}: ${(r.nearbyDimensions || []).map(d => d.text).join(', ')}`)
        .join('\n');
      const pricingText = (cabinetPricing || [])
        .map(p => `- ${p.styleName}: Base $${p.baseLf}/LF, Upper $${p.upperLf}/LF, Tall $${p.tallLf}/LF`)
        .join('\n');
      extractedDataSection = `\n\nEXTRACTED DATA FROM PDF (use these as ground truth — do not guess):\nScale: ${extractedSummary.detectedScale || '1/4'}" = 1'-0"\nRooms found (from PDF text labels):\n${(extractedSummary.roomLabels || []).join(', ')}\nRoom dimensions (from PDF dimension annotations):\n${dimsText}${pricingText ? `\n\nCabinet pricing tiers:\n${pricingText}` : ''}`;
      extractedInstructions = `\nUse the EXTRACTED DIMENSIONS above to calculate LF — do not guess from the image. For kitchens: look for appliance indicators (33" REF = refrigerator, 33" FRZ = freezer, 24" SHELVES = pantry shelving). For bathrooms: vanity runs are typically the wall width minus fixtures. For closets/pantries: use the shelving dimensions shown. Skip rooms that don't need cabinetry (bedrooms, hall, entry, exercise, garage).`;
    }

    const roomNotes = rooms
       .filter(r => r.pdf_notes)
       .map(r => `${r.room_name || "Room"}: ${r.pdf_notes}`)
       .join("\n");
     const roomNotesSection = roomNotes ? `\n\nAdditional notes from room annotations:\n${roomNotes}` : "";
     const mainPlanNotesSection = aiNotes ? `\n\nMain plan annotations and notes:\n${aiNotes}` : "";

    // Render the floor-plan pages identified by the extraction function (fall back to page 1).
    // For each rendered image we capture its PDF page number plus the page's natural
    // (scale=1) pixel dimensions — the exact space the Annotate Plan tool stores
    // annotations in — so AI-returned box fractions map to the correct on-plan location
    // regardless of what render scale the image was rasterized at.
    let analysisFileUrls = [planFileUrl];
    let analysisPagesList = [{ pdfPage: 1, naturalWidth: 0, naturalHeight: 0, imageWidth: 0, imageHeight: 0 }];
    if (isPdf) {
      try {
        const selectedPages = (extractedPageSelection.length ? extractedPageSelection : [1]).slice(0, 4);
        analysisPagesList = [];
        for (const pageNum of selectedPages) {
          try {
            const rendered = await pdfToImageBlob(planFileUrl, pageNum, 1.5);
            console.log(`[AI plan] page ${pageNum}: image ${rendered.imageWidth}x${rendered.imageHeight}px, natural(scale=1) ${rendered.naturalWidth}x${rendered.naturalHeight}px`);
            const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([rendered.blob], `plan-page${pageNum}.png`, { type: 'image/png' }) });
            analysisPagesList.push({ pdfPage: pageNum, naturalWidth: rendered.naturalWidth, naturalHeight: rendered.naturalHeight, imageWidth: rendered.imageWidth, imageHeight: rendered.imageHeight, fileUrl: file_url });
          } catch (e) {
            console.error(`Failed to render page ${pageNum}:`, e);
          }
        }
        if (analysisPagesList.length > 0) {
          analysisFileUrls = analysisPagesList.map(p => p.fileUrl);
        } else {
          const rendered = await pdfToImageBlob(planFileUrl, 1, 2.0);
          console.log(`[AI plan] fallback page 1: image ${rendered.imageWidth}x${rendered.imageHeight}px, natural ${rendered.naturalWidth}x${rendered.naturalHeight}px`);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([rendered.blob], 'plan-page1.png', { type: 'image/png' }) });
          analysisPagesList = [{ pdfPage: 1, naturalWidth: rendered.naturalWidth, naturalHeight: rendered.naturalHeight, imageWidth: rendered.imageWidth, imageHeight: rendered.imageHeight, fileUrl: file_url }];
          analysisFileUrls = [file_url];
        }
      } catch (err) {
        setAnalyzeError("Could not convert PDF for AI analysis. Try uploading a PNG or JPG image instead, or add rooms manually.");
        setIsAnalyzing(false);
        return;
      }
    }

    // ── CALL #1: PRIMARY TAKEOFF ──────────────────────────────────────────────
    // Focuses ONLY on rooms/cabinet runs + LF for pricing. No coordinate/geometry
    // instructions here, so the geometry task can't pollute the quantity takeoff
    // (the source of run-to-run total variance on identical plans).
    const needsVisionFallback = !!extractedSummary?.needsVisionFallback;
    let takeoffPrompt;
    if (extractedSummary && needsVisionFallback) {
      const floorPages = (extractedSummary.selectedPages?.length ? extractedSummary.selectedPages : extractedPageSelection).join(', ');
      takeoffPrompt = `You are estimating cabinetry for a residential project from architectural plans.

PDF ANALYSIS:
- Total pages in PDF: ${extractedTotalPages}
- Floor plan pages identified: ${floorPages}
- Text extraction found NO readable room labels (this PDF uses CAD vector-outline text, not embedded fonts)
- ${extractedSummary.totalLineSegments || 0} wall line segments were extracted from the vector geometry
- Text extraction quality: ${extractedSummary.textExtractionQuality || 'unknown'}${mainPlanNotesSection}${roomNotesSection}

INSTRUCTIONS:
1. Look at the floor plan images provided and identify ALL rooms that need cabinetry
2. Read room names from the visual labels on the plan (KITCHEN, BATH, PANTRY, LAUNDRY, etc.)
3. Read dimension annotations from the plan visually (e.g. "16'-0\"", "12'-6 1/2\"")
4. For each room with cabinetry, estimate base/upper/tall cabinet linear footage
5. Skip rooms that don't need cabinetry (bedrooms, hallways, garages, etc.)

IMPORTANT: Do NOT say "no rooms found" or "cannot identify rooms". The floor plan IS in the images — read it visually.

For measure_type: use "lf" for cabinet runs (base, upper, tall), use "qty" for individual pieces (islands, towers, appliance panels).
For cabinet_category: "base" = floor cabinets/islands, "upper" = wall-mounted upper cabs, "tall" = full-height pantries/towers, "misc" = accessories.

Return ONLY rooms with their items, quantities, and categories. Do NOT return coordinates, boxes, or geometry.`;
    } else {
      takeoffPrompt = `You are a professional cabinet estimator analyzing architectural floor plans for a ${styleLabel} cabinet project. ${pricingNote}
${extractedDataSection}${mainPlanNotesSection}${roomNotesSection}

CRITICAL: First, locate and read the SCALE RATIO on the plans (e.g., "1/4" = 1", "1/8" = 1", etc.). Use this scale to accurately convert measured distances to actual linear feet. If no scale is visible, assume 1/4" = 1" standard architectural scale.${extractedInstructions}

Identify EVERY cabinet location (Kitchen, Bathrooms, Pantry, Laundry, Mudroom, Closets, Built-ins, Bars, Offices, etc.).

Group by room. For each room provide a list of items. Split Base Cabinets, Wall/Upper Cabinets, and Tall Cabinets into separate items per room. Measure linear feet from wall dimensions using the scale ratio.

For measure_type: use "lf" for cabinet runs (base, upper, tall), use "qty" for individual pieces (islands, towers, appliance panels).
For cabinet_category: "base" = floor cabinets/islands, "upper" = wall-mounted upper cabs, "tall" = full-height pantries/towers, "misc" = accessories.

A typical home has 40–120+ LF of cabinetry. Be thorough and accurate with scale conversions.

Return ONLY rooms with their items, quantities, and categories. Do NOT return coordinates, boxes, or geometry.`;
    }

    let takeoff;
    try {
      takeoff = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_1_pro",
        prompt: takeoffPrompt,
        file_urls: analysisFileUrls,
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

    if (!takeoff.rooms || takeoff.rooms.length === 0) {
      setAnalyzeError("No cabinet areas detected. Tips:\n• Make sure the plan shows a floor plan view (not elevation/section)\n• Try uploading a PNG or JPG version for better results\n• Or use 'Add Rooms Manually' to build the list yourself");
      setIsAnalyzing(false);
      return;
    }

    // Build the priced room list from the takeoff. This is the source of truth for
    // pricing and is never modified by the highlight call below.
    const newRooms = takeoff.rooms.map((room, ri) => ({
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
    const newTotal = newRooms.reduce((s, r) => s + getRoomTotal(r), 0);

    // ── CALL #2: HIGHLIGHTING (best-effort, never affects pricing) ──────────────
    // Separate call so geometry estimation can't degrade the takeoff. If this fails
    // or returns nothing, the analysis still succeeds with full pricing — just no
    // highlights on the Annotate Plan overlay.
    let aiHighlights = [];
    try {
      const highlightPayload = takeoff.rooms.map((room, ri) => ({
        room_name: room.room_name || `Room ${ri + 1}`,
        items: (room.items || []).map(item => ({
          name: item.name || "",
          cabinet_category: item.cabinet_category || "misc"
        }))
      }));

      // ── Extract real wall line segments from the PDF vector geometry (client-side) ──
      // The takeoff already confirmed this PDF has vector data. We pull the actual wall
      // segments via pdfjs's operator list in the same natural (scale=1) coordinate space
      // the Annotate Plan tool stores annotations in, so a strip drawn along segment N
      // lands pixel-accurate on the real wall — no AI coordinate guessing. The AI's job
      // shrinks to CLASSIFICATION (which wall = this room's cabinet run), not measurement.
      const allWallSegments = []; // [{ index, page, x1,y1,x2,y2 (fractions 0-1), _nat:{natural px} }]
      try {
        for (const pm of analysisPagesList) {
          if (!pm.pdfPage || !pm.naturalWidth) continue;
          const raw = await extractWallSegments(planFileUrl, pm.pdfPage);
          const walls = filterWallSegments(raw, pm.naturalWidth, pm.naturalHeight);
          for (const w of walls) {
            allWallSegments.push({
              index: allWallSegments.length,
              page: pm.pdfPage,
              x1: +(w.x1 / pm.naturalWidth).toFixed(4),
              y1: +(w.y1 / pm.naturalHeight).toFixed(4),
              x2: +(w.x2 / pm.naturalWidth).toFixed(4),
              y2: +(w.y2 / pm.naturalHeight).toFixed(4),
              _nat: w
            });
            if (allWallSegments.length >= 120) break; // cap total candidates for the prompt
          }
          if (allWallSegments.length >= 120) break;
        }
      } catch (err) {
        console.warn("Wall segment extraction failed (will fall back to box highlights):", err);
      }

      // Cabinet depth (~24") → natural px, used as strip thickness. From the detected
      // architectural scale; falls back to ~4% of page size if scale is unknown.
      const scaleIpf = parseScaleInchesPerFoot(extractedSummary?.detectedScale);
      const depthPxByPage = {};
      for (const pm of analysisPagesList) {
        if (!pm.naturalWidth) continue;
        depthPxByPage[pm.pdfPage] = scaleIpf > 0
          ? Math.max(8, 2 * scaleIpf * 72) // 24" = 2 ft × px/ft (px/ft = ipf × 72)
          : Math.max(8, Math.min(pm.naturalWidth, pm.naturalHeight) * 0.04);
      }

      const wallListForPrompt = allWallSegments.map(w => ({ index: w.index, page: w.page, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));

      const highlightResult = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_1_pro",
        prompt: `You are locating cabinetry on an architectural floor plan for HIGHLIGHTING ONLY. A separate takeoff already produced the room/item list (do NOT modify names, categories, or quantities, and do NOT add/remove rooms/items). Your ONLY job: for each item, decide HOW its cabinet run sits on the plan and return its highlight.

Two highlight kinds — pick ONE per item:
1. "wall" — the cabinet run sits ALONG a wall / counter line (perimeter base/upper/tall runs, vanities, pantry/tall walls, wall runs against an interior/exterior wall). Pick the wall segment from the WALL SEGMENTS list that this run hugs. Return: { "kind":"wall", "segment_index": <N>, "page_number": <page of that segment> }.
2. "free" — the item is freestanding in open floor space (kitchen islands, free-standing towers). No wall segment applies. Return: { "kind":"free", "box": { "page_number": <n>, "x": <fx>, "y": <fy>, "width": <fw>, "height": <fh> } } as a fraction rectangle covering the item's footprint.

STRONGLY PREFER "wall" for perimeter/run cabinets (base/upper/tall runs along a wall) — it is far more accurate because the segment's exact geometry is already known. Use "free" ONLY for genuinely freestanding pieces such as kitchen islands.

For "free" boxes, coordinates are FRACTIONS of the image (0–1), top-down image coords (0 = top, 1 = bottom — NOT PDF bottom-up). For "wall", just reference segment_index from the list — do NOT estimate coordinates yourself.

For each room also return a room_box (the room's enclosed area where its label sits) as fraction coordinates { page_number, x, y, width, height }; this is used only as a fallback for items the AI can't anchor.

WALL SEGMENTS (index, page, x1,y1,x2,y2 as 0-1 fractions, top-down):
${JSON.stringify(wallListForPrompt)}

ROOM/ITEM LIST (return rooms/items in the SAME order, one highlight per item):
${JSON.stringify(highlightPayload)}`,
        file_urls: analysisFileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            rooms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  room_name: { type: "string" },
                  room_box: {
                    type: "object",
                    properties: {
                      page_number: { type: "number" },
                      x: { type: "number" }, y: { type: "number" },
                      width: { type: "number" }, height: { type: "number" }
                    }
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        highlight: {
                          type: "object",
                          properties: {
                            kind: { type: "string" },
                            segment_index: { type: "number" },
                            page_number: { type: "number" },
                            box: {
                              type: "object",
                              properties: {
                                page_number: { type: "number" },
                                x: { type: "number" }, y: { type: "number" },
                                width: { type: "number" }, height: { type: "number" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const fracBoxToNatural = (b, pm) => {
        if (!b || !pm || !pm.naturalWidth || !pm.naturalHeight) return null;
        const iw = pm.imageWidth || pm.naturalWidth;
        const ih = pm.imageHeight || pm.naturalHeight;
        const fx = (b.x || 0) > 1.5 ? (b.x || 0) / iw : (b.x || 0);
        const fy = (b.y || 0) > 1.5 ? (b.y || 0) / ih : (b.y || 0);
        const fw = (b.width || 0) > 1.5 ? (b.width || 0) / iw : (b.width || 0);
        const fh = (b.height || 0) > 1.5 ? (b.height || 0) / ih : (b.height || 0);
        const w = Math.max(0, fw * pm.naturalWidth);
        const h = Math.max(0, fh * pm.naturalHeight);
        if (w < 3 || h < 3) return null;
        return { page: pm.pdfPage, x: Math.max(0, fx * pm.naturalWidth), y: Math.max(0, fy * pm.naturalHeight), w, h };
      };

      const roomBoxes = (highlightResult.rooms || []).map(room => room.room_box
        ? fracBoxToNatural(room.room_box, analysisPagesList[Math.max(0, Math.floor((room.room_box.page_number || 1) - 1))])
        : null);

      (highlightResult.rooms || []).forEach((room, ri) => {
        const rb = roomBoxes[ri];
        const tRoom = newRooms[ri];
        const tItems = tRoom?.items || [];
        const hlItems = room.items || [];
        const nItems = hlItems.length;
        hlItems.forEach((item, ii) => {
          const cat = tItems[ii]?.cabinet_category || "misc";
          const color = CATEGORY_HIGHLIGHT_COLOR[cat] || CATEGORY_HIGHLIGHT_COLOR.misc;
          const roomName = tRoom?.room_name || room.room_name || "";
          const itemName = tItems[ii]?.name || item.name || "";
          const hl = item.highlight || {};

          // ── Wall-anchored strip (preferred): geometry from extracted vector data ──
          // The AI only picks which wall segment; position/length come from the real
          // extracted coordinates, so the strip hugs the actual wall/counter line.
          if (hl.kind === "wall" && Number.isInteger(hl.segment_index)) {
            const seg = allWallSegments[hl.segment_index];
            const segPage = hl.page_number || seg?.page;
            const pm = analysisPagesList.find(p => p.pdfPage === segPage) || analysisPagesList[0];
            if (seg && pm) {
              const nat = seg._nat;
              const thickness = depthPxByPage[pm.pdfPage] || Math.max(8, Math.min(pm.naturalWidth, pm.naturalHeight) * 0.04);
              aiHighlights.push({
                type: "strip", x1: nat.x1, y1: nat.y1, x2: nat.x2, y2: nat.y2,
                thickness, color, page: pm.pdfPage, source: "ai",
                room_name: roomName, item_name: itemName, _natural: true
              });
              return;
            }
          }

          // ── Freestanding box (islands etc.): AI-estimated footprint ──
          let box = hl.box ? fracBoxToNatural(hl.box, analysisPagesList[Math.max(0, Math.floor((hl.box.page_number || 1) - 1))]) : null;
          if (box && rb && rb.w > 3 && rb.h > 3) {
            const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
            if (!(cx >= rb.x && cx <= rb.x + rb.w && cy >= rb.y && cy <= rb.y + rb.h)) box = null;
          }
          if (!box && rb && rb.w > 3 && rb.h > 3) {
            const cols = Math.min(3, Math.max(1, nItems));
            const rows = Math.ceil(nItems / cols) || 1;
            const cellW = rb.w / cols, cellH = rb.h / rows;
            const col = ii % cols, row = Math.floor(ii / cols);
            box = { page: rb.page, x: rb.x + col * cellW + cellW * 0.2, y: rb.y + row * cellH + cellH * 0.25, w: cellW * 0.6, h: cellH * 0.5 };
          }
          if (!box || box.w < 3 || box.h < 3) return;
          aiHighlights.push({
            type: "highlight", x: box.x, y: box.y, w: box.w, h: box.h,
            color, page: box.page, source: "ai",
            room_name: roomName, item_name: itemName, _natural: true
          });
        });
      });
    } catch (err) {
      console.warn("Highlight call failed (non-blocking, pricing unaffected):", err);
    }

    // Final notes (unchanged behavior)
    let finalNotes = takeoff.general_notes || "";
    if (extractedSummary) {
      let extractionNote;
      if (extractedSummary.needsVisionFallback) {
        const pages = extractedPageSelection.length ? extractedPageSelection : (extractedSummary.selectedPages || []);
        extractionNote = `Estimates based on AI visual analysis of ${pages.length} floor plan page(s) (pages ${pages.join(', ') || '1'}). PDF text layer was not extractable (CAD vector-outline text). ${extractedSummary.totalLineSegments || 0} wall line segments extracted from vector geometry. All dimensions must be field-verified prior to fabrication.`;
      } else {
        const dimCount = (extractedSummary.dimensionAnnotations || []).length;
        extractionNote = `Estimates based on ${dimCount} dimension annotations extracted directly from the PDF vector data. Scale detected: ${extractedSummary.detectedScale || '1/4'}" = 1'-0". Room labels extracted from PDF text (not visual guessing). All dimensions must be field-verified prior to fabrication.`;
      }
      finalNotes = finalNotes ? `${finalNotes}\n\n${extractionNote}` : extractionNote;
    }

    // ── Apply results (with variance safety check on re-analyze) ────────────────
    const applyResults = () => {
      setRooms(newRooms);
      setAiNotes(finalNotes);
      if (aiHighlights.length > 0) {
        const kept = (planAnnotations || []).filter(a => !(a.source === "ai" && (a.type === "highlight" || a.type === "strip")));
        setPlanAnnotations([...kept, ...aiHighlights]);
      }
    };

    const prevTotal = grandTotal;
    if (rooms.length > 0 && prevTotal > 0) {
      const diff = Math.abs(newTotal - prevTotal);
      const pct = (diff / prevTotal) * 100;
      if (pct > 15) {
        setPendingAnalysis({ newRooms, finalNotes, aiHighlights, prevTotal, newTotal, pct });
        setIsAnalyzing(false);
        return;
      }
    }
    applyResults();
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
            <Button variant="outline" size="sm" onClick={onOpenPricing || (() => setShowPricingSettings(true))} className="h-9 gap-1.5">
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
               {planFileUrl && <button onClick={() => { setPlanFileUrl(null); setPlanFileName(null); setAiNotes(""); setExtractedData(null); }} className="text-xs text-slate-400 hover:text-red-500">Remove</button>}
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
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="whitespace-pre-line">{analyzeError}</span>
                </div>
              )}
              {pendingAnalysis && (
                <div className="border border-amber-300 bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">Review analysis change</p>
                      <p className="text-sm text-amber-800 mt-1">
                        New total (<b>${pendingAnalysis.newTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>) differs from previous analysis (<b>${pendingAnalysis.prevTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>) by <b>{pendingAnalysis.pct.toFixed(0)}%</b>. Please review room quantities carefully before using this for a customer estimate.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => {
                          setRooms(pendingAnalysis.newRooms);
                          setAiNotes(pendingAnalysis.finalNotes);
                          const kept = (planAnnotations || []).filter(a => !(a.source === "ai" && (a.type === "highlight" || a.type === "strip")));
                          setPlanAnnotations([...kept, ...pendingAnalysis.aiHighlights]);
                          setPendingAnalysis(null);
                        }}>Apply New Numbers</Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingAnalysis(null)}>Keep Existing</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {extractedData?.success && extractedData.aiReadySummary && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-sm text-blue-900">PDF Analysis Complete</h4>
                    {extractedData.aiReadySummary.needsVisionFallback && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Using AI vision (CAD text not extractable)</span>
                    )}
                  </div>
                  <p className="text-xs text-blue-800 mb-1">
                    {extractedData.totalPages || 0} pages → {(extractedData.pageSelection?.selectedPages || []).length} floor plan pages identified
                    {extractedData.aiReadySummary.totalLineSegments > 0 && ` · ${extractedData.aiReadySummary.totalLineSegments} wall segments extracted`}
                    {!extractedData.aiReadySummary.needsVisionFallback && ` · ${extractedData.aiReadySummary.roomLabels?.length || 0} rooms found · ${extractedData.aiReadySummary.dimensionAnnotations?.length || 0} dimensions`}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Pages selected: {(extractedData.pageSelection?.selectedPages || []).join(', ') || '1'}
                    {extractedData.aiReadySummary.detectedScale && ` · Scale: ${extractedData.aiReadySummary.detectedScale}" = 1'-0"`}
                  </p>
                  {!extractedData.aiReadySummary.needsVisionFallback && (
                    <details className="text-xs text-blue-900">
                      <summary className="cursor-pointer font-medium hover:text-blue-700">View rooms and dimensions</summary>
                      <div className="mt-2 space-y-2 pl-2">
                        {(extractedData.aiReadySummary.roomsWithNearbyDimensions || []).map(room => (
                          <div key={room.label}>
                            <strong className="text-blue-900">{room.label}</strong>
                            <ul className="ml-4 list-disc">
                              {(room.nearbyDimensions || []).map((d, i) => (
                                <li key={i}>{d.text}{d.feet != null ? ` (${d.feet.toFixed(1)} ft)` : ""}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
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
              sketchPaths={room.sketch_paths || []}
              specs={specs}
              linkedProjectId={linkedProjectId}
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
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
              {rooms.map(room => {
                const effKey = room.cabinet_style || bidType;
                const label = pricingConfigs.find(c => c.style_key === effKey)?.style_label || effKey || "—";
                return (
                  <div key={room.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-300 truncate">
                      {room.room_name || "Room"} — <span className="font-semibold text-slate-100">{label}</span>
                      {!room.cabinet_style && <span className="text-slate-500"> (default)</span>}
                    </span>
                    <span className="text-amber-300 font-semibold whitespace-nowrap">${getRoomTotal(room).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                );
              })}
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