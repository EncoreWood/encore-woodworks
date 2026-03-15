import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ZoomIn, ZoomOut, Maximize2, Ruler, Sparkles, X, Pencil, Eraser,
  ArrowRight, Minus, Type, Highlighter, Undo2, Trash2, Target, Send, MousePointer2,
  Pentagon, CheckCheck, Download
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import MozaikRoomPanel from "./MozaikRoomPanel";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const HIGHLIGHT_COLORS = [
  { label: "Base",   color: "#d97706", hex: "rgba(217,119,6,0.28)" },
  { label: "Upper",  color: "#3b82f6", hex: "rgba(59,130,246,0.28)" },
  { label: "Tall",   color: "#ef4444", hex: "rgba(239,68,68,0.28)" },
  { label: "Misc",   color: "#6b7280", hex: "rgba(107,114,128,0.35)" },
  { label: "Green",  color: "#16a34a", hex: "rgba(22,163,74,0.28)" },
  { label: "Purple", color: "#9333ea", hex: "rgba(147,51,234,0.28)" },
  { label: "Pink",   color: "#db2777", hex: "rgba(219,39,119,0.28)" },
  { label: "Teal",   color: "#0891b2", hex: "rgba(8,145,178,0.28)" },
];

function drawArrow(ctx, from, to, withHead) {
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  if (withHead) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x), hl = 14;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - hl * Math.cos(angle - Math.PI/6), to.y - hl * Math.sin(angle - Math.PI/6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - hl * Math.cos(angle + Math.PI/6), to.y - hl * Math.sin(angle + Math.PI/6));
    ctx.stroke();
  }
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────
// All annotations are stored in "natural" coordinates: the pixel position at scale=1.
// The canvas drawing-buffer is always naturalW × naturalH.
// The canvas CSS size is displayW × displayH (= naturalW*scale × naturalH*scale).
// This means canvas draw coordinates == annotation coordinates == always stable.

// Convert a saved annotation point to natural coords.
// Old format may have {x,y} (old screen-px, best-effort) or {rx,ry} (fraction).
function toNatPt(pt, nw, nh) {
  if (!pt) return { x: 0, y: 0 };
  if (pt.rx !== undefined) return { x: pt.rx * nw, y: pt.ry * nh };
  return { x: pt.x ?? 0, y: pt.y ?? 0 };
}
function annToNatural(ann, nw, nh) {
  if (ann._natural) return ann; // already converted
  if (ann.type === "pen") {
    const pts = ann.rpoints
      ? ann.rpoints.map(p => toNatPt(p, nw, nh))
      : (ann.points || []);
    return { ...ann, points: pts, rpoints: undefined, _natural: true };
  }
  if (ann.type === "highlight") {
    const o = toNatPt({ rx: ann.rx, ry: ann.ry }, nw, nh);
    if (ann.rx !== undefined) {
      return { ...ann, x: o.x, y: o.y, w: ann.rw * nw, h: ann.rh * nh, rx: undefined, ry: undefined, rw: undefined, rh: undefined, _natural: true };
    }
    return { ...ann, _natural: true };
  }
  if (ann.type === "text") {
    if (ann.rx !== undefined) {
      const p = toNatPt({ rx: ann.rx, ry: ann.ry }, nw, nh);
      return { ...ann, x: p.x, y: p.y, rx: undefined, ry: undefined, _natural: true };
    }
    return { ...ann, _natural: true };
  }
  if (ann.type === "arrow" || ann.type === "line") {
    if (ann.rstart) {
      return { ...ann, start: toNatPt(ann.rstart, nw, nh), end: toNatPt(ann.rend, nw, nh), rstart: undefined, rend: undefined, _natural: true };
    }
    return { ...ann, _natural: true };
  }
  return { ...ann, _natural: true };
}
function measToNatural(m, nw, nh) {
  if (m._natural) return m;
  return { ...m, start: toNatPt(m.start, nw, nh), end: toNatPt(m.end, nw, nh), _natural: true };
}

