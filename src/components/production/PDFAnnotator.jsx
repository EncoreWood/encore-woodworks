import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Download, Trash2, ZoomIn, ZoomOut, RotateCw, Undo2 } from "lucide-react";
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
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#FF0000");
  const [aiNotes, setAiNotes] = useState(initialNotes);

  useEffect(() => {
    setAiNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    setPaths(annotations);
  }, [annotations]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // Handle touch/stylus events
    if (e.touches || e.changedTouches) {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    // Ignore mouse events if a touch/stylus is active (prevent double-firing)
    if (e.type === "mousedown" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    if (tool === "pen") {
      setDrawing(true);
      const pos = getPos(e);
      setCurrentPath([pos]);
    } else if (tool === "eraser") {
      setDrawing(true);
      eraseAt(getPos(e));
    }
  };

  const eraseAt = ({ x, y }) => {
    const threshold = 15;
    setPaths(prev => prev.filter(path => {
      return !path.points.some(pt => Math.hypot(pt.x - x, pt.y - y) < threshold);
    }));
  };

  const draw = (e) => {
    if (!drawing) return;
    if (e.type === "mousemove" && e.sourceCapabilities?.firesTouchEvents) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "pen") {
      setCurrentPath((prev) => [...prev, pos]);
    } else if (tool === "eraser") {
      eraseAt(pos);
    }
  };

  const stopDrawing = (e) => {
    if (e?.type === "mouseup" && e.sourceCapabilities?.firesTouchEvents) return;
    if (drawing && tool === "pen" && currentPath.length > 0) {
      setPaths((prev) => [...prev, { points: currentPath, color, page: pageNumber }]);
      setCurrentPath([]);
    }
    setDrawing(false);
  };

  const handleUndo = () => {
    const pagePaths = paths.filter(p => p.page === pageNumber);
    if (pagePaths.length === 0) return;
    const lastIdx = paths.lastIndexOf(pagePaths[pagePaths.length - 1]);
    setPaths(prev => prev.filter((_, i) => i !== lastIdx));
  };

  const clearPage = () => {
    setPaths(prev => prev.filter(p => p.page !== pageNumber));
  };

  const clearAll = () => setPaths([]);

  const handleSave = () => {
    onSave(paths, aiNotes);
    onOpenChange(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paths.filter(p => p.page === pageNumber).forEach((path) => {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      path.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    if (currentPath.length > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [paths, currentPath, pageNumber, color]);

  const cursorStyle = tool === "pen" ? "crosshair" : "cell";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Annotate PDF</span>
            <span className="text-sm text-slate-500">Page {pageNumber} of {numPages}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-4 border-b flex-wrap">
          <Button
            variant={tool === "pen" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("pen")}
            className={tool === "pen" ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Draw
          </Button>

          <Button
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("eraser")}
            className={tool === "eraser" ? "bg-slate-600 hover:bg-slate-700" : ""}
          >
            <Eraser className="w-4 h-4 mr-1" />
            Eraser
          </Button>

          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo2 className="w-4 h-4 mr-1" />
            Undo
          </Button>

          <Button variant="outline" size="sm" onClick={clearPage}>
            Clear Page
          </Button>

          <div className="flex items-center gap-2 ml-1">
            <label className="text-sm text-slate-600">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
          </div>

          <div className="border-l h-6 mx-2" />

          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="border-l h-6 mx-2" />

          <Button variant="outline" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>

          <div className="ml-auto flex gap-2">
            {!hideDownload && (
              <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}>
                <Download className="w-4 h-4 mr-1" />
                Download
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

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-slate-100 rounded-lg relative">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="relative">
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
                />
              </Document>
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{ cursor: cursorStyle, touchAction: "none" }}
                width={595 * scale}
                height={842 * scale}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
              />
            </div>
          </div>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
              Previous
            </Button>
            <span className="text-sm">Page {pageNumber} of {numPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}