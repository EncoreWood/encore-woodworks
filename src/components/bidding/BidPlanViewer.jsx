import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ZoomIn, ZoomOut, Maximize2, Ruler, Sparkles, X, Pencil, Eraser,
  ArrowRight, Minus, Type, Highlighter, Undo2, Trash2, Target, Send, MousePointer2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const HIGHLIGHT_COLORS = [
  { label: "Base",     color: "#d97706", hex: "rgba(217,119,6,0.28)" },
  { label: "Upper",    color: "#3b82f6", hex: "rgba(59,130,246,0.28)" },
  { label: "Tall",     color: "#ef4444", hex: "rgba(239,68,68,0.28)" },
  { label: "Misc",     color: "#6b7280", hex: "rgba(107,114,128,0.35)" },
  { label: "Green",    color: "#16a34a", hex: "rgba(22,163,74,0.28)" },
  { label: "Purple",   color: "#9333ea", hex: "rgba(147,51,234,0.28)" },
  { label: "Pink",     color: "#db2777", hex: "rgba(219,39,119,0.28)" },
  { label: "Teal",     color: "#0891b2", hex: "rgba(8,145,178,0.28)" },
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

// ─── coordinate helpers ────────────────────────────────────────────────────
// All committed annotations store plan-relative coords: rx/ry ∈ [0,1].
// "old" annotations (no rx field) are treated as fixed screen pixels (legacy).

function makeToRel(w, h) {
  return (pos) => ({ rx: pos.x / w, ry: pos.y / h });
}
function makeToScr(w, h) {
  return (rel) => ({ x: rel.rx * w, y: rel.ry * h });
}
// Works for both new {rx,ry} and legacy {x,y} points
function ptToScr(pt, w, h) {
  if (pt.rx !== undefined) return { x: pt.rx * w, y: pt.ry * h };
  return { x: pt.x, y: pt.y };
}

export default function BidPlanViewer({ open, onOpenChange, pdfUrl, annotations = [], onSave, showNotesField = false, initialNotes = "", rooms = [], onAddToRoom }) {
  if (!pdfUrl) return null;

  // PDF state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [naturalPageWidth, setNaturalPageWidth] = useState(null);
  const [autoFitted, setAutoFitted] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });

  // Annotation state
  const [tool, setTool] = useState("pointer");
  const [color, setColor] = useState("#e53e3e");
  const [highlightColor, setHighlightColor] = useState("#d97706");
  const [annList, setAnnList] = useState([]);
  const [currentPath, setCurrentPath] = useState([]); // screen coords (transient)
  const [currentLine, setCurrentLine] = useState(null); // screen coords (transient)
  const [textInput, setTextInput] = useState(null); // screen coords
  const [textValue, setTextValue] = useState("");
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [aiNotes, setAiNotes] = useState(initialNotes);

  // Scale / calibration state
  const [detectedScale, setDetectedScale] = useState(null);
  const [detectingScale, setDetectingScale] = useState(false);
  const [pxPerFtAtScale1, setPxPerFtAtScale1] = useState(null);
  const [manualScaleInput, setManualScaleInput] = useState("");
  const [showScaleOverride, setShowScaleOverride] = useState(false);

  // Measure state (screen coords — transient)
  const [measureStart, setMeasureStart] = useState(null);
  const [measurePreview, setMeasurePreview] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  // Calibrate state (screen coords — transient)
  const [calibStart, setCalibStart] = useState(null);
  const [calibPreview, setCalibPreview] = useState(null);
  const [pendingCalib, setPendingCalib] = useState(null);
  const [calibKnownFeet, setCalibKnownFeet] = useState("");

  // Pointer/select state
  const [selectedAnn, setSelectedAnn] = useState(null); // { kind, idx }
  const [showDeletePopup, setShowDeletePopup] = useState(null); // { x, y, kind, idx }
  const dragRef = useRef(null); // { kind, idx, lastPos }

  // Send to bid state
  const [sendingM, setSendingM] = useState(null);
  const [sendRoomId, setSendRoomId] = useState("");
  const [sendCategory, setSendCategory] = useState("base");

  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const scrollRef = useRef(null);
  const scaleDetectedRef = useRef(false);

  // Derived coord helpers (capture current canvas size)
  const toRel = useCallback((pos) => makeToRel(canvasSize.width, canvasSize.height)(pos), [canvasSize]);
  const toScr = useCallback((rel) => makeToScr(canvasSize.width, canvasSize.height)(rel), [canvasSize]);
  const pToScr = useCallback((pt) => ptToScr(pt, canvasSize.width, canvasSize.height), [canvasSize]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setAnnList(annotations.filter(a => a.type !== "measurement"));
      setMeasurements(annotations.filter(a => a.type === "measurement"));
      setAiNotes(initialNotes);
      setAutoFitted(false);
      setNaturalPageWidth(null);
      setPageNumber(1);
      setTool("pointer");
      setMeasureStart(null);
      setCalibStart(null);
      setSelectedAnn(null);
      setShowDeletePopup(null);
    }
  }, [open]);

  // Auto-fit
  useEffect(() => {
    if (naturalPageWidth && !autoFitted && scrollRef.current) {
      const w = scrollRef.current.clientWidth - 64;
      setScale(Math.min(Math.max(w / naturalPageWidth, 0.3), 3.0));
      setAutoFitted(true);
    }
  }, [naturalPageWidth, autoFitted]);

  // AI scale detection
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
        prompt: `Look at this architectural floor plan. Find the scale indicator (scale bar or written scale like "1/4\" = 1'-0\""). Return inches_per_foot (for "1/4\" = 1'-0\"" return 0.25, for "1/8\" = 1'" return 0.125) and the exact scale_text as shown. If unclear, return 0.25 with a note.`,
        file_urls: [pdfUrl],
        response_json_schema: { type: "object", properties: { inches_per_foot: { type: "number" }, scale_text: { type: "string" }, confidence: { type: "string" } } }
      });
      if (result.inches_per_foot > 0) {
        setDetectedScale(result);
        setPxPerFtAtScale1(result.inches_per_foot * 72);
      }
    } catch (_) {}
    setDetectingScale(false);
  };

  const applyManualScale = () => {
    const val = manualScaleInput.trim();
    let ipf = val.includes("/") ? (() => { const [n,d] = val.split("/").map(Number); return n&&d ? n/d : null; })() : parseFloat(val);
    if (ipf > 0) { setPxPerFtAtScale1(ipf * 72); setDetectedScale({ inches_per_foot: ipf, scale_text: `${val}" = 1'`, confidence: "manual" }); }
    setShowScaleOverride(false); setManualScaleInput("");
  };

  const fitToPage = useCallback(() => {
    if (!scrollRef.current || !naturalPageWidth) return;
    const w = scrollRef.current.clientWidth - 64;
    setScale(Math.min(Math.max(w / naturalPageWidth, 0.3), 3.0));
  }, [naturalPageWidth]);

  const syncCanvasSize = () => {
    const el = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
    if (el) setCanvasSize({ width: el.offsetWidth, height: el.offsetHeight });
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
  const onPageLoadSuccess = () => {
    setTimeout(() => {
      const el = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
      if (el) setNaturalPageWidth(el.offsetWidth / scale);
      syncCanvasSize();
    }, 80);
  };

  useEffect(() => { setTimeout(syncCanvasSize, 100); }, [scale, rotation, pageNumber]);

  const getPos = (e) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 };
  };

  const computeRealFeet = (p1, p2) => {
    if (!pxPerFtAtScale1) return null;
    return (Math.hypot(p2.x - p1.x, p2.y - p1.y) / scale) / pxPerFtAtScale1;
  };

  // ── Hit-test (works in current screen space) ──────────────────────────────
  const hitTestAnnotations = (pos) => {
    const T = 14;
    const W = canvasSize.width, H = canvasSize.height;

    // Measurements
    for (let i = measurements.length - 1; i >= 0; i--) {
      const m = measurements[i];
      if (m.page !== pageNumber) continue;
      const s = ptToScr(m.start, W, H), en = ptToScr(m.end, W, H);
      const midX = (s.x + en.x) / 2, midY = (s.y + en.y) / 2;
      if (Math.hypot(pos.x - midX, pos.y - midY) < 24) return { kind: "measurement", idx: i };
      if (Math.hypot(pos.x - s.x, pos.y - s.y) < T) return { kind: "measurement", idx: i };
      if (Math.hypot(pos.x - en.x, pos.y - en.y) < T) return { kind: "measurement", idx: i };
    }
    // Annotations (reverse = top-first)
    const pageAnns = annList.map((a, i) => ({ a, i })).filter(({ a }) => a.page === pageNumber);
    for (let j = pageAnns.length - 1; j >= 0; j--) {
      const { a, i } = pageAnns[j];
      if (a.type === "highlight") {
        const ox = ptToScr({ rx: a.rx, ry: a.ry }, W, H);
        const sw = a.rw * W, sh = a.rh * H;
        if (pos.x >= ox.x && pos.x <= ox.x + sw && pos.y >= ox.y && pos.y <= ox.y + sh) return { kind: "ann", idx: i };
        // legacy
        if (a.x !== undefined && pos.x >= a.x && pos.x <= a.x + a.w && pos.y >= a.y && pos.y <= a.y + a.h) return { kind: "ann", idx: i };
      } else if (a.type === "text") {
        const tp = ptToScr(a.rx !== undefined ? { rx: a.rx, ry: a.ry } : { rx: a.x / W, ry: a.y / H }, W, H);
        if (Math.hypot(pos.x - tp.x, pos.y - tp.y) < 32) return { kind: "ann", idx: i };
      } else if (a.type === "pen") {
        const pts = a.rpoints ? a.rpoints.map(p => ptToScr(p, W, H)) : (a.points || []);
        if (pts.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < T)) return { kind: "ann", idx: i };
      } else if (a.type === "arrow" || a.type === "line") {
        const s2 = ptToScr(a.rstart || (a.start?.rx !== undefined ? a.start : { rx: a.start.x / W, ry: a.start.y / H }), W, H);
        const e2 = ptToScr(a.rend   || (a.end?.rx   !== undefined ? a.end   : { rx: a.end.x   / W, ry: a.end.y   / H }), W, H);
        if (Math.hypot(pos.x - s2.x, pos.y - s2.y) < T || Math.hypot(pos.x - e2.x, pos.y - e2.y) < T) return { kind: "ann", idx: i };
      }
    }
    return null;
  };

  // ── Translate annotation by screen-space delta ────────────────────────────
  const translateAnn = (ann, dx, dy) => {
    const W = canvasSize.width, H = canvasSize.height;
    const drx = dx / W, dry = dy / H;
    if (ann.type === "pen") {
      if (ann.rpoints) return { ...ann, rpoints: ann.rpoints.map(p => ({ rx: p.rx + drx, ry: p.ry + dry })) };
      return { ...ann, points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
    }
    if (ann.type === "highlight") {
      if (ann.rx !== undefined) return { ...ann, rx: ann.rx + drx, ry: ann.ry + dry };
      return { ...ann, x: ann.x + dx, y: ann.y + dy };
    }
    if (ann.type === "text") {
      if (ann.rx !== undefined) return { ...ann, rx: ann.rx + drx, ry: ann.ry + dry };
      return { ...ann, x: ann.x + dx, y: ann.y + dy };
    }
    if (ann.type === "arrow" || ann.type === "line") {
      if (ann.rstart) return { ...ann, rstart: { rx: ann.rstart.rx + drx, ry: ann.rstart.ry + dry }, rend: { rx: ann.rend.rx + drx, ry: ann.rend.ry + dry } };
      return { ...ann, start: { x: ann.start.x + dx, y: ann.start.y + dy }, end: { x: ann.end.x + dx, y: ann.end.y + dy } };
    }
    return ann;
  };

  const translateMeasurement = (m, dx, dy) => {
    const W = canvasSize.width, H = canvasSize.height;
    const drx = dx / W, dry = dy / H;
    if (m.start?.rx !== undefined) {
      return { ...m, start: { rx: m.start.rx + drx, ry: m.start.ry + dry }, end: { rx: m.end.rx + drx, ry: m.end.ry + dry } };
    }
    return { ...m, start: { x: m.start.x + dx, y: m.start.y + dy }, end: { x: m.end.x + dx, y: m.end.y + dy } };
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);

    if (tool === "pointer") {
      const hit = hitTestAnnotations(pos);
      if (hit) {
        setSelectedAnn(hit);
        dragRef.current = { ...hit, lastPos: pos, moved: false };
        setShowDeletePopup(null);
      } else {
        setSelectedAnn(null);
        setShowDeletePopup(null);
        dragRef.current = null;
      }
      return;
    }

    setShowDeletePopup(null);
    setSelectedAnn(null);

    if (tool === "measure") {
      if (!measureStart) { setMeasureStart(pos); }
      else {
        const realFeet = computeRealFeet(measureStart, pos);
        // Store start/end in relative coords
        const newM = {
          type: "measurement",
          start: toRel(measureStart),
          end: toRel(pos),
          realFeet,
          page: pageNumber,
          id: `m_${Date.now()}`,
          label: `Measurement ${measurements.length + 1}`
        };
        setMeasurements(p => [...p, newM]);
        setMeasureStart(null);
        setMeasurePreview(null);
      }
      return;
    }
    if (tool === "calibrate") {
      if (!calibStart) { setCalibStart(pos); }
      else {
        const dist = Math.hypot(pos.x - calibStart.x, pos.y - calibStart.y);
        setPendingCalib({ start: calibStart, end: pos, pixelDist: dist });
        setCalibStart(null); setCalibPreview(null);
      }
      return;
    }
    if (tool === "pen") { setIsPointerDown(true); setCurrentPath([pos]); }
    else if (tool === "eraser") { setIsPointerDown(true); eraseAt(pos); }
    else if (["arrow","line","highlight"].includes(tool)) { setIsPointerDown(true); setCurrentLine({ start: pos, end: pos }); }
    else if (tool === "text") { setTextInput(pos); setTextValue(""); }
  };

  const handlePointerMove = (e) => {
    const pos = getPos(e);

    // Drag selected annotation
    if (tool === "pointer" && dragRef.current) {
      const { kind, idx, lastPos } = dragRef.current;
      const dx = pos.x - lastPos.x, dy = pos.y - lastPos.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        dragRef.current.moved = true;
        dragRef.current.lastPos = pos;
        if (kind === "ann") setAnnList(p => p.map((a, i) => i === idx ? translateAnn(a, dx, dy) : a));
        else setMeasurements(p => p.map((m, i) => i === idx ? translateMeasurement(m, dx, dy) : m));
      }
      return;
    }

    if (tool === "measure" && measureStart) { setMeasurePreview(pos); return; }
    if (tool === "calibrate" && calibStart) { setCalibPreview(pos); return; }
    if (!isPointerDown) return;
    e.preventDefault();
    if (tool === "pen") setCurrentPath(p => [...p, pos]);
    else if (tool === "eraser") eraseAt(pos);
    else if (["arrow","line","highlight"].includes(tool)) setCurrentLine(p => p ? { ...p, end: pos } : null);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    const pos = getPos(e);

    // Pointer tool: if no drag, show delete popup
    if (tool === "pointer") {
      if (dragRef.current && !dragRef.current.moved && selectedAnn) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setShowDeletePopup({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top, ...selectedAnn });
      }
      dragRef.current = null;
      return;
    }

    // Store in relative coords
    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(p => [...p, { type: "pen", rpoints: currentPath.map(pt => toRel(pt)), color, page: pageNumber }]);
      setCurrentPath([]);
    } else if ((tool === "arrow" || tool === "line") && currentLine) {
      if (Math.hypot(pos.x - currentLine.start.x, pos.y - currentLine.start.y) > 5)
        setAnnList(p => [...p, { type: tool, rstart: toRel(currentLine.start), rend: toRel(pos), color, page: pageNumber }]);
      setCurrentLine(null);
    } else if (tool === "highlight" && currentLine) {
      const w = Math.abs(pos.x - currentLine.start.x), h = Math.abs(pos.y - currentLine.start.y);
      if (w > 5 && h > 5) {
        const origin = { x: Math.min(currentLine.start.x, pos.x), y: Math.min(currentLine.start.y, pos.y) };
        setAnnList(p => [...p, {
          type: "highlight",
          rx: origin.x / canvasSize.width, ry: origin.y / canvasSize.height,
          rw: w / canvasSize.width, rh: h / canvasSize.height,
          color: highlightColor, page: pageNumber
        }]);
      }
      setCurrentLine(null);
    }
    setIsPointerDown(false);
  };

  const eraseAt = ({ x, y }) => {
    const t = 18, W = canvasSize.width, H = canvasSize.height;
    setAnnList(p => p.filter(a => {
      if (a.page !== pageNumber) return true;
      if (a.type === "highlight") {
        const ox = a.rx !== undefined ? a.rx * W : a.x;
        const oy = a.rx !== undefined ? a.ry * H : a.y;
        const sw = a.rw !== undefined ? a.rw * W : a.w;
        const sh = a.rh !== undefined ? a.rh * H : a.h;
        return !(x >= ox && x <= ox + sw && y >= oy && y <= oy + sh);
      }
      if (a.type === "pen") {
        const pts = a.rpoints ? a.rpoints.map(p => ptToScr(p, W, H)) : a.points;
        return !pts.some(pt => Math.hypot(pt.x - x, pt.y - y) < t);
      }
      if (a.type === "arrow" || a.type === "line") {
        const s = ptToScr(a.rstart || a.start, W, H), en = ptToScr(a.rend || a.end, W, H);
        return Math.hypot(s.x - x, s.y - y) >= t && Math.hypot(en.x - x, en.y - y) >= t;
      }
      if (a.type === "text") {
        const tp = a.rx !== undefined ? ptToScr({ rx: a.rx, ry: a.ry }, W, H) : { x: a.x, y: a.y };
        return Math.hypot(tp.x - x, tp.y - y) >= t * 2;
      }
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim())
      setAnnList(p => [...p, { type: "text", rx: textInput.x / canvasSize.width, ry: textInput.y / canvasSize.height, text: textValue.trim(), color, page: pageNumber }]);
    setTextInput(null); setTextValue("");
  };

  const applyCalibration = () => {
    if (!pendingCalib || !calibKnownFeet) return;
    const ft = parseFloat(calibKnownFeet);
    if (ft <= 0) return;
    const newPxPerFt = (pendingCalib.pixelDist / scale) / ft;
    setPxPerFtAtScale1(newPxPerFt);
    setDetectedScale({ inches_per_foot: newPxPerFt / 72, scale_text: `Calibrated (${calibKnownFeet} ft = drawn line)`, confidence: "manual" });
    setPendingCalib(null); setCalibKnownFeet("");
  };

  const handleSave = () => { onSave([...annList, ...measurements], aiNotes); onOpenChange(false); };

  // ── Canvas render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvasSize.width, H = canvasSize.height;

    annList.filter(a => a.page === pageNumber).forEach((ann, listIdx) => {
      const isSelected = selectedAnn?.kind === "ann" && annList.indexOf(ann) === selectedAnn.idx;
      ctx.strokeStyle = ann.color; ctx.fillStyle = ann.color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";

      if (ann.type === "highlight") {
        const ox = ann.rx !== undefined ? ann.rx * W : ann.x;
        const oy = ann.rx !== undefined ? ann.ry * H : ann.y;
        const sw = ann.rw !== undefined ? ann.rw * W : ann.w;
        const sh = ann.rh !== undefined ? ann.rh * H : ann.h;
        const [r,g,b] = [parseInt(ann.color.slice(1,3),16),parseInt(ann.color.slice(3,5),16),parseInt(ann.color.slice(5,7),16)];
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`; ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.fillRect(ox,oy,sw,sh); ctx.strokeRect(ox,oy,sw,sh);
        if (isSelected) { ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2.5; ctx.strokeRect(ox-2,oy-2,sw+4,sh+4); }
        const lbl = HIGHLIGHT_COLORS.find(c => c.color === ann.color)?.label;
        if (lbl) { ctx.font="bold 10px sans-serif"; ctx.fillStyle=`rgba(${r},${g},${b},1)`; ctx.fillText(lbl, ox+3, oy+12); }

      } else if (ann.type === "pen") {
        const pts = ann.rpoints ? ann.rpoints.map(p => ptToScr(p, W, H)) : ann.points;
        ctx.strokeStyle = isSelected ? "#3b82f6" : ann.color;
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.beginPath(); pts.forEach((pt,i) => i===0 ? ctx.moveTo(pt.x,pt.y) : ctx.lineTo(pt.x,pt.y)); ctx.stroke();

      } else if (ann.type === "arrow" || ann.type === "line") {
        const s = ptToScr(ann.rstart || ann.start, W, H);
        const en = ptToScr(ann.rend || ann.end, W, H);
        ctx.strokeStyle = isSelected ? "#3b82f6" : ann.color;
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        drawArrow(ctx, s, en, ann.type === "arrow");
        if (isSelected) { ctx.fillStyle = "#3b82f6"; [s,en].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();}); }

      } else if (ann.type === "text") {
        const tp = ann.rx !== undefined ? ptToScr({ rx: ann.rx, ry: ann.ry }, W, H) : { x: ann.x, y: ann.y };
        ctx.font="bold 13px sans-serif"; const m=ctx.measureText(ann.text);
        if (isSelected) { ctx.fillStyle="rgba(59,130,246,0.15)"; ctx.fillRect(tp.x-5,tp.y-18,m.width+10,23); ctx.strokeStyle="#3b82f6"; ctx.lineWidth=1.5; ctx.strokeRect(tp.x-5,tp.y-18,m.width+10,23); }
        else { ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fillRect(tp.x-3,tp.y-15,m.width+6,19); ctx.strokeStyle=ann.color; ctx.lineWidth=1; ctx.strokeRect(tp.x-3,tp.y-15,m.width+6,19); }
        ctx.fillStyle=isSelected?"#1d4ed8":ann.color; ctx.fillText(ann.text,tp.x,tp.y);
      }
    });

    // Saved measurements
    measurements.filter(m => m.page === pageNumber).forEach((m, idx) => {
      const isSelected = selectedAnn?.kind === "measurement" && selectedAnn.idx === idx;
      const s = ptToScr(m.start, W, H), en = ptToScr(m.end, W, H);
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#ef4444";
      ctx.fillStyle = isSelected ? "#3b82f6" : "#ef4444";
      ctx.lineWidth = isSelected ? 3 : 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(en.x,en.y); ctx.stroke();
      [s,en].forEach(pt => { ctx.beginPath(); ctx.arc(pt.x,pt.y,4,0,Math.PI*2); ctx.fill(); });
      const mx=(s.x+en.x)/2, my=(s.y+en.y)/2;
      const lbl=m.realFeet!=null?`${m.realFeet.toFixed(1)} LF`:"?";
      ctx.font="bold 11px sans-serif"; const tm=ctx.measureText(lbl);
      ctx.fillStyle = isSelected ? "rgba(59,130,246,0.95)" : "rgba(239,68,68,0.92)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(mx-tm.width/2-5,my-15,tm.width+10,19,4);
      else ctx.rect(mx-tm.width/2-5,my-15,tm.width+10,19);
      ctx.fill();
      ctx.fillStyle="white"; ctx.fillText(lbl,mx-tm.width/2,my);
    });

    // Active measure preview
    if (tool==="measure" && measureStart) {
      ctx.fillStyle="#f59e0b"; ctx.beginPath(); ctx.arc(measureStart.x,measureStart.y,6,0,Math.PI*2); ctx.fill();
      if (measurePreview) {
        ctx.strokeStyle="#f59e0b"; ctx.lineWidth=2; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.moveTo(measureStart.x,measureStart.y); ctx.lineTo(measurePreview.x,measurePreview.y); ctx.stroke(); ctx.setLineDash([]);
        const rf = computeRealFeet(measureStart, measurePreview);
        if (rf!=null) {
          const mx2=(measureStart.x+measurePreview.x)/2, my2=(measureStart.y+measurePreview.y)/2, ltxt=`${rf.toFixed(1)} LF`;
          ctx.font="bold 12px sans-serif"; const m2=ctx.measureText(ltxt);
          ctx.fillStyle="rgba(245,158,11,0.95)"; ctx.fillRect(mx2-m2.width/2-4,my2-15,m2.width+8,18);
          ctx.fillStyle="white"; ctx.fillText(ltxt,mx2-m2.width/2,my2);
        }
      }
    }

    // Active calibrate preview
    if (tool==="calibrate" && calibStart) {
      ctx.fillStyle="#8b5cf6"; ctx.beginPath(); ctx.arc(calibStart.x,calibStart.y,6,0,Math.PI*2); ctx.fill();
      if (calibPreview) {
        ctx.strokeStyle="#8b5cf6"; ctx.lineWidth=2; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.moveTo(calibStart.x,calibStart.y); ctx.lineTo(calibPreview.x,calibPreview.y); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // Transient previews (screen space — no conversion needed)
    if (currentPath.length > 1) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); currentPath.forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y)); ctx.stroke(); }
    if (currentLine && (tool==="arrow"||tool==="line")) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; drawArrow(ctx,currentLine.start,currentLine.end,tool==="arrow"); }
    if (currentLine && tool==="highlight") {
      const [r2,g2,b2]=[parseInt(highlightColor.slice(1,3),16),parseInt(highlightColor.slice(3,5),16),parseInt(highlightColor.slice(5,7),16)];
      const x=Math.min(currentLine.start.x,currentLine.end.x), y=Math.min(currentLine.start.y,currentLine.end.y), w=Math.abs(currentLine.end.x-currentLine.start.x), h=Math.abs(currentLine.end.y-currentLine.start.y);
      ctx.fillStyle=`rgba(${r2},${g2},${b2},0.35)`; ctx.strokeStyle=`rgba(${r2},${g2},${b2},0.8)`; ctx.lineWidth=1.5;
      ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
    }
  }, [annList, measurements, currentPath, currentLine, pageNumber, color, highlightColor, canvasSize, tool, measureStart, measurePreview, calibStart, calibPreview, selectedAnn]);

  // ── Toolbar config ─────────────────────────────────────────────────────────
  const toolConfig = [
    { key: "pointer",   label: "Select",    icon: MousePointer2, cls: "bg-slate-700 hover:bg-slate-800 text-white" },
    { key: "pen",       label: "Draw",      icon: Pencil,        cls: "bg-amber-600 hover:bg-amber-700 text-white" },
    { key: "highlight", label: "Highlight", icon: Highlighter,   cls: "bg-yellow-500 hover:bg-yellow-600 text-white" },
    { key: "arrow",     label: "Arrow",     icon: ArrowRight,    cls: "bg-blue-600 hover:bg-blue-700 text-white" },
    { key: "line",      label: "Line",      icon: Minus,         cls: "bg-green-600 hover:bg-green-700 text-white" },
    { key: "text",      label: "Text",      icon: Type,          cls: "bg-purple-600 hover:bg-purple-700 text-white" },
    { key: "eraser",    label: "Eraser",    icon: Eraser,        cls: "bg-slate-500 hover:bg-slate-600 text-white" },
    { key: "measure",   label: "Measure",   icon: Ruler,         cls: "bg-orange-500 hover:bg-orange-600 text-white" },
    { key: "calibrate", label: "Calibrate", icon: Target,        cls: "bg-violet-600 hover:bg-violet-700 text-white" },
  ];

  const cursor = tool === "pointer"
    ? (dragRef.current ? "grabbing" : "default")
    : ["measure","calibrate"].includes(tool) ? "crosshair"
    : tool === "text" ? "text"
    : tool === "highlight" ? "cell"
    : "crosshair";

  const scaleLabel = detectedScale ? (detectedScale.scale_text || `${detectedScale.inches_per_foot}" = 1'`) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1400px] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-shrink-0">
          <h2 className="font-bold text-slate-900 text-base">Annotate Plan</h2>
          <div className="flex items-center gap-2">
            {numPages && numPages > 1 && <span className="text-sm text-slate-500">Page {pageNumber}/{numPages}</span>}
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 h-8 text-sm">Save</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Scale bar */}
        <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">Detected Scale:</span>
            {detectingScale
              ? <span className="text-xs text-slate-400 animate-pulse">Analyzing plan...</span>
              : scaleLabel
                ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{scaleLabel}</span>
                : <span className="text-xs text-slate-400">Not detected</span>
            }
            <button onClick={() => setShowScaleOverride(v => !v)} className="text-xs text-amber-600 hover:underline">Override</button>
          </div>
          {showScaleOverride && (
            <div className="flex items-center gap-2">
              <Input value={manualScaleInput} onChange={e => setManualScaleInput(e.target.value)} placeholder='e.g. 1/4' className="h-7 w-20 text-xs" />
              <span className="text-xs text-slate-500">inches/foot</span>
              <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={applyManualScale}>Apply</Button>
            </div>
          )}
          {!pxPerFtAtScale1 && !detectingScale && (
            <span className="text-xs text-amber-600">Use "Calibrate" tool: draw a line over the scale bar to enable accurate measurements</span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-white flex-wrap flex-shrink-0">
          {toolConfig.map(({ key, label, icon: Icon, cls }) => (
            <Button key={key}
              variant={tool === key ? "default" : "outline"}
              size="sm"
              onClick={() => { setTool(key); setTextInput(null); setMeasureStart(null); setCalibStart(null); setShowDeletePopup(null); dragRef.current = null; }}
              className={`h-8 text-xs gap-1 ${tool === key ? cls : "text-slate-700"}`}
              title={label}>
              <Icon className="w-3.5 h-3.5" />{label}
            </Button>
          ))}
          <div className="border-l h-5 mx-1" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const pa=annList.filter(a=>a.page===pageNumber); if(!pa.length)return; const last=pa[pa.length-1]; setAnnList(p=>p.filter(a=>a!==last)); }}><Undo2 className="w-3.5 h-3.5 mr-1"/>Undo</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAnnList(p=>p.filter(a=>a.page!==pageNumber))}>Clear Page</Button>
          {tool==="highlight" ? (
            <div className="flex items-center gap-1 ml-1 flex-wrap">
              {HIGHLIGHT_COLORS.map(hc => (
                <button key={hc.label} onClick={()=>setHighlightColor(hc.color)} title={hc.label}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                  style={{ background: hc.hex, borderColor: highlightColor===hc.color?hc.color:"#e2e8f0", color: hc.color, boxShadow: highlightColor===hc.color?`0 0 0 2px ${hc.color}`:"none" }}>
                  {hc.label}
                </button>
              ))}
              <input type="color" value={highlightColor} onChange={e=>setHighlightColor(e.target.value)} title="Custom color" className="w-6 h-6 rounded border cursor-pointer" />
            </div>
          ) : tool !== "pointer" && tool !== "eraser" && tool !== "measure" && tool !== "calibrate" ? (
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer ml-1" />
          ) : null}
          <div className="border-l h-5 mx-1" />
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.max(0.3,s-0.15))}><ZoomOut className="w-4 h-4"/></Button>
          <span className="text-xs text-slate-600 w-9 text-center">{Math.round(scale*100)}%</span>
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.min(3,s+0.15))}><ZoomIn className="w-4 h-4"/></Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fitToPage}><Maximize2 className="w-3.5 h-3.5 mr-1"/>Fit</Button>
        </div>

        {/* Tool hints */}
        {tool==="pointer"   && <div className="px-4 py-1.5 bg-slate-50 border-b text-xs text-slate-600 font-medium flex-shrink-0">Click annotation to select • Drag to move • Click selected to delete</div>}
        {tool==="measure"   && <div className="px-4 py-1.5 bg-orange-50 border-b text-xs text-orange-700 font-medium flex-shrink-0">{!measureStart?"Click first point on the plan":"Click second point — distance will be calculated automatically"}</div>}
        {tool==="calibrate" && <div className="px-4 py-1.5 bg-violet-50 border-b text-xs text-violet-700 font-medium flex-shrink-0">{!calibStart?"Draw a line over a known-length segment on the scale bar — click first point":"Click second point to complete the calibration line"}</div>}

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF */}
          <div className="flex-1 overflow-auto bg-slate-200" ref={scrollRef}>
            {showNotesField && (
              <div className="p-3 border-b bg-white">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes for AI</label>
                <textarea value={aiNotes} onChange={e=>setAiNotes(e.target.value)} className="w-full border rounded p-2 text-sm resize-none h-12 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Notes about the plan..." />
              </div>
            )}
            <div className="flex items-start justify-center min-h-full p-6">
              <div className="relative inline-block shadow-xl" ref={pageContainerRef}>
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="flex items-center justify-center p-20 text-slate-500 bg-white">Loading PDF...</div>}>
                  <Page pageNumber={pageNumber} scale={scale} rotate={rotation} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={onPageLoadSuccess} />
                </Document>
                <canvas ref={canvasRef} className="absolute top-0 left-0" style={{ cursor, touchAction:"none" }}
                  width={canvasSize.width} height={canvasSize.height}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={e=>{ if(!["measure","calibrate","pointer"].includes(tool)) handlePointerUp(e); }}
                />
                {textInput && (
                  <input autoFocus type="text" value={textValue} onChange={e=>setTextValue(e.target.value)}
                    onBlur={commitText} onKeyDown={e=>{if(e.key==="Enter")commitText();if(e.key==="Escape"){setTextInput(null);setTextValue("");}}}
                    style={{ position:"absolute", left:textInput.x, top:textInput.y-20, color, background:"rgba(255,255,255,0.95)", border:`2px solid ${color}`, borderRadius:4, padding:"2px 6px", fontSize:13, fontWeight:"bold", minWidth:100, outline:"none", zIndex:20 }}
                    placeholder="Type note & Enter"
                  />
                )}
                {/* Delete popup */}
                {showDeletePopup && (
                  <div style={{ position:"absolute", left: showDeletePopup.x + 8, top: Math.max(4, showDeletePopup.y - 38), zIndex:30 }}
                    className="flex items-center gap-1 bg-white border border-slate-300 shadow-xl rounded-lg px-2 py-1.5">
                    <span className="text-xs text-slate-600 font-medium">Delete?</span>
                    <button
                      onClick={() => {
                        if (showDeletePopup.kind === "ann") setAnnList(p => p.filter((_,i) => i !== showDeletePopup.idx));
                        else setMeasurements(p => p.filter((_,i) => i !== showDeletePopup.idx));
                        setShowDeletePopup(null); setSelectedAnn(null);
                      }}
                      className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5 flex items-center gap-1">
                      <Trash2 className="w-3 h-3"/> Yes
                    </button>
                    <button onClick={()=>{setShowDeletePopup(null);}} className="text-xs text-slate-400 hover:text-slate-700 px-1">✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {(measurements.length > 0 || annList.some(a => a.type === "text")) && (
            <div className="w-56 border-l bg-white flex flex-col overflow-hidden flex-shrink-0">
              {measurements.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-red-500"/>Measurements ({measurements.length})</h3>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-2 max-h-64">
                    {measurements.map((m, idx) => (
                      <div key={m.id||idx} className={`p-2 rounded-lg border ${selectedAnn?.kind==="measurement" && selectedAnn.idx===idx ? "border-blue-400 bg-blue-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <input type="number" step="0.1" value={m.realFeet != null ? m.realFeet : ""}
                            onChange={e => setMeasurements(p => p.map((x,i) => i===idx ? {...x, realFeet: parseFloat(e.target.value)||null} : x))}
                            className="w-20 text-sm font-bold text-red-700 border border-red-200 rounded px-1 focus:outline-none focus:ring-1 focus:ring-red-300 bg-white" placeholder="LF" />
                          <span className="text-xs text-red-500 font-semibold mt-1">LF</span>
                          <button onClick={()=>setMeasurements(p=>p.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-500 flex-shrink-0 mt-0.5"><X className="w-3 h-3"/></button>
                        </div>
                        <input value={m.label}
                          onChange={e => setMeasurements(p => p.map((x,i) => i===idx ? {...x, label: e.target.value} : x))}
                          className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-300 bg-white mb-1.5" placeholder="Label" />
                        {rooms.length > 0 && m.realFeet != null && (
                          <button onClick={()=>{ setSendingM(m); setSendRoomId(rooms[0]?.id||""); setSendCategory("base"); }}
                            className="w-full flex items-center justify-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-2 py-1 transition-colors font-medium">
                            <Send className="w-3 h-3"/> Send to Bid
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {annList.some(a => a.type === "text") && (
                <>
                  <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-purple-500"/>Notes ({annList.filter(a=>a.type==="text" && a.page===pageNumber).length})</h3>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-2 flex-1">
                    {annList.filter(a => a.type === "text" && a.page === pageNumber).map((ann) => {
                      const globalIdx = annList.indexOf(ann);
                      return (
                        <div key={globalIdx} className={`p-2 rounded-lg border ${selectedAnn?.kind==="ann" && selectedAnn.idx===globalIdx ? "border-blue-400 bg-blue-50" : "border-purple-200 bg-purple-50"}`}>
                          <div className="flex items-start gap-1">
                            <input value={ann.text}
                              onChange={e => setAnnList(p => p.map((x,i) => i===globalIdx ? {...x, text: e.target.value} : x))}
                              className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white font-medium" />
                            <button onClick={()=>setAnnList(p=>p.filter((_,i)=>i!==globalIdx))} className="text-slate-300 hover:text-red-500 flex-shrink-0 mt-1"><X className="w-3 h-3"/></button>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <input type="color" value={ann.color} onChange={e => setAnnList(p => p.map((x,i) => i===globalIdx ? {...x, color: e.target.value} : x))} className="w-5 h-5 rounded cursor-pointer border-0 p-0" />
                            <span className="text-xs text-slate-400">p.{ann.page}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Page nav */}
        {numPages && numPages > 1 && (
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
            <p className="text-sm text-slate-500 mb-3">You drew a line of <span className="font-bold">{pendingCalib.pixelDist.toFixed(0)}px</span> at {Math.round(scale*100)}% zoom. What real-world distance does this line represent?</p>
            <div className="flex items-center gap-2 mb-3">
              <Input value={calibKnownFeet} onChange={e=>setCalibKnownFeet(e.target.value)} placeholder="e.g. 1" type="number" step="0.1" autoFocus onKeyDown={e=>e.key==="Enter"&&applyCalibration()} />
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
              <Button onClick={()=>{ onAddToRoom&&onAddToRoom(sendRoomId,sendCategory,sendingM.realFeet,sendingM.label); setSendingM(null); }} disabled={!sendRoomId} className="flex-1 bg-amber-600 hover:bg-amber-700">Add to Bid</Button>
              <Button variant="outline" onClick={()=>setSendingM(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}