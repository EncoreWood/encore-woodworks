import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";

// Use a CDN worker matching the installed pdfjs-dist version for reliability on iPad/iOS
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5.0;

export default function PdfViewer({ url, className = "" }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const rightMouseDownRef = useRef(false);
  const panStateRef = useRef(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setError(err?.message || "Failed to load PDF");
    setLoading(false);
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_ZOOM, +(s + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_ZOOM, +(s - 0.25).toFixed(2))), []);
  const resetZoom = useCallback(() => setScale(1), []);

  const fitToWidth = useCallback(() => {
    if (!scrollRef.current) return;
    const containerWidth = scrollRef.current.clientWidth - 32;
    // Approximate: pdf page width at scale 1 is ~612pt (letter)
    // We can't know exact width until rendered, so use a reasonable estimate
    const pageWidth = 612;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, containerWidth / pageWidth));
    setScale(+newScale.toFixed(2));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Mouse controls ──
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) {
      // Right-click — start zoom mode
      rightMouseDownRef.current = true;
    } else if (e.button === 0) {
      // Left-click — start pan mode (only when zoomed in)
      if (scale > 1 && scrollRef.current) {
        panStateRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          scrollLeft: scrollRef.current.scrollLeft,
          scrollTop: scrollRef.current.scrollTop,
        };
      }
    }
  }, [scale]);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 2) {
      rightMouseDownRef.current = false;
    }
    if (e.button === 0) {
      panStateRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!panStateRef.current || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStateRef.current.startX;
    const dy = e.clientY - panStateRef.current.startY;
    scrollRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
    scrollRef.current.scrollTop = panStateRef.current.scrollTop - dy;
  }, []);

  const handleWheel = useCallback(
    (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;

      // Right-click + scroll = zoom
      if (rightMouseDownRef.current) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setScale((s) => Math.min(MAX_ZOOM, +(s + 0.1).toFixed(2)));
        } else {
          setScale((s) => Math.max(MIN_ZOOM, +(s - 0.1).toFixed(2)));
        }
        return;
      }

      // Ctrl/Cmd + scroll = zoom
      if (cmd) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setScale((s) => Math.min(MAX_ZOOM, +(s + 0.1).toFixed(2)));
        } else {
          setScale((s) => Math.max(MIN_ZOOM, +(s - 0.1).toFixed(2)));
        }
        return;
      }

      // Regular scroll = native pan (let browser handle)
    },
    []
  );

  const cursorClass = rightMouseDownRef.current
    ? "cursor-zoom-in"
    : panStateRef.current
    ? "cursor-grabbing"
    : scale > 1
    ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-800 ${className}`}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        rightMouseDownRef.current = false;
        panStateRef.current = null;
      }}
    >
      {/* Floating toolbar — top right */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-slate-900/90 rounded-lg shadow-lg px-1.5 py-1">
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_ZOOM}
          className="p-1.5 rounded text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-white tabular-nums min-w-[42px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_ZOOM}
          className="p-1.5 rounded text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/20 mx-0.5" />
        <button
          onClick={fitToWidth}
          className="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
          title="Fit to width"
        >
          <Maximize className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* PDF area */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className={`flex-1 overflow-auto overscroll-contain ${cursorClass}`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white/70 gap-3 p-6 text-center">
            <p className="text-sm">Couldn't load this PDF inline.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline text-sm"
            >
              Open in new tab
            </a>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            }
            className="flex flex-col items-center"
          >
            <Page
              key={currentPage}
              pageNumber={currentPage}
              scale={scale}
              className="mb-2 shadow-lg"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      {/* Page navigation — bottom */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-3 py-2 bg-slate-900/90 text-white flex-shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium tabular-nums">
            Page {currentPage} / {numPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}