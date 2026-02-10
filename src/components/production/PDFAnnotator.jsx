import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Download, Trash2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFAnnotator({ open, onOpenChange, pdfUrl, annotations = [], onSave }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState("pen");
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [color, setColor] = useState("#FF0000");

  useEffect(() => {
    setPaths(annotations);
  }, [annotations]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const startDrawing = (e) => {
    if (tool !== "pen") return;
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath([{ x, y }]);
  };

  const draw = (e) => {
    if (!drawing || tool !== "pen") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath((prev) => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (drawing && currentPath.length > 0) {
      setPaths((prev) => [...prev, { points: currentPath, color, page: pageNumber }]);
      setCurrentPath([]);
    }
    setDrawing(false);
  };

  const clearAnnotations = () => {
    setPaths([]);
  };

  const handleSave = () => {
    onSave(paths);
    onOpenChange(false);
  };

  const handleDownload = async () => {
    // Create a downloadable version with annotations
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "annotated.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved paths for current page
    paths.filter(p => p.page === pageNumber).forEach((path) => {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      path.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }
  }, [paths, currentPath, pageNumber, color]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Annotate PDF</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                Page {pageNumber} of {numPages}
              </span>
            </div>
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
            <Pencil className="w-4 h-4 mr-2" />
            Draw
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaths((prev) => prev.filter(p => p.page !== pageNumber))}
          >
            <Eraser className="w-4 h-4 mr-2" />
            Clear Page
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <label className="text-sm text-slate-600">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer"
            />
          </div>

          <div className="border-l h-6 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="border-l h-6 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={clearAnnotations}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
              Save Annotations
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100 rounded-lg relative"
        >
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="relative">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="text-slate-500">Loading PDF...</div>
                  </div>
                }
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
                className="absolute top-0 left-0 cursor-crosshair"
                width={595 * scale}
                height={842 * scale}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ pointerEvents: tool === "pen" ? "auto" : "none" }}
              />
            </div>
          </div>
        </div>

        {/* Page Navigation */}
        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}