import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Eraser, Download, Trash2, ZoomIn, ZoomOut, RotateCw, Undo2, Type, ArrowRight, Minus, Highlighter, Hand, ClipboardCheck, ClipboardList, FolderOpen, MessageSquare, X } from "lucide-react";
import RoomFilesModal from "@/components/production/RoomFilesModal";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Coordinate helpers ────────────────────────────────────────────────────────
// Annotations are stored NORMALIZED (0–1 relative to canvas dims at time of creation).
// This makes them scale-independent: correct at any zoom level.
function normPt(pt, w, h) { return { x: pt.x / w, y: pt.y / h }; }
function denormPt(pt, w, h) { return { x: pt.x * w, y: pt.y * h }; }

const HIGHLIGHT_COLORS = [
  { label: "Base",  color: "#d97706", hex: "rgba(251,191,36,0.25)" },
  { label: "Upper", color: "#3b82f6", hex: "rgba(147,197,253,0.3)" },
  { label: "Tall",  color: "#ef4444", hex: "rgba(252,165,165,0.3)" },
  { label: "Misc",  color: "#6b7280", hex: "rgba(209,213,219,0.45)" },
];

const DEFAULT_SIZE = { width: 595, height: 842 };

export default function PDFAnnotator({ open, onOpenChange, pdfUrl, annotations = [], onSave, showNotesField = false, initialNotes = "", hideDownload = false, onRequestPickup, onRequestMissing, roomInfo = null, initialMode = "view", currentUserName = "" }) {
  const [numPages, setNumPages] = useState(null);
  // The page currently in view (scroll-spy) — drives Undo / Clear Page and the header.
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.5);
  // Live CSS-transform zoom applied during a pinch gesture (GPU-accelerated, no re-render).
  // Committed into `scale` (which re-renders the PDF for crisp text) only after the gesture ends.
  const [liveScale, setLiveScale] = useState(1);
  const [pinchPage, setPinchPage] = useState(null);
  const [rotation, setRotation] = useState(90);
  // "view" = read-only viewer (tools hidden); "annotate" = full editing tools
  const [annotateMode, setAnnotateMode] = useState(initialMode === "annotate");
  const [tool, setTool] = useState(initialMode === "annotate" ? "pen" : "pan");
  const [isPointerDown, setIsPointerDown] = useState(false);
  // Which page a draw gesture started on (live previews only render there)
  const [drawingPage, setDrawingPage] = useState(null);
  // Per-page horizontal pan offsets for the Pan tool (scroll handles vertical)
  const [panOffsets, setPanOffsets] = useState({});

  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});        // page number → wrapper element
  const canvasRefs = useRef({});      // page number → annotation canvas element
  const panStartRef = useRef(null);
  const lastTouchDistRef = useRef(null);   // distance at pinch start (gesture anchor)
  const hasAutoFitRef = useRef(false);
  const scaleRef = useRef(0.5);                 // mirror of `scale` for use in stale-closure-safe touch handlers
  const liveScaleRef = useRef(1);               // mirror of `liveScale`

  const setLive = useCallback((v) => { liveScaleRef.current = v; setLiveScale(v); }, []);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const [sizes, setSizes] = useState({});           // page number → {width, height} of rendered page
  const sizesRef = useRef({});
  useEffect(() => { sizesRef.current = sizes; }, [sizes]);
  const getSize = (p) => sizes[p] || DEFAULT_SIZE;

  const [annList, setAnnList] = useState(annotations);
  const [currentPath, setCurrentPath] = useState([]);   // normalized points
  const [currentLine, setCurrentLine] = useState(null); // normalized {start,end}
  const [textInput, setTextInput] = useState(null);     // pixel pos + page for input placement
  const [textValue, setTextValue] = useState("");
  const [lastHighlight, setLastHighlight] = useState({});   // page → most recent highlight ann (for button positioning)
  const [pendingHighlights, setPendingHighlights] = useState({}); // page → highlight anns not yet turned into pickups
  const [missingRects, setMissingRects] = useState({}); // page → transient selection rects for missing-item reporting (never saved)
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  const [color, setColor] = useState("#e53e3e");
  const [highlightColor, setHighlightColor] = useState("#f59e0b");
  const [aiNotes, setAiNotes] = useState(initialNotes);
  const [commentInput, setCommentInput] = useState(null); // pixel pos + page for comment input placement
  const [commentValue, setCommentValue] = useState("");

  useEffect(() => { setAiNotes(initialNotes); }, [initialNotes]);
  useEffect(() => { setAnnList(annotations); }, [annotations]);

  // Reset state whenever the modal (re)opens / document changes
  useEffect(() => {
    if (open) {
      hasAutoFitRef.current = false;
      setNumPages(null);
      setSizes({});
      setPageNumber(1);
      setPanOffsets({});
      setPendingHighlights({});
      setLastHighlight({});
      setMissingRects({});
      setCommentInput(null);
      setCommentValue("");
      setAnnotateMode(initialMode === "annotate");
      setTool(initialMode === "annotate" ? "pen" : "pan");
    }
  }, [open, pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit the PDF page to the available container width so it uses the screen
  // instead of opening at a tiny fixed zoom.
  const fitToContainer = useCallback((page) => {
    const container = scrollContainerRef.current;
    if (!container || !page) return;
    const availW = container.clientWidth - 24;
    const availH = container.clientHeight - 24;
    try {
      const vp = page.getViewport({ scale: 1, rotation });
      const fit = Math.min(availW / vp.width, availH / vp.height);
      const clamped = Math.max(0.3, Math.min(2.5, fit));
      setScale(clamped);
    } catch {}
  }, [rotation]);

  // Re-measure every rendered page when zoom/rotation changes (pages re-render async)
  useEffect(() => {
    const t = setTimeout(() => {
      Object.entries(pageRefs.current).forEach(([pg, node]) => {
        const el = node?.querySelector(".react-pdf__Page__canvas");
        if (el) {
          const s = { width: el.offsetWidth, height: el.offsetHeight };
          setSizes(prev => (prev[pg]?.width === s.width && prev[pg]?.height === s.height) ? prev : { ...prev, [pg]: s });
        }
      });
    }, 100);
    return () => clearTimeout(t);
  }, [scale, rotation, numPages]);

  // ── Get canvas-relative position (pixels) ──────────────────────────────────
  const getPos = (e, canvas) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ── Touch handlers ────────────────────────────────────────────────────────────
  // Fingers scroll naturally (native pan-y); 2 fingers pinch-zoom (CSS scale, no PDF
  // re-render mid-gesture). Stylus (Apple Pencil) falls through to pointer handlers.
  const handleTouchStart = (e) => {
    if ([...e.touches].some(t => t.touchType === "stylus")) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      lastTouchDistRef.current = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      setPinchPage(pageNumber);
    }
  };

  const handleTouchMove = (e) => {
    if ([...e.touches].some(t => t.touchType === "stylus")) return;
    if (e.touches.length === 2 && lastTouchDistRef.current) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const s = scaleRef.current || 0.5;
      // Keep the committed render as-is; apply zoom purely as a CSS transform.
      const ratio = dist / lastTouchDistRef.current;
      const minL = 0.3 / s, maxL = 3 / s;
      setLive(Math.max(minL, Math.min(maxL, ratio)));
    }
  };

  const handleTouchEnd = (e) => {
    if ([...e.changedTouches].some(t => t.touchType === "stylus")) return;
    // Commit the live CSS zoom into the real render scale now that the gesture is over.
    // This is the ONLY point the PDF re-renders during a pinch (one brief blank flash).
    if (e.touches.length < 2 && liveScaleRef.current !== 1) {
      const s = scaleRef.current || 0.5;
      const next = Math.max(0.3, Math.min(3, s * liveScaleRef.current));
      setLive(1);
      setScale(next);
      setPinchPage(null);
    }
    if (e.touches.length === 0) {
      lastTouchDistRef.current = null;
      setPinchPage(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Radix Dialog mounts its content via portal; wait a frame so the ref is set
    let el = scrollContainerRef.current;
    if (!el) {
      const raf = requestAnimationFrame(() => {
        el = scrollContainerRef.current;
        if (!el) return;
        attach();
      });
      return () => cancelAnimationFrame(raf);
    }
    attach();
    function attach() {
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", handleTouchEnd, { passive: false });
    }
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll-spy: keep `pageNumber` on the page closest to the viewport center ──
  useEffect(() => {
    if (!open || !numPages) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const box = el.getBoundingClientRect();
      const centerY = box.top + box.height / 2;
      let best = pageNumber, bestD = Infinity;
      Object.entries(pageRefs.current).forEach(([pg, node]) => {
        if (!node) return;
        const r = node.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - centerY);
        if (d < bestD) { bestD = d; best = Number(pg); }
      });
      setPageNumber(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, numPages, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers (mouse + Apple Pencil / stylus) ──────────────────────
  const handlePointerDown = (e, page) => {
    // Finger touches scroll natively; ignore them here
    if (e.pointerType === "touch") return;

    const canvas = e.currentTarget;
    const pos = getPos(e, canvas);
    const { width: w, height: h } = getSize(page);

    // Pan tool: drag to pan (works for mouse and stylus)
    if (tool === "pan") {
      e.preventDefault();
      panStartRef.current = { page, x: e.clientX, y: e.clientY, offsetX: panOffsets[page]?.x || 0, offsetY: panOffsets[page]?.y || 0 };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const npos = normPt(pos, w, h);
    setDrawingPage(page);

    if (tool === "pen") {
      setIsPointerDown(true);
      setCurrentPath([npos]);
    } else if (tool === "eraser") {
      setIsPointerDown(true);
      eraseAt(pos, page);
    } else if (tool === "arrow" || tool === "line" || tool === "highlight" || tool === "missing") {
      setIsPointerDown(true);
      setCurrentLine({ start: npos, end: npos });
    } else if (tool === "text") {
      setTextInput({ ...pos, page });
      setTextValue("");
    } else if (tool === "comment") {
      setCommentInput({ ...pos, page });
      setCommentValue("");
    }
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === "touch") return;

    // Pan
    if (tool === "pan" && panStartRef.current) {
      const d = panStartRef.current;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setPanOffsets(prev => ({ ...prev, [d.page]: { x: d.offsetX + dx, y: d.offsetY + dy } }));
      return;
    }

    if (!isPointerDown) return;
    e.preventDefault();
    const page = drawingPage;
    const pos = getPos(e, canvasRefs.current[page]);
    const { width: w, height: h } = getSize(page);
    const npos = normPt(pos, w, h);

    if (tool === "pen") {
      setCurrentPath(prev => [...prev, npos]);
    } else if (tool === "eraser") {
      eraseAt(pos, page);
    } else if (tool === "arrow" || tool === "line" || tool === "highlight" || tool === "missing") {
      setCurrentLine(prev => prev ? { ...prev, end: npos } : null);
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === "touch") return;
    if (tool === "pan") { panStartRef.current = null; return; }
    e.preventDefault();

    const page = drawingPage;
    if (!page) { setIsPointerDown(false); return; }
    const pos = getPos(e, canvasRefs.current[page]);
    const { width: w, height: h } = getSize(page);
    const npos = normPt(pos, w, h);

    if (tool === "pen" && currentPath.length > 1) {
      setAnnList(prev => [...prev, { type: "pen", points: currentPath, color, page }]);
      setCurrentPath([]);
    } else if ((tool === "arrow" || tool === "line") && currentLine) {
      const dp = denormPt(currentLine.start, w, h);
      const ep = denormPt(npos, w, h);
      const dist = Math.hypot(ep.x - dp.x, ep.y - dp.y);
      if (dist > 5) {
        setAnnList(prev => [...prev, { type: tool, start: currentLine.start, end: npos, color, page }]);
      }
      setCurrentLine(null);
    } else if (tool === "highlight" && currentLine) {
      const ds = denormPt(currentLine.start, w, h);
      const de = denormPt(npos, w, h);
      const rw = Math.abs(de.x - ds.x);
      const rh = Math.abs(de.y - ds.y);
      if (rw > 5 && rh > 5) {
        const hl = {
          type: "highlight",
          x: Math.min(currentLine.start.x, npos.x),
          y: Math.min(currentLine.start.y, npos.y),
          w: Math.abs(npos.x - currentLine.start.x),
          h: Math.abs(npos.y - currentLine.start.y),
          color: highlightColor,
          page
        };
        setAnnList(prev => [...prev, hl]);
        setLastHighlight(prev => ({ ...prev, [page]: hl }));
        setPendingHighlights(prev => ({ ...prev, [page]: [...(prev[page] || []), hl] }));
      }
      setCurrentLine(null);
    } else if (tool === "missing" && currentLine) {
      const rw = Math.abs(npos.x - currentLine.start.x);
      const rh = Math.abs(npos.y - currentLine.start.y);
      if (rw > 0.01 && rh > 0.01) {
        setMissingRects(prev => ({
          ...prev,
          [page]: [...(prev[page] || []), {
            x: Math.min(currentLine.start.x, npos.x),
            y: Math.min(currentLine.start.y, npos.y),
            w: rw,
            h: rh,
            page
          }]
        }));
      }
      setCurrentLine(null);
    }
    setIsPointerDown(false);
    setDrawingPage(null);
  };

  // ── Erase: compare in pixel space ─────────────────────────────────────────
  const eraseAt = ({ x, y }, page) => {
    const { width: w, height: h } = getSize(page);
    const t = 18;
    setAnnList(prev => prev.filter(ann => {
      if (ann.page !== page) return true;
      if (ann.type === "highlight") {
        const ax = ann.x * w, ay = ann.y * h, aw = ann.w * w, ah = ann.h * h;
        return !(x >= ax && x <= ax + aw && y >= ay && y <= ay + ah);
      }
      if (ann.type === "pen") {
        return !ann.points.some(pt => Math.hypot(pt.x * w - x, pt.y * h - y) < t);
      }
      if (ann.type === "arrow" || ann.type === "line") {
        return Math.hypot(ann.start.x * w - x, ann.start.y * h - y) >= t &&
               Math.hypot(ann.end.x * w - x, ann.end.y * h - y) >= t;
      }
      if (ann.type === "text" || ann.type === "comment") return Math.hypot(ann.x * w - x, ann.y * h - y) >= t * 2;
      return true;
    }));
    // Keep pending pickup highlights in sync with the eraser (pending only holds highlights)
    setPendingHighlights(prev => {
      if (!prev[page]) return prev;
      const next = prev[page].filter(ann => {
        const ax = ann.x * w, ay = ann.y * h, aw = ann.w * w, ah = ann.h * h;
        return !(x >= ax && x <= ax + aw && y >= ay && y <= ay + ah);
      });
      return { ...prev, [page]: next };
    });
  };

  const commitText = () => {
    if (textInput && textValue.trim()) {
      const { width: w, height: h } = getSize(textInput.page);
      setAnnList(prev => [...prev, {
        type: "text",
        x: textInput.x / w,
        y: textInput.y / h,
        text: textValue.trim(), color, page: textInput.page
      }]);
    }
    setTextInput(null);
    setTextValue("");
  };

  const commitComment = () => {
    if (commentInput && commentValue.trim()) {
      const { width: w, height: h } = getSize(commentInput.page);
      const ann = {
        type: "comment",
        x: commentInput.x / w,
        y: commentInput.y / h,
        text: commentValue.trim(),
        author: currentUserName,
        color: "#7c3aed",
        page: commentInput.page,
        created_at: new Date().toISOString()
      };
      const next = [...annList, ann];
      setAnnList(next);
      // In read-only viewer mode there is no Save button — persist the comment right away
      if (!annotateMode) onSave(next, aiNotes, true);
    }
    setCommentInput(null);
    setCommentValue("");
  };

  // ── Text notes: drag to move, click to edit ────────────────────────────────
  const [editingNote, setEditingNote] = useState(null); // annList index being edited
  const [editText, setEditText] = useState("");
  const noteDragRef = useRef(null);

  const startNoteDrag = (e, idx, ann) => {
    e.stopPropagation();
    e.preventDefault();
    noteDragRef.current = { idx, moved: false, sx: e.clientX, sy: e.clientY, ox: ann.x, oy: ann.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveNoteDrag = (e) => {
    const d = noteDragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const ann = annList[d.idx];
    const live = liveScaleRef.current || 1;
    const { width: w, height: h } = getSize(ann?.page ?? pageNumber);
    const nx = Math.max(0, Math.min(1, d.ox + (dx / live) / w));
    const ny = Math.max(0, Math.min(1, d.oy + (dy / live) / h));
    setAnnList(prev => prev.map((a, i) => i === d.idx ? { ...a, x: nx, y: ny } : a));
  };

  const endNoteDrag = (ann) => {
    const d = noteDragRef.current;
    noteDragRef.current = null;
    if (d && !d.moved) {
      setEditingNote(d.idx);
      setEditText(ann.text);
    }
  };

  const commitNoteEdit = () => {
    if (editingNote === null) return;
    const idx = editingNote;
    const val = editText.trim();
    setAnnList(prev => {
      if (!val) return prev.filter((_, i) => i !== idx);
      return prev.map((a, i) => i === idx ? { ...a, text: val } : a);
    });
    setEditingNote(null);
    setEditText("");
  };

  const handleUndo = () => {
    // In missing-selection mode, undo removes the last selection rect instead of an annotation
    if (tool === "missing") {
      setMissingRects(prev => {
        if (!prev[pageNumber]?.length) return prev;
        return { ...prev, [pageNumber]: prev[pageNumber].slice(0, -1) };
      });
      return;
    }
    const pageAnns = annList.filter(a => a.page === pageNumber);
    if (!pageAnns.length) return;
    const last = pageAnns[pageAnns.length - 1];
    const lastIdx = annList.lastIndexOf(last);
    setAnnList(prev => prev.filter((_, i) => i !== lastIdx));
    if (last.type === "highlight") {
      setPendingHighlights(prev => prev[pageNumber] ? { ...prev, [pageNumber]: prev[pageNumber].filter(h => h !== last) } : prev);
      if (lastHighlight[pageNumber] === last) {
        setLastHighlight(prev => ({ ...prev, [pageNumber]: null }));
      }
    }
  };

  const clearPage = () => {
    setAnnList(prev => prev.filter(a => a.page !== pageNumber));
    setMissingRects(prev => ({ ...prev, [pageNumber]: [] }));
  };
  const clearAll = () => { setAnnList([]); setMissingRects({}); };
  const handleSave = () => { onSave(annList, aiNotes); onOpenChange(false); };

  // ── Capture highlighted regions + full page as images for AI extraction ──
  const captureCrops = (rects, page) => {
    if (!rects?.length) return null;
    const pageCanvas = pageRefs.current[page]?.querySelector(".react-pdf__Page__canvas");
    if (!pageCanvas) return null;
    const PW = pageCanvas.width, PH = pageCanvas.height;
    const crops = rects.map(hl => {
      const sx = Math.max(0, Math.round(hl.x * PW));
      const sy = Math.max(0, Math.round(hl.y * PH));
      const sw = Math.max(1, Math.min(PW - sx, Math.round(hl.w * PW)));
      const sh = Math.max(1, Math.min(PH - sy, Math.round(hl.h * PH)));
      const off = document.createElement("canvas");
      off.width = sw; off.height = sh;
      const octx = off.getContext("2d");
      // Fill white background so transparent areas aren't black in JPEG
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, sw, sh);
      octx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      return { cropDataUrl: off.toDataURL("image/jpeg", 0.92), highlightRect: { x: hl.x, y: hl.y, w: hl.w, h: hl.h } };
    });
    let pageDataUrl = null;
    try { pageDataUrl = pageCanvas.toDataURL("image/jpeg", 0.7); } catch {}
    return { crops, pageDataUrl, pageNumber: page };
  };

  const handleCreatePickup = (page) => {
    const hls = pendingHighlights[page];
    if (!hls?.length || !onRequestPickup) return;
    const data = captureCrops(hls, page);
    if (!data) return;
    onRequestPickup(data);
    setPendingHighlights(prev => ({ ...prev, [page]: [] }));
    setLastHighlight(prev => ({ ...prev, [page]: null }));
  };

  const handleReportMissing = (page) => {
    const rects = missingRects[page];
    if (!rects?.length || !onRequestMissing) return;
    const data = captureCrops(rects, page);
    if (!data) return;
    onRequestMissing(data);
    setMissingRects(prev => ({ ...prev, [page]: [] }));
  };

  // ── Draw arrow helper (pixel coords) ──────────────────────────────────────
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

  // ── Render annotation canvases (one per page) ───────────────────────────────
  useEffect(() => {
    Object.entries(canvasRefs.current).forEach(([pg, canvas]) => {
      if (!canvas) return;
      const page = Number(pg);
      const { width: W, height: H } = getSize(page);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw saved annotations (stored normalized → convert to pixels)
      annList.filter(a => a.page === page).forEach(ann => {
        ctx.strokeStyle = ann.color;
        ctx.fillStyle = ann.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (ann.type === "highlight") {
          const ax = ann.x * W, ay = ann.y * H, aw = ann.w * W, ah = ann.h * H;
          const r = parseInt(ann.color.slice(1,3),16);
          const g = parseInt(ann.color.slice(3,5),16);
          const b = parseInt(ann.color.slice(5,7),16);
          ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
          ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
          ctx.lineWidth = 1.5;
          ctx.fillRect(ax, ay, aw, ah);
          ctx.strokeRect(ax, ay, aw, ah);
          const hlLabel = HIGHLIGHT_COLORS.find(c => c.color === ann.color)?.label;
          if (hlLabel) {
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = `rgba(${r},${g},${b},1)`;
            ctx.fillText(hlLabel, ax + 3, ay + 12);
          }
        } else if (ann.type === "pen") {
          ctx.beginPath();
          ann.points.forEach((pt, i) => {
            const px = pt.x * W, py = pt.y * H;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          });
          ctx.stroke();
        } else if (ann.type === "arrow" || ann.type === "line") {
          drawArrow(ctx,
            { x: ann.start.x * W, y: ann.start.y * H },
            { x: ann.end.x * W,   y: ann.end.y * H },
            ann.type === "arrow"
          );
        }
      });

      // Missing-item selection rects (transient — never saved with annotations)
      (missingRects[page] || []).forEach(rect => {
        const ax = rect.x * W, ay = rect.y * H, aw = rect.w * W, ah = rect.h * H;
        ctx.fillStyle = "rgba(220,38,38,0.22)";
        ctx.strokeStyle = "rgba(220,38,38,0.85)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(ax, ay, aw, ah);
        ctx.strokeRect(ax, ay, aw, ah);
      });

      // Live previews render only on the page being drawn
      if (page !== drawingPage) return;
      if (currentPath.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        currentPath.forEach((pt, i) => {
          const px = pt.x * W, py = pt.y * H;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      if (currentLine && (tool === "arrow" || tool === "line")) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        drawArrow(ctx,
          { x: currentLine.start.x * W, y: currentLine.start.y * H },
          { x: currentLine.end.x * W,   y: currentLine.end.y * H },
          tool === "arrow"
        );
      }

      if (currentLine && (tool === "highlight" || tool === "missing")) {
        const lc = tool === "missing" ? "#dc2626" : highlightColor;
        const r = parseInt(lc.slice(1,3),16);
        const g = parseInt(lc.slice(3,5),16);
        const b = parseInt(lc.slice(5,7),16);
        const x = Math.min(currentLine.start.x, currentLine.end.x) * W;
        const y = Math.min(currentLine.start.y, currentLine.end.y) * H;
        const rw = Math.abs(currentLine.end.x - currentLine.start.x) * W;
        const rh = Math.abs(currentLine.end.y - currentLine.start.y) * H;
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, rw, rh);
        ctx.strokeRect(x, y, rw, rh);
      }
    });
  }, [annList, currentPath, currentLine, drawingPage, color, highlightColor, sizes, tool, missingRects]);

  const toolConfig = [
    { key: "pan",       label: "Pan",       icon: Hand,       activeClass: "bg-sky-600 hover:bg-sky-700" },
    { key: "pen",       label: "Draw",      icon: Pencil,     activeClass: "bg-amber-600 hover:bg-amber-700" },
    { key: "highlight", label: "Highlight", icon: Highlighter, activeClass: "bg-yellow-500 hover:bg-yellow-600" },
    { key: "arrow",     label: "Arrow",     icon: ArrowRight, activeClass: "bg-blue-600 hover:bg-blue-700" },
    { key: "line",      label: "Line",      icon: Minus,      activeClass: "bg-green-600 hover:bg-green-700" },
    { key: "text",      label: "Text",      icon: Type,       activeClass: "bg-purple-600 hover:bg-purple-700" },
    { key: "eraser",    label: "Eraser",    icon: Eraser,     activeClass: "bg-slate-600 hover:bg-slate-700" },
  ];

  const cursorStyle = tool === "pan" ? (panStartRef.current ? "grabbing" : "grab") : tool === "text" ? "text" : tool === "comment" ? "pointer" : (tool === "highlight" || tool === "missing") ? "cell" : "crosshair";

  if (!pdfUrl) return null;

  const pages = Array.from({ length: numPages || 0 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[97vw] w-[97vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{tool === "missing" ? "Report Missing Item" : annotateMode ? "Annotate Plan" : "Plan Viewer"}</span>
            {numPages && <span className="text-sm text-slate-500">Page {pageNumber} of {numPages}</span>}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 pb-3 border-b flex-wrap">
          {annotateMode && toolConfig.map(({ key, label, icon: Icon, activeClass }) => (
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

          {annotateMode && (
            <>
              <div className="border-l h-6 mx-1" />

              <Button variant="outline" size="sm" onClick={handleUndo}>
                <Undo2 className="w-4 h-4 mr-1" /> Undo
              </Button>
              <Button variant="outline" size="sm" onClick={clearPage}>Clear Page</Button>
            </>
          )}

          {/* Comments — available from the viewer too, so team members can pin notes on the plan */}
          <Button
            variant={tool === "comment" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTool("comment"); setTextInput(null); }}
            className={tool === "comment" ? "bg-violet-600 hover:bg-violet-700" : "text-violet-600 hover:text-violet-700"}
          >
            <MessageSquare className="w-4 h-4 mr-1" /> Comments
          </Button>
          {tool === "comment" && (
            <Button variant="outline" size="sm" onClick={() => setTool(annotateMode ? "pen" : "pan")}>
              Done
            </Button>
          )}

          {/* Report Missing — its own highlight-selection mode, available from the viewer too */}
          <Button
            variant={tool === "missing" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTool("missing"); setTextInput(null); }}
            className={tool === "missing" ? "bg-red-600 hover:bg-red-700" : "text-red-600 hover:text-red-700"}
          >
            <ClipboardList className="w-4 h-4 mr-1" /> Report Missing
          </Button>
          {tool === "missing" && (
            <Button variant="outline" size="sm" onClick={() => setTool(annotateMode ? "pen" : "pan")}>
              Done
            </Button>
          )}

          {annotateMode && (
            tool === "highlight" ? (
              <div className="flex items-center gap-1.5 ml-1">
                <label className="text-sm text-slate-600 font-medium">Category:</label>
                {HIGHLIGHT_COLORS.map(hc => (
                  <button
                    key={hc.label}
                    onClick={() => setHighlightColor(hc.color)}
                    title={hc.label}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                    style={{
                      background: hc.hex,
                      borderColor: highlightColor === hc.color ? hc.color : "transparent",
                      color: hc.color,
                      boxShadow: highlightColor === hc.color ? `0 0 0 2px ${hc.color}` : "none",
                      outline: "none"
                    }}
                  >
                    {hc.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 ml-1">
                <label className="text-sm text-slate-600">Color:</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
              </div>
            )
          )}

          <div className="border-l h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.3, s - 0.15))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 w-10 text-center">{Math.round(scale * liveScale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(3, s + 0.15))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRotation(r => (r + 90) % 360); setPanOffsets({}); }}>
            <RotateCw className="w-4 h-4" />
          </Button>

          {annotateMode && (
            <>
              <div className="border-l h-6 mx-1" />
              <Button variant="outline" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </Button>
            </>
          )}

          {roomInfo?.roomName && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoomInfo(true)}
              title="View room files, images and notes"
            >
              <FolderOpen className="w-4 h-4 mr-1" /> Room Info
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            {!hideDownload && (
              <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
            )}
            {annotateMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setAnnotateMode(false); setTool("pan"); }}>
                  Done
                </Button>
                <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
                  Save Annotations
                </Button>
              </>
            ) : (
              <Button onClick={() => { setAnnotateMode(true); setTool("pen"); }} className="bg-amber-600 hover:bg-amber-700">
                <Pencil className="w-4 h-4 mr-1" /> Annotate
              </Button>
            )}
          </div>
        </div>

        {/* Notes field */}
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

        {/* PDF pages — scrollable stack, one annotation canvas per page */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-slate-100 rounded-lg select-none"
          style={{ touchAction: "pan-y" }}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            }
          >
            <div className="flex flex-col items-center gap-4 py-4">
              {pages.map(p => {
                const size = sizes[p] || DEFAULT_SIZE;
                const pending = pendingHighlights[p] || [];
                const lh = lastHighlight[p];
                return (
                  <div
                    key={p}
                    ref={el => { pageRefs.current[p] = el; }}
                    className="relative bg-white shadow-lg flex-shrink-0"
                    style={{
                      transform: `translate3d(${panOffsets[p]?.x || 0}px, ${panOffsets[p]?.y || 0}px, 0) scale(${pinchPage === p ? liveScale : 1})`,
                      transformOrigin: "center center",
                      willChange: "transform",
                    }}
                  >
                    <Page
                      pageNumber={p}
                      scale={scale}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={(page) => {
                        setTimeout(() => {
                          const el = pageRefs.current[p]?.querySelector(".react-pdf__Page__canvas");
                          if (el) {
                            const s = { width: el.offsetWidth, height: el.offsetHeight };
                            setSizes(prev => ({ ...prev, [p]: s }));
                          }
                          if (p === 1 && !hasAutoFitRef.current) {
                            hasAutoFitRef.current = true;
                            fitToContainer(page);
                          }
                        }, 50);
                      }}
                    />

                    {/* Annotation canvas — always captures pointer events (mouse + stylus) */}
                    <canvas
                      ref={el => { canvasRefs.current[p] = el; }}
                      className="absolute top-0 left-0"
                      style={{
                        cursor: cursorStyle,
                        touchAction: "none",
                        // Capture input only in annotate/missing/comment modes; fingers still scroll natively
                        pointerEvents: annotateMode || tool === "missing" || tool === "comment" ? "auto" : "none",
                      }}
                      width={size.width}
                      height={size.height}
                      onPointerDown={(e) => handlePointerDown(e, p)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    />

                    {/* Text notes — click to edit, drag to move */}
                    {annList.map((ann, idx) => {
                      if (ann.type !== "text" || ann.page !== p) return null;
                      const tx = ann.x * size.width - 3;
                      const ty = ann.y * size.height - 15;
                      if (editingNote === idx) {
                        return (
                          <input
                            key={idx}
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={commitNoteEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitNoteEdit();
                              if (e.key === "Escape") { setEditingNote(null); setEditText(""); }
                            }}
                            style={{
                              position: "absolute",
                              left: tx,
                              top: ty,
                              zIndex: 30,
                              background: "rgba(255,255,255,0.98)",
                              border: "2px solid #2563eb",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontSize: 13,
                              fontWeight: "bold",
                              minWidth: 120,
                              outline: "none",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                            }}
                          />
                        );
                      }
                      return (
                        <div
                          key={idx}
                          onPointerDown={(e) => startNoteDrag(e, idx, ann)}
                          onPointerMove={moveNoteDrag}
                          onPointerUp={() => endNoteDrag(ann)}
                          onPointerCancel={() => { noteDragRef.current = null; }}
                          title="Click to edit · Drag to move"
                          style={{
                            position: "absolute",
                            left: tx,
                            top: ty,
                            zIndex: 15,
                            cursor: "move",
                            background: "rgba(255,255,255,0.95)",
                            border: `2px solid ${ann.color}`,
                            borderRadius: 4,
                            padding: "1px 6px",
                            fontSize: 13,
                            fontWeight: "bold",
                            color: "#111827",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                          }}
                        >
                          {ann.text}
                        </div>
                      );
                    })}

                    {/* Comment bubbles — pinned team comments; when the comment tool is active, clicking the × removes it */}
                    {annList.map((ann, idx) => {
                      if (ann.type !== "comment" || ann.page !== p) return null;
                      return (
                        <div
                          key={`cmt-${idx}`}
                          style={{
                            position: "absolute",
                            left: ann.x * size.width + 6,
                            top: ann.y * size.height - 6,
                            zIndex: 22,
                            maxWidth: Math.min(260, size.width * 0.55),
                          }}
                          className="group flex items-start gap-1"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div
                            className="bg-violet-50 border-2 border-violet-500 rounded-lg px-2.5 py-1.5 shadow-md"
                            title={ann.author ? `Comment by ${ann.author}` : "Team comment"}
                          >
                            {ann.author && (
                              <p className="text-[10px] font-bold text-violet-700 leading-tight">{ann.author}</p>
                            )}
                            <p className="text-xs text-slate-800 leading-snug whitespace-pre-wrap">{ann.text}</p>
                          </div>
                          {tool === "comment" && (
                            <button
                              type="button"
                              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                              onClick={() => {
                                const next = annList.filter((_, i) => i !== idx);
                                setAnnList(next);
                                if (!annotateMode) onSave(next, aiNotes, true);
                              }}
                              className="bg-white border border-slate-300 rounded-full p-0.5 shadow hover:bg-red-50 hover:border-red-400 text-slate-500 hover:text-red-600"
                              title="Delete comment"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Floating comment input */}
                    {commentInput && commentInput.page === p && (
                      <div
                        style={{
                          position: "absolute",
                          left: commentInput.x,
                          top: commentInput.y - 10,
                          zIndex: 30,
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <textarea
                          autoFocus
                          rows={2}
                          value={commentValue}
                          onChange={e => setCommentValue(e.target.value)}
                          onBlur={commitComment}
                          onKeyDown={e => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitComment();
                            if (e.key === "Escape") { setCommentInput(null); setCommentValue(""); }
                          }}
                          className="w-56 border-2 border-violet-500 rounded-lg p-2 text-xs shadow-lg outline-none bg-white"
                          placeholder={currentUserName ? `Comment as ${currentUserName}... (Enter to post)` : "Type comment... (Enter to post)"}
                        />
                        <p className="text-[10px] text-violet-700 mt-0.5 px-1">Ctrl+Enter to post · Esc to cancel</p>
                      </div>
                    )}

                    {/* Floating text input */}
                    {textInput && textInput.page === p && (
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

                    {/* Floating "Create Pick Up" action near the latest highlight on this page */}
                    {pending.length > 0 && onRequestPickup && lh && (
                      <button
                        type="button"
                        onPointerDown={(e) => { e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); handleCreatePickup(p); }}
                        style={{
                          position: "absolute",
                          left: Math.min(size.width - 200, (lh.x + lh.w) * size.width),
                          top: Math.max(2, lh.y * size.height - 34),
                          zIndex: 25,
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-lg"
                        title="Create Pick Up item(s) from the highlighted spec rows"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" /> Create Pick Up{pending.length > 1 ? ` (${pending.length})` : ""}
                      </button>
                    )}

                    {/* Floating "Report Missing Item" action near the latest selection rect on this page */}
                    {(missingRects[p] || []).length > 0 && onRequestMissing && (() => {
                      const rects = missingRects[p];
                      const last = rects[rects.length - 1];
                      return (
                        <button
                          type="button"
                          onPointerDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); handleReportMissing(p); }}
                          style={{
                            position: "absolute",
                            left: Math.min(size.width - 220, (last.x + last.w) * size.width),
                            top: Math.max(2, (last.y + last.h) * size.height + 6),
                            zIndex: 25,
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg"
                          title="Report missing item(s) from the highlighted spec rows"
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Report Missing Item{rects.length > 1 ? ` (${rects.length})` : ""}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </Document>
        </div>

        {/* Room Info overlay — files, images and notes for this room */}
        {showRoomInfo && roomInfo && (
          <RoomFilesModal
            projectId={roomInfo.projectId}
            projectName={roomInfo.projectName}
            roomName={roomInfo.roomName}
            onClose={() => setShowRoomInfo(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}