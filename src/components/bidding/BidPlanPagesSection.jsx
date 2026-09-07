import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { pdfjs } from "react-pdf";
import { X, Loader2 } from "lucide-react";
import { HIGHLIGHT_COLORS } from "./highlightLegend";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

// Renders every plan page that carries highlights as a FLATTENED image — the
// original PDF page with the highlight overlays baked in (same fills/borders/
// labels as the Annotate Plan canvas) — via pdf.js, so the result is a plain
// <img> that survives the print/PDF window's innerHTML copy and email bodies.
// Pulls only from the bid's own saved annotations (its snapshot), never from
// current catalog/pricing data.
export default function BidPlanPagesSection({ pdfUrl, annotations = [] }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomed, setZoomed] = useState(null);

  const highlightPages = useMemo(
    () => [...new Set((annotations || []).filter(a => a?.type === "highlight" && a.page != null).map(a => a.page))].sort((a, b) => a - b),
    [annotations]
  );

  useEffect(() => {
    if (!pdfUrl || highlightPages.length === 0) { setPages([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let doc = null;
      try {
        doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        const out = [];
        for (const pageNum of highlightPages) {
          if (cancelled) break;
          if (pageNum < 1 || pageNum > doc.numPages) continue;
          const page = await doc.getPage(pageNum);
          const base = page.getViewport({ scale: 1 });
          const s = Math.min(2.2, 1600 / base.width);
          const viewport = page.getViewport({ scale: s });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          // Bake the highlight overlays in the same style as the annotator canvas:
          // translucent fill, colored border, item label + room name.
          (annotations || []).filter(a => a?.type === "highlight" && a.page === pageNum).forEach(a => {
            const x = a.x != null ? a.x : (a.rx != null ? a.rx * base.width : 0);
            const y = a.y != null ? a.y : (a.ry != null ? a.ry * base.height : 0);
            const w = a.w != null ? a.w : (a.rw != null ? a.rw * base.width : 0);
            const h = a.h != null ? a.h : (a.rh != null ? a.rh * base.height : 0);
            const [r, g, b] = hexToRgb(a.color);
            ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
            ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
            ctx.lineWidth = 1.5 * s;
            ctx.fillRect(x * s, y * s, w * s, h * s);
            ctx.strokeRect(x * s, y * s, w * s, h * s);
            const lbl = a.label || HIGHLIGHT_COLORS.find(c => c.color === (a.color || "").toLowerCase())?.label;
            if (lbl) {
              ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
              ctx.fillStyle = `rgba(${r},${g},${b},1)`;
              ctx.fillText(lbl, x * s + 3 * s, y * s + 12 * s);
            }
            if (a.room_name) {
              ctx.font = `${Math.round(9 * s)}px sans-serif`;
              ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
              ctx.fillText(a.room_name, x * s + 3 * s, y * s + 23 * s);
            }
          });
          out.push({ page: pageNum, img: canvas.toDataURL("image/jpeg", 0.85) });
        }
        if (!cancelled) setPages(out);
      } catch (e) {
        console.error("[Plan Reference] Failed to render highlighted plan pages:", e);
        if (!cancelled) setError("Plan pages could not be loaded.");
      } finally {
        try { doc?.destroy?.(); } catch (_) {}
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl, highlightPages]);

  if (!pdfUrl || highlightPages.length === 0) return null;

  return (
    <div className="plan-section mt-8 border-t-2 border-amber-800 pt-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-1">Plan Reference</h3>
      <p className="text-xs text-slate-500 mb-3">Where your cabinets are located — the highlighted areas of your floor plans correspond to the items in this estimate.</p>

      {/* Color legend (same colors as the plan markup) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        {HIGHLIGHT_COLORS.map(c => (
          <span key={c.color} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="w-3.5 h-3.5 rounded-sm border border-black/20 inline-block" style={{ backgroundColor: c.color, opacity: 0.75 }} />
            {c.label}
          </span>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Preparing plan pages...
        </div>
      )}
      {error && !loading && (
        <p className="text-xs text-slate-400 italic py-4">{error}</p>
      )}

      <div className="space-y-5">
        {pages.map(p => (
          <div key={p.page} className="plan-page">
            <p className="text-xs font-semibold text-slate-400 mb-1">Plan Page {p.page}</p>
            <img
              src={p.img}
              alt={`Plan page ${p.page} with highlighted cabinet locations`}
              className="w-full rounded-lg border border-slate-200 shadow-sm cursor-zoom-in"
              onClick={() => setZoomed(p.img)}
            />
          </div>
        ))}
      </div>

      {/* Click-to-zoom lightbox — portaled outside the printed content so it never
          leaks into the Print/PDF copy or the email body. */}
      {zoomed && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col" onClick={() => setZoomed(null)}>
          <div className="flex items-center justify-end p-3">
            <button className="text-white/80 hover:text-white p-1" onClick={() => setZoomed(null)} title="Close">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 pt-0" onClick={e => e.stopPropagation()}>
            <img src={zoomed} alt="Plan page detail" className="max-w-none w-full" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}