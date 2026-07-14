import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, RotateCw, ChevronUp } from "lucide-react";

// Use a CDN worker matching the installed pdfjs-dist version for reliability on iPad/iOS
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url, className = "" }) {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const pinchState = useRef(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setError(err?.message || "Failed to load PDF");
    setLoading(false);
  }, []);

  const zoomIn = () => setScale(s => Math.min(4, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale(s => Math.max(0.4, +(s - 0.25).toFixed(2)));

  // Pinch-to-zoom support for iPad/touch devices
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchState.current = { startDist: getDist(e.touches), startScale: scale };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        const dist = getDist(e.touches);
        const ratio = dist / pinchState.current.startDist;
        const next = Math.max(0.4, Math.min(4, +(pinchState.current.startScale * ratio).toFixed(2)));
        setScale(next);
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchState.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scale]);

  const scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className={`relative flex flex-col bg-slate-800 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 text-white flex-shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={scale <= 0.4} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors" title="Zoom out">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs font-medium w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 4} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-40 transition-colors" title="Zoom in">
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => setScale(1)} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors" title="Reset zoom">
          <RotateCw className="w-4 h-4 inline mr-1" />Reset
        </button>
      </div>

      {/* PDF area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto overscroll-contain touch-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white/70 gap-3 p-6 text-center">
            <p className="text-sm">Couldn't load this PDF inline.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline text-sm">
              Open in new tab
            </a>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>}
            className="flex flex-col items-center"
          >
            {Array.from(new Array(numPages || 0), (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                scale={scale}
                className="mb-2 shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>
        )}
      </div>

      {/* Scroll-to-top button when zoomed in */}
      {scale > 1.2 && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-4 right-4 p-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-colors"
          title="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}