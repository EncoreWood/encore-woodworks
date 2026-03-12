import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Download, Trash2, ZoomIn, ZoomOut, RotateCw, Undo2, Type, ArrowRight, Minus } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFAnnotator({ open, onOpenChange, pdfUrl, annotations = [], onSave, showNotesField = false, initialNotes = "", hideDownload = false }) {
  if (!pdfUrl) return null;

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState("pen");
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [annList, setAnnList] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState("");
  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const [color, setColor] = useState("#e53e3e");
  const [aiNotes, setAiNotes] = useState(initialNotes);
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });

  useEffect(() => { setAiNotes(initialNotes); }, [initialNotes]);
  useEffect(() => { setAnnList(annotations); }, [annotations]);

  const syncCanvasSize = () => {
    const pageEl = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas");
    if (pageEl) {
      setCanvasSize({ width: pageEl.offsetWidth, height: pageEl.offsetHeight });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
  const onPageLoadSuccess = () => setTimeout(syncCanvasSize, 50);

  useEffect(() => {
    setTimeout(syncCanvasSize, 100);
  }, [scale, rotation, pageNumber]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    if (tool === "pen") {
      setIsPointerDown(true);
      setCurrentPath([pos]);
    } else if (tool === "eraser") {
      setIsPointerDown(true);
      eraseAt(pos);
    } else if (tool === "arrow" || tool === "line") {
      setIsPointerDown(true);
      setCurrentLine({ start: pos, end: pos });
    } else if (tool === "text") {
      setTextInput(pos);
      setTextValue("");
    }
  };

  const handlePointerMove = (e) => {
    if (!isPointerDown) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "pen") {
      setCurrentPath(prev => [...prev, pos]);
    } else if (tool === "eraser") {
      eraseAt(pos);
    } else if (tool === "arrow" || tool === "line") {
      setCurrentLine(prev => prev ? { ...prev, end: pos } : null);
    }
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(prev => [...prev, { type: "pen", points: currentPath, color, page: pageNumber }]);
      setCurrentPath([]);
    } else if ((tool === "arrow" || tool === "line") && currentLine) {
      const dist = Math.hypot(pos.x - currentLine.start.x, pos.y - currentLine.start.y);
      if (dist > 5) {
        setAnnList(prev => [...prev, { type: tool, start: currentLine.start, end: pos, color, page: pageNumber }]);
      }
      setCurrentLine(null);
    }
    setIsPointerDown(false);
  };

  const eraseAt = ({ x, y }) => {
    const t = 18;
    setAnnList(prev => prev.filter(ann => {
      if (ann.page !== pageNumber) return true;
      if (ann.type === "pen") return !ann.points.some(pt => Math.hypot(pt.x - x, pt.y - y) < t);
      if (ann.type === "arrow" || ann.type === "line") {
        return Math.hypot(ann.start.x - x, ann.start.y - y) >= t && Math.hypot(ann.end.x - x, ann.end.y - y) >= t;
      }
      if (ann.type === "text") return Math.hypot(ann.x - x, ann.y - y) >= t * 2;
      return true;
    }));
  };

  const commitText = () => {
    if (textInput && textValue.trim()) {
      setAnnList(prev => [...prev, { type: "text", x: textInput.x, y: textInput.y, text: textValue.trim(), color, page: pageNumber }]);
    }
    setTextInput(null);
    setTextValue("");
  };

  const handleUndo = () => {
    const pageAnns = annList.filter(a => a.page === pageNumber);
    if (!pageAnns.length) return;
    const last = pageAnns[pageAnns.length - 1];
    const lastIdx = annList.lastIndexOf(last);
    setAnnList(prev => prev.filter((_, i) => i !== lastIdx));
  };

  const clearPage = () => setAnnList(prev => prev.filter(a => a.page !== pageNumber));
  const clearAll = () => setAnnList([]);
  const handleSave = () => { onSave(annList, aiNotes); onOpenChange(false); };

  const drawArrow = (ctx, from, to, withHead) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (withHead) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const hl = 14;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - hl * Math.cos(angle - Math.PI / 6), to.y - hl * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - hl * Math.cos(angle + Math.PI / 6), to.y - hl * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annList.filter(a => a.page === pageNumber).forEach(ann => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.type === "pen") {
        ctx.beginPath();
        ann.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (ann.type === "arrow") {
        drawArrow(ctx, ann.start, ann.end, true);
      } else if (ann.type === "line") {
        drawArrow(ctx, ann.start, ann.end, false);
      } else if (ann.type === "text") {
        ctx.font = "bold 13px sans-serif";
        const metrics = ctx.measureText(ann.text);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(ann.x - 3, ann.y - 15, metrics.width + 6, 19);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(ann.x - 3, ann.y - 15, metrics.width + 6, 19);
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.x, ann.y);
      }
    });

    // Current pen stroke preview
    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    }

    // Current arrow/line preview
    if (currentLine) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      drawArrow(ctx, currentLine.start, currentLine.end, tool === "arrow");
    }
  }, [annList, currentPath, currentLine, pageNumber, color, canvasSize]);

  const toolConfig = [
    { key: "pen", label: "Draw", icon: Pencil, activeClass: "bg-amber-600 hover:bg-amber-700" },
    { key: "arrow", label: "Arrow", icon: ArrowRight, activeClass: "bg-blue-600 hover:bg-blue-700" },
    { key: "line", label: "Line", icon: Minus, activeClass: "bg-green-600 hover:bg-green-700" },
    { key: "text", label: "Text Note", icon: Type, activeClass: "bg-purple-600 hover:bg-purple-700" },
    { key: "eraser", label: "Eraser", icon: Eraser, activeClass: "bg-slate-600 hover:bg-slate-700" },
  ];

  const cursorStyle = tool === "text" ? "text" : "crosshair";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Annotate Plan</span>
            <span className="text-sm text-slate-500">Page {pageNumber} of {numPages}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 pb-3 border-b flex-wrap">
          {toolConfig.map(({ key, label, icon: Icon, activeClass }) => (
            <Button
              key={key}
              variant={tool === key ? "default" : "outline"}
              size="sm"
              onClick={() => { setTool(key); setTextInput(null); }}
              className={tool === key ? activeClass : ""}
            >
              <Icon className="w-4 h-4 mr-1" /> {label}
            </Button>
          ))}

          <div className="border-l h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={clearPage}>Clear Page</Button>

          <div className="flex items-center gap-1.5 ml-1">
            <label className="text-sm text-slate-600">Color:</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
          </div>

          <div className="border-l h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(2.5, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="border-l h-6 mx-1" />
          <Button variant="outline" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>

          <div className="ml-auto flex gap-2">
            {!hideDownload && (
              <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
            )}
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
              Save Annotations
            </Button>
          </div>
        </div>

        {/* Notes for AI */}
        {showNotesField && (
          <div className="pb-3 border-b">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes for AI (included in analysis)</label>
            <textarea
              value={aiNotes}
              onChange={e => setAiNotes(e.target.value)}
              placeholder="e.g. Include island with seating, double stacked uppers in kitchen, built-in pantry..."
              className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        )}

        {/* PDF + Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 rounded-lg">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="relative inline-block" ref={pageContainerRef}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="flex items-center justify-center p-8 text-slate-500">Loading PDF...</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={onPageLoadSuccess}
                />
              </Document>

              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{ cursor: cursorStyle, touchAction: "none" }}
                width={canvasSize.width}
                height={canvasSize.height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />

              {/* Floating text input */}
              {textInput && (
                <input
                  autoFocus
                  type="text"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onBlur={commitText}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitText();
                    if (e.key === "Escape") { setTextInput(null); setTextValue(""); }
                  }}
                  style={{
                    position: "absolute",
                    left: textInput.x,
                    top: textInput.y - 20,
                    color: color,
                    background: "rgba(255,255,255,0.95)",
                    border: `2px solid ${color}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 13,
                    fontWeight: "bold",
                    minWidth: 100,
                    outline: "none",
                    zIndex: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                  placeholder="Type note & Enter"
                />
              )}
            </div>
          </div>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Previous</Button>
            <span className="text-sm">Page {pageNumber} of {numPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}