export default function BidPlanViewer({ open, onOpenChange, pdfUrl, annotations = [], onSave, showNotesField = false, initialNotes = "", rooms = [], onAddToRoom }) {
  if (!pdfUrl) return null;

  // PDF / view state
  const [numPages, setNumPages]         = useState(null);
  const [pageNumber, setPageNumber]     = useState(1);
  const [scale, setScale]               = useState(1.0);
  const [rotation, setRotation]         = useState(0);
  const [autoFitted, setAutoFitted]     = useState(false);

  // Natural page dimensions (at scale=1). Fixed once set.
  // displaySize = naturalSize * scale (CSS pixels shown on screen)
  const [naturalSize, setNaturalSize]   = useState({ w: 595, h: 842 });
  const [displaySize, setDisplaySize]   = useState({ w: 595, h: 842 });
  const naturalRef                       = useRef({ w: 595, h: 842 });

  // Annotation state — all coords in natural-px space
  const [tool, setTool]                 = useState("pointer");
  const [color, setColor]               = useState("#e53e3e");
  const [highlightColor, setHighlightColor] = useState("#d97706");
  const [annList, setAnnList]           = useState([]);
  const [currentPath, setCurrentPath]   = useState([]);
  const [currentLine, setCurrentLine]   = useState(null);
  const [textInput, setTextInput]       = useState(null); // { nat:{x,y}, css:{x,y} }
  const [textValue, setTextValue]       = useState("");
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [aiNotes, setAiNotes]           = useState(initialNotes);

  // Scale / calibration
  const [detectedScale, setDetectedScale]   = useState(null);
  const [detectingScale, setDetectingScale] = useState(false);
  const [pxPerFtNat, setPxPerFtNat]         = useState(null); // natural px per real foot
  const [manualScaleInput, setManualScaleInput] = useState("");
  const [showScaleOverride, setShowScaleOverride] = useState(false);

  // Measure (natural-px transient coords)
  const [measureStart, setMeasureStart]   = useState(null);
  const [measurePreview, setMeasurePreview] = useState(null);
  const [measurements, setMeasurements]   = useState([]);

  // Calibrate
  const [calibStart, setCalibStart]   = useState(null);
  const [calibPreview, setCalibPreview] = useState(null);
  const [pendingCalib, setPendingCalib] = useState(null);
  const [calibKnownFeet, setCalibKnownFeet] = useState("");

  // Pointer / select / drag
  const [selectedAnn, setSelectedAnn]       = useState(null); // { kind:"ann"|"measurement", idx }
  const [deletePopup, setDeletePopup]       = useState(null); // { cssX, cssY, kind, idx }
  const dragRef                              = useRef(null);

  // Send to bid
  const [sendingM, setSendingM]     = useState(null);
  const [sendRoomId, setSendRoomId] = useState("");
  const [sendCategory, setSendCategory] = useState("base");

  // Trace Room / Mozaik export
  const [tracePoints, setTracePoints]       = useState([]);
  const [tracePreview, setTracePreview]     = useState(null);
  const [tracedRooms, setTracedRooms]       = useState([]);
  const [editingRoom, setEditingRoom]       = useState(null); // room obj to open panel for
  const [pendingRoom, setPendingRoom]       = useState(null); // newly closed trace awaiting panel

  const canvasRef        = useRef(null);
  const pageContainerRef = useRef(null);
  const scrollRef        = useRef(null);
  const scaleDetectedRef = useRef(false);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setAnnList(annotations.filter(a => a.type !== "measurement"));
      setMeasurements(annotations.filter(a => a.type === "measurement"));
      setAiNotes(initialNotes);
      setAutoFitted(false);
      setPageNumber(1);
      setTool("pointer");
      setMeasureStart(null); setCalibStart(null);
      setSelectedAnn(null); setDeletePopup(null);
      dragRef.current = null;
    }
  }, [open]);

  // ── Auto-fit ──────────────────────────────────────────────────────────────
  const [naturalPageWidth, setNaturalPageWidth] = useState(null);
  useEffect(() => {
    if (naturalPageWidth && !autoFitted && scrollRef.current) {
      const w = scrollRef.current.clientWidth - 64;
      setScale(Math.min(Math.max(w / naturalPageWidth, 0.3), 3.0));
      setAutoFitted(true);
    }
  }, [naturalPageWidth, autoFitted]);

  // ── AI scale detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (open && pdfUrl && !scaleDetectedRef.current) {
      scaleDetectedRef.current = true;
      detectScale();
    }
    if (!open) scaleDetectedRef.current = false;
  }, [open, pdfUrl]);

  const detectScale = async () => {
    setDetectingScale(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `Look at this architectural floor plan. Find the scale indicator. Return inches_per_foot (for "1/4\\"=1'-0\\"" return 0.25, for "1/8\\"=1'" return 0.125) and scale_text. If unclear return 0.25.`,
        file_urls: [pdfUrl],
        response_json_schema: { type: "object", properties: { inches_per_foot: { type: "number" }, scale_text: { type: "string" }, confidence: { type: "string" } } }
      });
      if (result.inches_per_foot > 0) {
        setDetectedScale(result);
        // pxPerFtNat: at scale=1, PDF renders at 72 DPI. 1 foot = inches_per_foot * 12 inches * 72px/in... 
        // wait: inches_per_foot = plan_inches_per_real_foot, so 1 real foot = inches_per_foot plan-inches = inches_per_foot*72 natural-px
        setPxPerFtNat(result.inches_per_foot * 72);
      }
    } catch (_) {}
    setDetectingScale(false);
  };

  const applyManualScale = () => {
    const val = manualScaleInput.trim();
    let ipf = val.includes("/") ? (() => { const [n,d] = val.split("/").map(Number); return n&&d ? n/d : null; })() : parseFloat(val);
    if (ipf > 0) { setPxPerFtNat(ipf * 72); setDetectedScale({ inches_per_foot: ipf, scale_text: `${val}" = 1'`, confidence: "manual" }); }
    setShowScaleOverride(false); setManualScaleInput("");
  };

  const fitToPage = useCallback(() => {
    if (!scrollRef.current || !naturalPageWidth) return;
    const w = scrollRef.current.clientWidth - 64;
    setScale(Math.min(Math.max(w / naturalPageWidth, 0.3), 3.0));
  }, [naturalPageWidth]);

  // ── Sync sizes from PDF page ──────────────────────────────────────────────
  const syncSizes = useCallback(() => {
    const el = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
    if (!el) return;
    const dw = el.offsetWidth, dh = el.offsetHeight;
    if (!dw || !dh) return;
    setDisplaySize({ w: dw, h: dh });
    // Natural size is fixed by page+rotation; compute from display size and current scale
    const nw = Math.round(dw / scale), nh = Math.round(dh / scale);
    naturalRef.current = { w: nw, h: nh };
    setNaturalSize({ w: nw, h: nh });
  }, [scale]);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
  const onPageLoadSuccess = () => {
    setTimeout(() => {
      const el = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
      if (el) {
        const nw = el.offsetWidth / scale;
        if (!autoFitted) setNaturalPageWidth(nw);
      }
      syncSizes();
    }, 80);
  };

  useEffect(() => { setTimeout(syncSizes, 120); }, [scale, rotation, pageNumber]);

  // ── Convert loaded annotations to natural coords once naturalSize is known ─
  const convertedRef = useRef(false);
  useEffect(() => {
    if (!naturalSize.w || convertedRef.current) return;
    if (naturalSize.w === 595 && naturalSize.h === 842) return; // default, not real yet
    convertedRef.current = true;
    setAnnList(prev => prev.map(a => annToNatural(a, naturalSize.w, naturalSize.h)));
    setMeasurements(prev => prev.map(m => measToNatural(m, naturalSize.w, naturalSize.h)));
  }, [naturalSize]);

  // Reset conversion flag on open
  useEffect(() => { if (open) convertedRef.current = false; }, [open]);

  // ── Coordinate helpers ───────────────────────────────────────────────────
  // Get natural-px coords from a pointer event
  const getPos = (e) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: 0, y: 0 };
    const nat = naturalRef.current;
    return {
      x: (e.clientX - r.left) * nat.w / r.width,
      y: (e.clientY - r.top)  * nat.h / r.height,
    };
  };
  // Get CSS-px coords (for DOM-positioned elements like text input)
  const getPosCSS = (e) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 };
  };
  // Convert natural coords to CSS coords (for DOM elements)
  const natToCSS = (pos) => {
    const nat = naturalRef.current;
    const disp = displaySize;
    return { x: pos.x * disp.w / nat.w, y: pos.y * disp.h / nat.h };
  };

  const computeRealFeet = (p1, p2) => {
    if (!pxPerFtNat) return null;
    // p1, p2 in natural px — no scale division needed
    return Math.hypot(p2.x - p1.x, p2.y - p1.y) / pxPerFtNat;
  };

  // ── Hit-test (all coords in natural space) ───────────────────────────────
  const hitTest = (pos) => {
    const nat = naturalRef.current;
    // T in natural px: ~14 CSS px → 14 * nat.w / displaySize.w
    const T = 14 * nat.w / displaySize.w;

    for (let i = measurements.length - 1; i >= 0; i--) {
      const m = measurements[i];
      if (m.page !== pageNumber) continue;
      const s = toNatPt(m.start, nat.w, nat.h), en = toNatPt(m.end, nat.w, nat.h);
      const mid = { x: (s.x+en.x)/2, y: (s.y+en.y)/2 };
      if (Math.hypot(pos.x-mid.x, pos.y-mid.y) < T*2) return { kind:"measurement", idx:i };
      if (Math.hypot(pos.x-s.x, pos.y-s.y) < T) return { kind:"measurement", idx:i };
      if (Math.hypot(pos.x-en.x, pos.y-en.y) < T) return { kind:"measurement", idx:i };
    }
    const pageAnns = annList.map((a,i)=>({a,i})).filter(({a})=>a.page===pageNumber);
    for (let j = pageAnns.length-1; j >= 0; j--) {
      const {a,i} = pageAnns[j];
      if (a.type === "highlight") {
        if (pos.x >= a.x && pos.x <= a.x+a.w && pos.y >= a.y && pos.y <= a.y+a.h) return {kind:"ann",idx:i};
      } else if (a.type === "text") {
        if (Math.hypot(pos.x-a.x, pos.y-a.y) < T*2) return {kind:"ann",idx:i};
      } else if (a.type === "pen") {
        if ((a.points||[]).some(pt=>Math.hypot(pt.x-pos.x, pt.y-pos.y) < T)) return {kind:"ann",idx:i};
      } else if (a.type === "arrow" || a.type === "line") {
        const s = a.start, en = a.end;
        if (Math.hypot(pos.x-s.x, pos.y-s.y)<T || Math.hypot(pos.x-en.x, pos.y-en.y)<T) return {kind:"ann",idx:i};
      }
    }
    return null;
  };

  // ── Translate annotation by natural-px delta ──────────────────────────────
  const translateAnn = (ann, dx, dy) => {
    if (ann.type === "pen") return { ...ann, points: (ann.points||[]).map(p=>({x:p.x+dx,y:p.y+dy})) };
    if (ann.type === "highlight") return { ...ann, x: ann.x+dx, y: ann.y+dy };
    if (ann.type === "text") return { ...ann, x: ann.x+dx, y: ann.y+dy };
    if (ann.type === "arrow" || ann.type === "line") return { ...ann, start:{x:ann.start.x+dx,y:ann.start.y+dy}, end:{x:ann.end.x+dx,y:ann.end.y+dy} };
    return ann;
  };
  const translateMeas = (m, dx, dy) => ({
    ...m,
    start: { x: m.start.x+dx, y: m.start.y+dy },
    end:   { x: m.end.x+dx,   y: m.end.y+dy },
  });

  // ── Pointer events ────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);

    if (tool === "trace") {
      // Check if clicking near first point to close shape
      if (tracePoints.length >= 3) {
        const first = tracePoints[0];
        const T = 18 * naturalRef.current.w / displaySize.w;
        if (Math.hypot(pos.x - first.x, pos.y - first.y) < T) {
          setPendingRoom({ points: tracePoints, page: pageNumber });
          setTracePoints([]);
          setTracePreview(null);
          return;
        }
      }
      setTracePoints(prev => [...prev, pos]);
      return;
    }

    if (tool === "pointer") {
      const hit = hitTest(pos);
      if (hit) {
        setSelectedAnn(hit);
        dragRef.current = { ...hit, lastPos: pos, moved: false };
        setDeletePopup(null);
      } else {
        setSelectedAnn(null);
        setDeletePopup(null);
        dragRef.current = null;
      }
      return;
    }

    setDeletePopup(null);
    setSelectedAnn(null);

    if (tool === "measure") {
      if (!measureStart) setMeasureStart(pos);
      else {
        const realFeet = computeRealFeet(measureStart, pos);
        setMeasurements(p => [...p, {
          type: "measurement", _natural: true,
          start: measureStart, end: pos,
          realFeet, page: pageNumber,
          id: `m_${Date.now()}`, label: `Measurement ${measurements.length+1}`
        }]);
        setMeasureStart(null); setMeasurePreview(null);
      }
      return;
    }
    if (tool === "calibrate") {
      if (!calibStart) setCalibStart(pos);
      else {
        const dist = Math.hypot(pos.x-calibStart.x, pos.y-calibStart.y);
        setPendingCalib({ start: calibStart, end: pos, pixelDistNat: dist });
        setCalibStart(null); setCalibPreview(null);
      }
      return;
    }
    if (tool === "pen") { setIsPointerDown(true); setCurrentPath([pos]); }
    else if (tool === "eraser") { setIsPointerDown(true); eraseAt(pos); }
    else if (["arrow","line","highlight"].includes(tool)) { setIsPointerDown(true); setCurrentLine({start:pos,end:pos}); }
    else if (tool === "text") {
      setTextInput({ nat: pos, css: getPosCSS(e) });
      setTextValue("");
    }
  };

  const handlePointerMove = (e) => {
    const pos = getPos(e);

    if (tool === "pointer" && dragRef.current) {
      const { kind, idx, lastPos } = dragRef.current;
      const dx = pos.x - lastPos.x, dy = pos.y - lastPos.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        dragRef.current.moved = true;
        dragRef.current.lastPos = pos;
        if (kind === "ann") setAnnList(p => p.map((a,i) => i===idx ? translateAnn(a,dx,dy) : a));
        else setMeasurements(p => p.map((m,i) => i===idx ? translateMeas(m,dx,dy) : m));
      }
      return;
    }

    if (tool === "measure" && measureStart) { setMeasurePreview(pos); return; }
    if (tool === "calibrate" && calibStart) { setCalibPreview(pos); return; }
    if (!isPointerDown) return;
    e.preventDefault();
    if (tool === "pen") setCurrentPath(p => [...p, pos]);
    else if (tool === "eraser") eraseAt(pos);
    else if (["arrow","line","highlight"].includes(tool)) setCurrentLine(p => p ? {...p,end:pos} : null);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "pointer") {
      if (dragRef.current && !dragRef.current.moved && selectedAnn) {
        // Show delete popup in CSS coords
        const cssPos = getPosCSS(e);
        setDeletePopup({ cssX: cssPos.x, cssY: cssPos.y, ...selectedAnn });
      }
      dragRef.current = null;
      return;
    }

    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(p => [...p, { type:"pen", points:currentPath, color, page:pageNumber, _natural:true }]);
      setCurrentPath([]);
    } else if ((tool==="arrow"||tool==="line") && currentLine) {
      if (Math.hypot(pos.x-currentLine.start.x, pos.y-currentLine.start.y) > 3)
        setAnnList(p => [...p, { type:tool, start:currentLine.start, end:pos, color, page:pageNumber, _natural:true }]);
      setCurrentLine(null);
    } else if (tool==="highlight" && currentLine) {
      const w=Math.abs(pos.x-currentLine.start.x), h=Math.abs(pos.y-currentLine.start.y);
      if (w>3 && h>3) setAnnList(p => [...p, {
        type:"highlight",
        x:Math.min(currentLine.start.x,pos.x), y:Math.min(currentLine.start.y,pos.y),
        w, h, color:highlightColor, page:pageNumber, _natural:true
      }]);
      setCurrentLine(null);
    }
    setIsPointerDown(false);
  };

  const eraseAt = ({ x, y }) => {
    const nat = naturalRef.current;
    const T = 18 * nat.w / displaySize.w;
    setAnnList(p => p.filter(a => {
      if (a.page !== pageNumber) return true;
      if (a.type==="highlight") return !(x>=a.x && x<=a.x+a.w && y>=a.y && y<=a.y+a.h);
      if (a.type==="pen") return !(a.points||[]).some(pt=>Math.hypot(pt.x-x,pt.y-y)<T);
      if (a.type==="arrow"||a.type==="line") return Math.hypot(a.start.x-x,a.start.y-y)>=T && Math.hypot(a.end.x-x,a.end.y-y)>=T;
      if (a.type==="text") return Math.hypot(a.x-x,a.y-y)>=T*2;
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim())
      setAnnList(p => [...p, { type:"text", x:textInput.nat.x, y:textInput.nat.y, text:textValue.trim(), color, page:pageNumber, _natural:true }]);
    setTextInput(null); setTextValue("");
  };

  const applyCalibration = () => {
    if (!pendingCalib || !calibKnownFeet) return;
    const ft = parseFloat(calibKnownFeet);
    if (ft <= 0) return;
    // pixelDistNat is in natural-px; divide by feet to get natural-px per foot
    setPxPerFtNat(pendingCalib.pixelDistNat / ft);
    setDetectedScale({ inches_per_foot: (pendingCalib.pixelDistNat/ft)/72, scale_text: `Calibrated (${calibKnownFeet} ft)`, confidence:"manual" });
    setPendingCalib(null); setCalibKnownFeet("");
  };

  const handleSave = () => { onSave([...annList, ...measurements], aiNotes); onOpenChange(false); };

  // ── Open room panel when pendingRoom is set ────────────────────────────────
  // (done via JSX conditional below)

  // ── Canvas render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations (all in natural px == canvas buffer px)
    annList.filter(a => a.page===pageNumber).forEach(ann => {
      const isSel = selectedAnn?.kind==="ann" && annList.indexOf(ann)===selectedAnn.idx;
      ctx.strokeStyle=ann.color; ctx.fillStyle=ann.color; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round";

      if (ann.type==="highlight") {
        const [r,g,b]=[parseInt(ann.color.slice(1,3),16),parseInt(ann.color.slice(3,5),16),parseInt(ann.color.slice(5,7),16)];
        ctx.fillStyle=`rgba(${r},${g},${b},0.35)`; ctx.strokeStyle=`rgba(${r},${g},${b},0.7)`; ctx.lineWidth=isSel?2.5:1.5;
        ctx.fillRect(ann.x,ann.y,ann.w,ann.h); ctx.strokeRect(ann.x,ann.y,ann.w,ann.h);
        if (isSel) { ctx.strokeStyle="#3b82f6"; ctx.lineWidth=2.5; ctx.strokeRect(ann.x-2,ann.y-2,ann.w+4,ann.h+4); }
        const lbl=HIGHLIGHT_COLORS.find(c=>c.color===ann.color)?.label;
        if (lbl) { ctx.font="bold 10px sans-serif"; ctx.fillStyle=`rgba(${r},${g},${b},1)`; ctx.fillText(lbl,ann.x+3,ann.y+12); }

      } else if (ann.type==="pen") {
        ctx.strokeStyle=isSel?"#3b82f6":ann.color; ctx.lineWidth=isSel?3.5:2.5;
        ctx.beginPath(); (ann.points||[]).forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y)); ctx.stroke();

      } else if (ann.type==="arrow"||ann.type==="line") {
        ctx.strokeStyle=isSel?"#3b82f6":ann.color; ctx.lineWidth=isSel?3.5:2.5;
        drawArrow(ctx,ann.start,ann.end,ann.type==="arrow");
        if (isSel) { ctx.fillStyle="#3b82f6"; [ann.start,ann.end].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();}); }

      } else if (ann.type==="text") {
        ctx.font="bold 13px sans-serif"; const m=ctx.measureText(ann.text);
        if (isSel) { ctx.fillStyle="rgba(59,130,246,0.15)"; ctx.fillRect(ann.x-5,ann.y-18,m.width+10,23); ctx.strokeStyle="#3b82f6"; ctx.lineWidth=1.5; ctx.strokeRect(ann.x-5,ann.y-18,m.width+10,23); }
        else { ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fillRect(ann.x-3,ann.y-15,m.width+6,19); ctx.strokeStyle=ann.color; ctx.lineWidth=1; ctx.strokeRect(ann.x-3,ann.y-15,m.width+6,19); }
        ctx.fillStyle=isSel?"#1d4ed8":ann.color; ctx.fillText(ann.text,ann.x,ann.y);
      }
    });

    // Draw measurements
    measurements.filter(m=>m.page===pageNumber).forEach((m,idx)=>{
      const isSel = selectedAnn?.kind==="measurement" && selectedAnn.idx===idx;
      const s = m.start, en = m.end;
      ctx.strokeStyle=isSel?"#3b82f6":"#ef4444"; ctx.fillStyle=isSel?"#3b82f6":"#ef4444";
      ctx.lineWidth=isSel?3:2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(en.x,en.y); ctx.stroke();
      [s,en].forEach(pt=>{ctx.beginPath();ctx.arc(pt.x,pt.y,4,0,Math.PI*2);ctx.fill();});
      const mx=(s.x+en.x)/2, my=(s.y+en.y)/2, lbl=m.realFeet!=null?`${m.realFeet.toFixed(1)} LF`:"?";
      ctx.font="bold 11px sans-serif"; const tm=ctx.measureText(lbl);
      ctx.fillStyle=isSel?"rgba(59,130,246,0.95)":"rgba(239,68,68,0.92)";
      ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(mx-tm.width/2-5,my-15,tm.width+10,19,4);else ctx.rect(mx-tm.width/2-5,my-15,tm.width+10,19); ctx.fill();
      ctx.fillStyle="white"; ctx.fillText(lbl,mx-tm.width/2,my);
    });

    // Active measure preview
    if (tool==="measure" && measureStart) {
      ctx.fillStyle="#f59e0b"; ctx.beginPath(); ctx.arc(measureStart.x,measureStart.y,6,0,Math.PI*2); ctx.fill();
      if (measurePreview) {
        ctx.strokeStyle="#f59e0b"; ctx.lineWidth=2; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.moveTo(measureStart.x,measureStart.y); ctx.lineTo(measurePreview.x,measurePreview.y); ctx.stroke(); ctx.setLineDash([]);
        const rf=computeRealFeet(measureStart,measurePreview);
        if (rf!=null) {
          const mx2=(measureStart.x+measurePreview.x)/2, my2=(measureStart.y+measurePreview.y)/2, ltxt=`${rf.toFixed(1)} LF`;
          ctx.font="bold 12px sans-serif"; const m2=ctx.measureText(ltxt);
          ctx.fillStyle="rgba(245,158,11,0.95)"; ctx.fillRect(mx2-m2.width/2-4,my2-15,m2.width+8,18);
          ctx.fillStyle="white"; ctx.fillText(ltxt,mx2-m2.width/2,my2);
        }
      }
    }

    // Draw traced rooms
    tracedRooms.filter(r => r.page === pageNumber).forEach((room, ri) => {
      const pts = room.points;
      if (pts.length < 2) return;
      ctx.strokeStyle = "#10b981"; ctx.fillStyle = "rgba(16,185,129,0.15)"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      pts.forEach(pt => { ctx.fillStyle="#10b981"; ctx.beginPath(); ctx.arc(pt.x,pt.y,4,0,Math.PI*2); ctx.fill(); });
      const cx2 = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const cy2 = pts.reduce((s,p)=>s+p.y,0)/pts.length;
      const lbl = room.name || `Room ${ri+1}`;
      ctx.font = "bold 12px sans-serif"; const tm2 = ctx.measureText(lbl);
      ctx.fillStyle = "rgba(16,185,129,0.9)"; ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(cx2-tm2.width/2-5,cy2-10,tm2.width+10,18,3);else ctx.rect(cx2-tm2.width/2-5,cy2-10,tm2.width+10,18); ctx.fill();
      ctx.fillStyle = "white"; ctx.fillText(lbl, cx2-tm2.width/2, cy2+4);
    });

    // Active trace preview
    if (tool === "trace" && tracePoints.length > 0) {
      ctx.strokeStyle = "#10b981"; ctx.fillStyle = "rgba(16,185,129,0.1)"; ctx.lineWidth = 2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(tracePoints[0].x, tracePoints[0].y);
      for (let i = 1; i < tracePoints.length; i++) ctx.lineTo(tracePoints[i].x, tracePoints[i].y);
      if (tracePreview) ctx.lineTo(tracePreview.x, tracePreview.y);
      ctx.stroke(); ctx.setLineDash([]);
      tracePoints.forEach((pt, i) => {
        const isFirst = i === 0;
        ctx.fillStyle = isFirst ? "#059669" : "#10b981";
        ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,isFirst?7:4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      });
    }

    // Active calibrate preview
    if (tool==="calibrate" && calibStart) {
      ctx.fillStyle="#8b5cf6"; ctx.beginPath(); ctx.arc(calibStart.x,calibStart.y,6,0,Math.PI*2); ctx.fill();
      if (calibPreview) {
        ctx.strokeStyle="#8b5cf6"; ctx.lineWidth=2; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.moveTo(calibStart.x,calibStart.y); ctx.lineTo(calibPreview.x,calibPreview.y); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // Transient drawing previews (already in natural px)
    if (currentPath.length>1) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); currentPath.forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y)); ctx.stroke(); }
    if (currentLine&&(tool==="arrow"||tool==="line")) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; drawArrow(ctx,currentLine.start,currentLine.end,tool==="arrow"); }
    if (currentLine&&tool==="highlight") {
      const [r2,g2,b2]=[parseInt(highlightColor.slice(1,3),16),parseInt(highlightColor.slice(3,5),16),parseInt(highlightColor.slice(5,7),16)];
      const x=Math.min(currentLine.start.x,currentLine.end.x), y=Math.min(currentLine.start.y,currentLine.end.y), w=Math.abs(currentLine.end.x-currentLine.start.x), h=Math.abs(currentLine.end.y-currentLine.start.y);
      ctx.fillStyle=`rgba(${r2},${g2},${b2},0.35)`; ctx.strokeStyle=`rgba(${r2},${g2},${b2},0.8)`; ctx.lineWidth=1.5;
      ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
    }
  }, [annList, measurements, currentPath, currentLine, pageNumber, color, highlightColor, naturalSize, tool, measureStart, measurePreview, calibStart, calibPreview, selectedAnn, tracedRooms, tracePoints, tracePreview]);

  // ── Toolbar config ─────────────────────────────────────────────────────────
  const toolConfig = [
    { key:"pointer",   label:"Select",     icon:MousePointer2, cls:"bg-slate-700 hover:bg-slate-800 text-white" },
    { key:"pen",       label:"Draw",       icon:Pencil,        cls:"bg-amber-600 hover:bg-amber-700 text-white" },
    { key:"highlight", label:"Highlight",  icon:Highlighter,   cls:"bg-yellow-500 hover:bg-yellow-600 text-white" },
    { key:"arrow",     label:"Arrow",      icon:ArrowRight,    cls:"bg-blue-600 hover:bg-blue-700 text-white" },
    { key:"line",      label:"Line",       icon:Minus,         cls:"bg-green-600 hover:bg-green-700 text-white" },
    { key:"text",      label:"Text",       icon:Type,          cls:"bg-purple-600 hover:bg-purple-700 text-white" },
    { key:"eraser",    label:"Eraser",     icon:Eraser,        cls:"bg-slate-500 hover:bg-slate-600 text-white" },
    { key:"measure",   label:"Measure",    icon:Ruler,         cls:"bg-orange-500 hover:bg-orange-600 text-white" },
    { key:"calibrate", label:"Calibrate",  icon:Target,        cls:"bg-violet-600 hover:bg-violet-700 text-white" },
    { key:"trace",     label:"Trace Room", icon:Pentagon,      cls:"bg-emerald-600 hover:bg-emerald-700 text-white" },
  ];

  const cursor = tool==="pointer" ? (dragRef.current ? "grabbing" : "grab") : tool==="text" ? "text" : tool==="highlight" ? "cell" : "crosshair";
  const scaleLabel = detectedScale ? (detectedScale.scale_text || `${detectedScale.inches_per_foot}" = 1'`) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1400px] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-shrink-0">
          <h2 className="font-bold text-slate-900 text-base">Annotate Plan</h2>
          <div className="flex items-center gap-2">
            {numPages && numPages>1 && <span className="text-sm text-slate-500">Page {pageNumber}/{numPages}</span>}
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 h-8 text-sm">Save</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>onOpenChange(false)}><X className="w-4 h-4"/></Button>
          </div>
        </div>

        {/* Scale bar */}
        <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500"/>
            <span className="text-xs font-semibold text-slate-600">Detected Scale:</span>
            {detectingScale ? <span className="text-xs text-slate-400 animate-pulse">Analyzing plan...</span>
              : scaleLabel ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{scaleLabel}</span>
              : <span className="text-xs text-slate-400">Not detected</span>}
            <button onClick={()=>setShowScaleOverride(v=>!v)} className="text-xs text-amber-600 hover:underline">Override</button>
          </div>
          {showScaleOverride && (
            <div className="flex items-center gap-2">
              <Input value={manualScaleInput} onChange={e=>setManualScaleInput(e.target.value)} placeholder='e.g. 1/4' className="h-7 w-20 text-xs"/>
              <span className="text-xs text-slate-500">inches/foot</span>
              <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={applyManualScale}>Apply</Button>
            </div>
          )}
          {!pxPerFtNat && !detectingScale && <span className="text-xs text-amber-600">Use Calibrate tool to enable measurements</span>}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-white flex-wrap flex-shrink-0">
          {toolConfig.map(({key, label, icon:Icon, cls}) => (
            <Button key={key}
              size="sm"
              variant={tool===key ? "default" : "outline"}
              onClick={()=>{ setTool(key); setTextInput(null); setMeasureStart(null); setCalibStart(null); setDeletePopup(null); dragRef.current=null; if(key!=="trace"){setTracePoints([]);setTracePreview(null);} }}
              className={`h-8 text-xs gap-1 ${tool===key ? cls : "text-slate-700"}`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </Button>
          ))}
          <div className="border-l h-5 mx-1"/>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={()=>{const pa=annList.filter(a=>a.page===pageNumber);if(!pa.length)return;const last=pa[pa.length-1];setAnnList(p=>p.filter(a=>a!==last));}}><Undo2 className="w-3.5 h-3.5 mr-1"/>Undo</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={()=>setAnnList(p=>p.filter(a=>a.page!==pageNumber))}>Clear Page</Button>
          {tool==="highlight" ? (
            <div className="flex items-center gap-1 ml-1 flex-wrap">
              {HIGHLIGHT_COLORS.map(hc=>(
                <button key={hc.label} onClick={()=>setHighlightColor(hc.color)} title={hc.label}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                  style={{background:hc.hex, borderColor:highlightColor===hc.color?hc.color:"#e2e8f0", color:hc.color, boxShadow:highlightColor===hc.color?`0 0 0 2px ${hc.color}`:"none"}}>
                  {hc.label}
                </button>
              ))}
              <input type="color" value={highlightColor} onChange={e=>setHighlightColor(e.target.value)} title="Custom" className="w-6 h-6 rounded border cursor-pointer"/>
            </div>
          ) : !["pointer","eraser","measure","calibrate"].includes(tool) ? (
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer ml-1"/>
          ) : null}
          <div className="border-l h-5 mx-1"/>
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.max(0.3,s-0.15))}><ZoomOut className="w-4 h-4"/></Button>
          <span className="text-xs text-slate-600 w-9 text-center">{Math.round(scale*100)}%</span>
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.min(3,s+0.15))}><ZoomIn className="w-4 h-4"/></Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fitToPage}><Maximize2 className="w-3.5 h-3.5 mr-1"/>Fit</Button>
        </div>

        {/* Tool hint */}
        {tool==="pointer"   && <div className="px-4 py-1.5 bg-slate-50 border-b text-xs text-slate-600 font-medium flex-shrink-0">Click to select • Drag to move • Click selected to delete</div>}
        {tool==="measure"   && <div className="px-4 py-1.5 bg-orange-50 border-b text-xs text-orange-700 font-medium flex-shrink-0">{!measureStart?"Click first point":"Click second point"}</div>}
        {tool==="calibrate" && <div className="px-4 py-1.5 bg-violet-50 border-b text-xs text-violet-700 font-medium flex-shrink-0">{!calibStart?"Click first point on scale bar":"Click second point"}</div>}
        {tool==="trace"     && <div className="px-4 py-1.5 bg-emerald-50 border-b text-xs text-emerald-700 font-medium flex-shrink-0 flex items-center gap-3">
          <span>{tracePoints.length===0?"Click corners of the room perimeter":tracePoints.length<3?`${tracePoints.length} points — keep clicking corners`:`${tracePoints.length} points — click near first point (●) to close`}</span>
          {tracePoints.length>=3&&<button onClick={()=>{setPendingRoom({points:tracePoints,page:pageNumber});setTracePoints([]);setTracePreview(null);}} className="text-emerald-700 font-bold underline">Close Shape</button>}
          {tracePoints.length>0&&<button onClick={()=>{setTracePoints([]);setTracePreview(null);}} className="text-red-500 font-medium">Cancel</button>}
        </div>}

        {/* Main */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-slate-200" ref={scrollRef}>
            {showNotesField && (
              <div className="p-3 border-b bg-white">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes for AI</label>
                <textarea value={aiNotes} onChange={e=>setAiNotes(e.target.value)} className="w-full border rounded p-2 text-sm resize-none h-12 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Notes about the plan..."/>
              </div>
            )}
            <div className="flex items-start justify-center min-h-full p-6">
              <div className="relative inline-block shadow-xl" ref={pageContainerRef}>
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="flex items-center justify-center p-20 text-slate-500 bg-white">Loading PDF...</div>}>
                  <Page pageNumber={pageNumber} scale={scale} rotate={rotation} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={onPageLoadSuccess}/>
                </Document>

                {/* Canvas: buffer = natural size, CSS = display size — this is the key to drift-free annotations */}
                <canvas
                  ref={canvasRef}
                  width={naturalSize.w}
                  height={naturalSize.h}
                  style={{
                    position:"absolute", top:0, left:0,
                    width: displaySize.w + "px",
                    height: displaySize.h + "px",
                    cursor, touchAction:"none"
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={e=>{ if(!["measure","calibrate","pointer"].includes(tool)) handlePointerUp(e); }}
                />

                {/* Text input (positioned in CSS px) */}
                {textInput && (
                  <input autoFocus type="text" value={textValue}
                    onChange={e=>setTextValue(e.target.value)}
                    onBlur={commitText}
                    onKeyDown={e=>{if(e.key==="Enter")commitText();if(e.key==="Escape"){setTextInput(null);setTextValue("");}}}
                    style={{position:"absolute", left:textInput.css.x, top:textInput.css.y-20, color, background:"rgba(255,255,255,0.95)", border:`2px solid ${color}`, borderRadius:4, padding:"2px 6px", fontSize:13, fontWeight:"bold", minWidth:100, outline:"none", zIndex:20}}
                    placeholder="Type & Enter"
                  />
                )}

                {/* Delete popup (positioned in CSS px) */}
                {deletePopup && (
                  <div style={{position:"absolute", left:deletePopup.cssX+8, top:Math.max(4,deletePopup.cssY-38), zIndex:30}}
                    className="flex items-center gap-1 bg-white border border-slate-300 shadow-xl rounded-lg px-2 py-1.5">
                    <span className="text-xs text-slate-600 font-medium">Delete?</span>
                    <button onClick={()=>{
                      if(deletePopup.kind==="ann") setAnnList(p=>p.filter((_,i)=>i!==deletePopup.idx));
                      else setMeasurements(p=>p.filter((_,i)=>i!==deletePopup.idx));
                      setDeletePopup(null); setSelectedAnn(null);
                    }} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5 flex items-center gap-1">
                      <Trash2 className="w-3 h-3"/> Yes
                    </button>
                    <button onClick={()=>setDeletePopup(null)} className="text-xs text-slate-400 hover:text-slate-700 px-1">✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mozaik Rooms Sidebar */}
          {tracedRooms.length > 0 && (
            <div className="w-52 border-l bg-white flex flex-col overflow-hidden flex-shrink-0">
              <div className="px-3 py-2 border-b bg-emerald-50 flex-shrink-0">
                <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5"/>Mozaik Rooms ({tracedRooms.length})
                </h3>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {tracedRooms.map((room, ri) => {
                  const totalFt = (room.walls||[]).reduce((s,w)=>s+(w.lengthIn||0)/12,0);
                  return (
                    <div key={ri} className="p-2 rounded-lg border border-emerald-200 bg-emerald-50">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-emerald-800 truncate">{room.name||`Room ${ri+1}`}</p>
                          <p className="text-xs text-emerald-600">{totalFt.toFixed(1)} LF perimeter</p>
                          <p className="text-xs text-emerald-500">{room.points.length} walls</p>
                        </div>
                        <button onClick={()=>setTracedRooms(p=>p.filter((_,i)=>i!==ri))} className="flex-shrink-0 text-slate-300 hover:text-red-500 mt-0.5"><X className="w-3 h-3"/></button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={()=>setEditingRoom(room)} className="flex-1 text-xs bg-emerald-600 text-white rounded px-2 py-1 hover:bg-emerald-700 flex items-center justify-center gap-1">
                          <Download className="w-3 h-3"/>Export
                        </button>
                        <button onClick={()=>setEditingRoom(room)} className="text-xs border border-emerald-300 text-emerald-700 rounded px-2 py-1 hover:bg-emerald-100">Edit</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sidebar */}
          {(measurements.length>0 || annList.some(a=>a.type==="text")) && (
            <div className="w-56 border-l bg-white flex flex-col overflow-hidden flex-shrink-0">
              {measurements.length>0 && (<>
                <div className="px-3 py-2 border-b bg-slate-50 flex-shrink-0">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-red-500"/>Measurements ({measurements.length})</h3>
                </div>
                <div className="overflow-y-auto p-2 space-y-2 max-h-64">
                  {measurements.map((m,idx)=>(
                    <div key={m.id||idx} className={`p-2 rounded-lg border ${selectedAnn?.kind==="measurement"&&selectedAnn.idx===idx?"border-blue-400 bg-blue-50":"border-red-200 bg-red-50"}`}>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <input type="number" step="0.1" value={m.realFeet!=null?m.realFeet:""}
                          onChange={e=>setMeasurements(p=>p.map((x,i)=>i===idx?{...x,realFeet:parseFloat(e.target.value)||null}:x))}
                          className="w-20 text-sm font-bold text-red-700 border border-red-200 rounded px-1 focus:outline-none bg-white" placeholder="LF"/>
                        <span className="text-xs text-red-500 font-semibold mt-1">LF</span>
                        <button onClick={()=>setMeasurements(p=>p.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-500 mt-0.5"><X className="w-3 h-3"/></button>
                      </div>
                      <input value={m.label} onChange={e=>setMeasurements(p=>p.map((x,i)=>i===idx?{...x,label:e.target.value}:x))}
                        className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none bg-white mb-1.5" placeholder="Label"/>
                      {rooms.length>0 && m.realFeet!=null && (
                        <button onClick={()=>{setSendingM(m);setSendRoomId(rooms[0]?.id||"");setSendCategory("base");}}
                          className="w-full flex items-center justify-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-2 py-1 font-medium">
                          <Send className="w-3 h-3"/> Send to Bid
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>)}
              {annList.some(a=>a.type==="text") && (<>
                <div className="px-3 py-2 border-b bg-slate-50 flex-shrink-0">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-purple-500"/>Notes ({annList.filter(a=>a.type==="text"&&a.page===pageNumber).length})</h3>
                </div>
                <div className="overflow-y-auto p-2 space-y-2 flex-1">
                  {annList.filter(a=>a.type==="text"&&a.page===pageNumber).map(ann=>{
                    const gi=annList.indexOf(ann);
                    return (
                      <div key={gi} className={`p-2 rounded-lg border ${selectedAnn?.kind==="ann"&&selectedAnn.idx===gi?"border-blue-400 bg-blue-50":"border-purple-200 bg-purple-50"}`}>
                        <div className="flex items-start gap-1">
                          <input value={ann.text} onChange={e=>setAnnList(p=>p.map((x,i)=>i===gi?{...x,text:e.target.value}:x))}
                            className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none bg-white font-medium"/>
                          <button onClick={()=>setAnnList(p=>p.filter((_,i)=>i!==gi))} className="text-slate-300 hover:text-red-500 mt-1"><X className="w-3 h-3"/></button>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <input type="color" value={ann.color} onChange={e=>setAnnList(p=>p.map((x,i)=>i===gi?{...x,color:e.target.value}:x))} className="w-5 h-5 rounded cursor-pointer border-0 p-0"/>
                          <span className="text-xs text-slate-400">p.{ann.page}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>)}
            </div>
          )}
        </div>

        {/* Page nav */}
        {numPages && numPages>1 && (
          <div className="flex items-center justify-center gap-4 py-3 border-t bg-white flex-shrink-0">
            <Button variant="outline" size="sm" onClick={()=>setPageNumber(p=>Math.max(1,p-1))} disabled={pageNumber<=1}>Previous</Button>
            <span className="text-sm text-slate-600">Page {pageNumber} of {numPages}</span>
            <Button variant="outline" size="sm" onClick={()=>setPageNumber(p=>Math.min(numPages,p+1))} disabled={pageNumber>=numPages}>Next</Button>
          </div>
        )}
      </DialogContent>

      {/* Calibration dialog */}
      {pendingCalib && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80">
            <h3 className="font-bold text-slate-900 mb-1">Calibrate Scale</h3>
            <p className="text-sm text-slate-500 mb-3">Drew a line of <span className="font-bold">{pendingCalib.pixelDistNat.toFixed(0)} natural-px</span>. What real distance is this?</p>
            <div className="flex items-center gap-2 mb-3">
              <Input value={calibKnownFeet} onChange={e=>setCalibKnownFeet(e.target.value)} placeholder="e.g. 1" type="number" step="0.1" autoFocus onKeyDown={e=>e.key==="Enter"&&applyCalibration()}/>
              <span className="text-sm text-slate-600 whitespace-nowrap">linear feet</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyCalibration} disabled={!calibKnownFeet} className="flex-1 bg-violet-600 hover:bg-violet-700">Calibrate</Button>
              <Button variant="outline" onClick={()=>{setPendingCalib(null);setCalibKnownFeet("");}}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Send to bid dialog */}
      {sendingM && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80">
            <h3 className="font-bold text-slate-900 mb-1">Send to Bid</h3>
            <p className="text-sm text-slate-600 mb-3">{sendingM.label} — <span className="font-bold text-emerald-700">{sendingM.realFeet?.toFixed(2)} LF</span></p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Room</label>
                <Select value={sendRoomId} onValueChange={setSendRoomId}>
                  <SelectTrigger><SelectValue placeholder="Select room"/></SelectTrigger>
                  <SelectContent>{rooms.map(r=><SelectItem key={r.id} value={r.id}>{r.room_name||"Unnamed Room"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Cabinet Category</label>
                <Select value={sendCategory} onValueChange={setSendCategory}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base Cabinets</SelectItem>
                    <SelectItem value="upper">Upper / Wall Cabinets</SelectItem>
                    <SelectItem value="tall">Tall Cabinets</SelectItem>
                    <SelectItem value="misc">Misc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>{onAddToRoom&&onAddToRoom(sendRoomId,sendCategory,sendingM.realFeet,sendingM.label);setSendingM(null);}} disabled={!sendRoomId} className="flex-1 bg-amber-600 hover:bg-amber-700">Add to Bid</Button>
              <Button variant="outline" onClick={()=>setSendingM(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}