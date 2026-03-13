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
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#e53e3e");
  const [highlightColor, setHighlightColor] = useState("#d97706");
  const [annList, setAnnList] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState("");
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [aiNotes, setAiNotes] = useState(initialNotes);

  // Scale / calibration state
  const [detectedScale, setDetectedScale] = useState(null);
  const [detectingScale, setDetectingScale] = useState(false);
  const [pxPerFtAtScale1, setPxPerFtAtScale1] = useState(null);
  const [manualScaleInput, setManualScaleInput] = useState("");
  const [showScaleOverride, setShowScaleOverride] = useState(false);

  // Measure state
  const [measureStart, setMeasureStart] = useState(null);
  const [measurePreview, setMeasurePreview] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  // Calibrate state
  const [calibStart, setCalibStart] = useState(null);
  const [calibPreview, setCalibPreview] = useState(null);
  const [pendingCalib, setPendingCalib] = useState(null);
  const [calibKnownFeet, setCalibKnownFeet] = useState("");

  // Pointer/select state
  const [selectedAnn, setSelectedAnn] = useState(null); // { kind: "ann"|"measurement", idx }
  const [deletePopup, setDeletePopup] = useState(null); // { x, y, kind, idx }

  // Send to bid state
  const [sendingM, setSendingM] = useState(null);
  const [sendRoomId, setSendRoomId] = useState("");
  const [sendCategory, setSendCategory] = useState("base");

  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const scrollRef = useRef(null);
  const scaleDetectedRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setAnnList(annotations.filter(a => a.type !== "measurement"));
      setMeasurements(annotations.filter(a => a.type === "measurement"));
      setAiNotes(initialNotes);
      setAutoFitted(false);
      setNaturalPageWidth(null);
      setPageNumber(1);
      setTool("pen");
      setMeasureStart(null);
      setCalibStart(null);
    }
  }, [open]);

  // Auto-fit when natural width known
  useEffect(() => {
    if (naturalPageWidth && !autoFitted && scrollRef.current) {
      const w = scrollRef.current.clientWidth - 64;
      setScale(Math.min(Math.max(w / naturalPageWidth, 0.3), 3.0));
      setAutoFitted(true);
    }
  }, [naturalPageWidth, autoFitted]);

  // AI scale detection on open
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

  const hitTestAnnotations = (pos) => {
    const T = 12;
    // Check measurements first
    for (let i = measurements.length - 1; i >= 0; i--) {
      const m = measurements[i];
      if (m.page !== pageNumber) continue;
      const midX = (m.start.x + m.end.x) / 2, midY = (m.start.y + m.end.y) / 2;
      if (Math.hypot(pos.x - midX, pos.y - midY) < 20) return { kind: "measurement", idx: i };
      if (Math.hypot(pos.x - m.start.x, pos.y - m.start.y) < T) return { kind: "measurement", idx: i };
      if (Math.hypot(pos.x - m.end.x, pos.y - m.end.y) < T) return { kind: "measurement", idx: i };
    }
    // Check annotations (reverse = top-first)
    const pageAnns = annList.map((a, i) => ({ a, i })).filter(({ a }) => a.page === pageNumber);
    for (let j = pageAnns.length - 1; j >= 0; j--) {
      const { a, i } = pageAnns[j];
      if (a.type === "highlight") { if (pos.x >= a.x && pos.x <= a.x + a.w && pos.y >= a.y && pos.y <= a.y + a.h) return { kind: "ann", idx: i }; }
      else if (a.type === "text") { if (Math.hypot(pos.x - a.x, pos.y - a.y) < 30) return { kind: "ann", idx: i }; }
      else if (a.type === "pen") { if (a.points.some(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < T)) return { kind: "ann", idx: i }; }
      else if (a.type === "arrow" || a.type === "line") {
        if (Math.hypot(pos.x - a.start.x, pos.y - a.start.y) < T || Math.hypot(pos.x - a.end.x, pos.y - a.end.y) < T) return { kind: "ann", idx: i };
      }
    }
    return null;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);

    if (tool === "pointer") {
      const hit = hitTestAnnotations(pos);
      if (hit) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setDeletePopup({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top, ...hit });
      } else {
        setDeletePopup(null);
      }
      return;
    }

    setDeletePopup(null);

    if (tool === "measure") {
      if (!measureStart) { setMeasureStart(pos); }
      else {
        const realFeet = computeRealFeet(measureStart, pos);
        const newM = { type: "measurement", start: measureStart, end: pos, realFeet, page: pageNumber, id: `m_${Date.now()}`, label: `Measurement ${measurements.length + 1}` };
        setMeasurements(p => [...p, newM]);
        setMeasureStart(null);
        setMeasurePreview(null);
      }
      return;
    }
    if (tool === "calibrate") {
      if (!calibStart) { setCalibStart(pos); }
      else { const dist = Math.hypot(pos.x - calibStart.x, pos.y - calibStart.y); setPendingCalib({ start: calibStart, end: pos, pixelDist: dist }); setCalibStart(null); setCalibPreview(null); }
      return;
    }
    if (tool === "pen") { setIsPointerDown(true); setCurrentPath([pos]); }
    else if (tool === "eraser") { setIsPointerDown(true); eraseAt(pos); }
    else if (["arrow","line","highlight"].includes(tool)) { setIsPointerDown(true); setCurrentLine({ start: pos, end: pos }); }
    else if (tool === "text") { setTextInput(pos); setTextValue(""); }
  };

  const handlePointerMove = (e) => {
    const pos = getPos(e);
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
    if (tool === "pen" && currentPath.length > 1) { setAnnList(p => [...p, { type: "pen", points: currentPath, color, page: pageNumber }]); setCurrentPath([]); }
    else if ((tool === "arrow" || tool === "line") && currentLine) {
      if (Math.hypot(pos.x - currentLine.start.x, pos.y - currentLine.start.y) > 5)
        setAnnList(p => [...p, { type: tool, start: currentLine.start, end: pos, color, page: pageNumber }]);
      setCurrentLine(null);
    } else if (tool === "highlight" && currentLine) {
      const w = Math.abs(pos.x - currentLine.start.x), h = Math.abs(pos.y - currentLine.start.y);
      if (w > 5 && h > 5) setAnnList(p => [...p, { type: "highlight", x: Math.min(currentLine.start.x, pos.x), y: Math.min(currentLine.start.y, pos.y), w, h, color: highlightColor, page: pageNumber }]);
      setCurrentLine(null);
    }
    setIsPointerDown(false);
  };

  const eraseAt = ({ x, y }) => {
    const t = 18;
    setAnnList(p => p.filter(a => {
      if (a.page !== pageNumber) return true;
      if (a.type === "highlight") return !(x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
      if (a.type === "pen") return !a.points.some(pt => Math.hypot(pt.x - x, pt.y - y) < t);
      if (a.type === "arrow" || a.type === "line") return Math.hypot(a.start.x - x, a.start.y - y) >= t && Math.hypot(a.end.x - x, a.end.y - y) >= t;
      if (a.type === "text") return Math.hypot(a.x - x, a.y - y) >= t * 2;
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim()) setAnnList(p => [...p, { type: "text", x: textInput.x, y: textInput.y, text: textValue.trim(), color, page: pageNumber }]);
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

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annList.filter(a => a.page === pageNumber).forEach(ann => {
      ctx.strokeStyle = ann.color; ctx.fillStyle = ann.color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (ann.type === "highlight") {
        const [r,g,b] = [parseInt(ann.color.slice(1,3),16),parseInt(ann.color.slice(3,5),16),parseInt(ann.color.slice(5,7),16)];
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`; ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = 1.5;
        ctx.fillRect(ann.x,ann.y,ann.w,ann.h); ctx.strokeRect(ann.x,ann.y,ann.w,ann.h);
        const lbl = HIGHLIGHT_COLORS.find(c => c.color === ann.color)?.label;
        if (lbl) { ctx.font="bold 10px sans-serif"; ctx.fillStyle=`rgba(${r},${g},${b},1)`; ctx.fillText(lbl, ann.x+3, ann.y+12); }
      } else if (ann.type === "pen") {
        ctx.beginPath(); ann.points.forEach((pt,i) => i===0 ? ctx.moveTo(pt.x,pt.y) : ctx.lineTo(pt.x,pt.y)); ctx.stroke();
      } else if (ann.type === "arrow") { drawArrow(ctx, ann.start, ann.end, true); }
      else if (ann.type === "line") { drawArrow(ctx, ann.start, ann.end, false); }
      else if (ann.type === "text") {
        ctx.font="bold 13px sans-serif"; const m=ctx.measureText(ann.text);
        ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fillRect(ann.x-3,ann.y-15,m.width+6,19);
        ctx.strokeStyle=ann.color; ctx.lineWidth=1; ctx.strokeRect(ann.x-3,ann.y-15,m.width+6,19);
        ctx.fillStyle=ann.color; ctx.fillText(ann.text,ann.x,ann.y);
      }
    });

    // Draw saved measurements (red)
    measurements.filter(m => m.page === pageNumber).forEach(m => {
      ctx.strokeStyle="#ef4444"; ctx.fillStyle="#ef4444"; ctx.lineWidth=2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(m.start.x,m.start.y); ctx.lineTo(m.end.x,m.end.y); ctx.stroke();
      [m.start,m.end].forEach(pt => { ctx.beginPath(); ctx.arc(pt.x,pt.y,4,0,Math.PI*2); ctx.fill(); });
      const mx=(m.start.x+m.end.x)/2, my=(m.start.y+m.end.y)/2;
      const lbl=m.realFeet!=null?`${m.realFeet.toFixed(1)} LF`:"?";
      ctx.font="bold 11px sans-serif"; const tm=ctx.measureText(lbl);
      ctx.fillStyle="rgba(239,68,68,0.92)"; ctx.beginPath(); ctx.roundRect?ctx.roundRect(mx-tm.width/2-5,my-15,tm.width+10,19,4):ctx.rect(mx-tm.width/2-5,my-15,tm.width+10,19); ctx.fill();
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

    // Annotation previews
    if (currentPath.length > 1) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); currentPath.forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y)); ctx.stroke(); }
    if (currentLine && (tool==="arrow"||tool==="line")) { ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap="round"; drawArrow(ctx,currentLine.start,currentLine.end,tool==="arrow"); }
    if (currentLine && tool==="highlight") {
      const [r2,g2,b2]=[parseInt(highlightColor.slice(1,3),16),parseInt(highlightColor.slice(3,5),16),parseInt(highlightColor.slice(5,7),16)];
      const x=Math.min(currentLine.start.x,currentLine.end.x), y=Math.min(currentLine.start.y,currentLine.end.y), w=Math.abs(currentLine.end.x-currentLine.start.x), h=Math.abs(currentLine.end.y-currentLine.start.y);
      ctx.fillStyle=`rgba(${r2},${g2},${b2},0.35)`; ctx.strokeStyle=`rgba(${r2},${g2},${b2},0.8)`; ctx.lineWidth=1.5;
      ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
    }
  }, [annList, measurements, currentPath, currentLine, pageNumber, color, highlightColor, canvasSize, tool, measureStart, measurePreview, calibStart, calibPreview]);

  const toolConfig = [
    { key: "pen", label: "Draw", icon: Pencil, cls: "bg-amber-600 hover:bg-amber-700" },
    { key: "highlight", label: "Highlight", icon: Highlighter, cls: "bg-yellow-500 hover:bg-yellow-600" },
    { key: "arrow", label: "Arrow", icon: ArrowRight, cls: "bg-blue-600 hover:bg-blue-700" },
    { key: "line", label: "Line", icon: Minus, cls: "bg-green-600 hover:bg-green-700" },
    { key: "text", label: "Text", icon: Type, cls: "bg-purple-600 hover:bg-purple-700" },
    { key: "eraser", label: "Eraser", icon: Eraser, cls: "bg-slate-600 hover:bg-slate-700" },
    { key: "measure", label: "Measure", icon: Ruler, cls: "bg-orange-500 hover:bg-orange-600" },
    { key: "calibrate", label: "Calibrate", icon: Target, cls: "bg-violet-600 hover:bg-violet-700" },
  ];

  const cursor = ["measure","calibrate"].includes(tool) ? "crosshair" : tool==="text" ? "text" : tool==="highlight" ? "cell" : "crosshair";
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
            <Button key={key} variant={tool===key?"default":"outline"} size="sm"
              onClick={() => { setTool(key); setTextInput(null); setMeasureStart(null); setCalibStart(null); }}
              className={`h-8 text-xs ${tool===key ? cls : ""}`}>
              <Icon className="w-3.5 h-3.5 mr-1" />{label}
            </Button>
          ))}
          <div className="border-l h-5 mx-1" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const pa=annList.filter(a=>a.page===pageNumber); if(!pa.length)return; const last=pa[pa.length-1]; setAnnList(p=>p.filter(a=>a!==last)); }}><Undo2 className="w-3.5 h-3.5 mr-1"/>Undo</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAnnList(p=>p.filter(a=>a.page!==pageNumber))}>Clear Page</Button>
          {tool==="highlight" ? (
            <div className="flex items-center gap-1.5 ml-1">
              {HIGHLIGHT_COLORS.map(hc => (
                <button key={hc.label} onClick={()=>setHighlightColor(hc.color)} title={hc.label}
                  className="px-2 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={{ background: hc.hex, borderColor: highlightColor===hc.color?hc.color:"transparent", color: hc.color, boxShadow: highlightColor===hc.color?`0 0 0 2px ${hc.color}`:"none" }}>
                  {hc.label}
                </button>
              ))}
            </div>
          ) : (
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-7 h-7 rounded border cursor-pointer ml-1" />
          )}
          <div className="border-l h-5 mx-1" />
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.max(0.3,s-0.15))}><ZoomOut className="w-4 h-4"/></Button>
          <span className="text-xs text-slate-600 w-9 text-center">{Math.round(scale*100)}%</span>
          <Button variant="outline" size="sm" className="h-8" onClick={()=>setScale(s=>Math.min(3,s+0.15))}><ZoomIn className="w-4 h-4"/></Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fitToPage}><Maximize2 className="w-3.5 h-3.5 mr-1"/>Fit</Button>
        </div>

        {/* Tool hints */}
        {tool==="measure" && <div className="px-4 py-1.5 bg-orange-50 border-b text-xs text-orange-700 font-medium flex-shrink-0">{!measureStart?"Click first point on the plan":"Click second point — distance will be calculated automatically"}</div>}
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
                  onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={e=>{ if(!["measure","calibrate"].includes(tool)) handlePointerUp(e); }}
                />
                {textInput && (
                  <input autoFocus type="text" value={textValue} onChange={e=>setTextValue(e.target.value)}
                    onBlur={commitText} onKeyDown={e=>{if(e.key==="Enter")commitText();if(e.key==="Escape"){setTextInput(null);setTextValue("");}}}
                    style={{ position:"absolute", left:textInput.x, top:textInput.y-20, color, background:"rgba(255,255,255,0.95)", border:`2px solid ${color}`, borderRadius:4, padding:"2px 6px", fontSize:13, fontWeight:"bold", minWidth:100, outline:"none", zIndex:20 }}
                    placeholder="Type note & Enter"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: measurements + text notes */}
          {(measurements.length > 0 || annList.some(a => a.type === "text")) && (
            <div className="w-56 border-l bg-white flex flex-col overflow-hidden flex-shrink-0">

              {/* Measurements */}
              {measurements.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-red-500"/>Measurements ({measurements.length})</h3>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-2 max-h-64">
                    {measurements.map((m, idx) => (
                      <div key={m.id||idx} className="p-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <input
                            type="number"
                            step="0.1"
                            value={m.realFeet != null ? m.realFeet : ""}
                            onChange={e => setMeasurements(p => p.map((x,i) => i===idx ? {...x, realFeet: parseFloat(e.target.value)||null} : x))}
                            className="w-20 text-sm font-bold text-red-700 border border-red-200 rounded px-1 focus:outline-none focus:ring-1 focus:ring-red-300 bg-white"
                            placeholder="LF"
                          />
                          <span className="text-xs text-red-500 font-semibold mt-1">LF</span>
                          <button onClick={()=>setMeasurements(p=>p.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-500 flex-shrink-0 mt-0.5"><X className="w-3 h-3"/></button>
                        </div>
                        <input
                          value={m.label}
                          onChange={e => setMeasurements(p => p.map((x,i) => i===idx ? {...x, label: e.target.value} : x))}
                          className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-300 bg-white mb-1.5"
                          placeholder="Label (e.g. Kitchen Base)"
                        />
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

              {/* Text notes */}
              {annList.some(a => a.type === "text") && (
                <>
                  <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-purple-500"/>Notes ({annList.filter(a=>a.type==="text" && a.page===pageNumber).length})</h3>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-2 flex-1">
                    {annList.filter(a => a.type === "text" && a.page === pageNumber).map((ann) => {
                      const globalIdx = annList.indexOf(ann);
                      return (
                        <div key={globalIdx} className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start gap-1">
                            <input
                              value={ann.text}
                              onChange={e => setAnnList(p => p.map((x,i) => i===globalIdx ? {...x, text: e.target.value} : x))}
                              className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white font-medium"
                              placeholder="Note text"
                            />
                            <button onClick={()=>setAnnList(p=>p.filter((_,i)=>i!==globalIdx))} className="text-slate-300 hover:text-red-500 flex-shrink-0 mt-1"><X className="w-3 h-3"/></button>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0" style={{background: ann.color}}/>
                            <input
                              type="color"
                              value={ann.color}
                              onChange={e => setAnnList(p => p.map((x,i) => i===globalIdx ? {...x, color: e.target.value} : x))}
                              className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                            />
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