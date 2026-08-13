import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Expand, X, Download, Loader2, Printer } from "lucide-react";
import CoverSlide from "@/components/presentations/CoverSlide";
import { parseSpecs, SPEC_FIELDS, isCoverSlide, parseImagesLayout } from "@/components/presentations/slideHelpers";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Clean HTML content slide for the client view — no Fabric canvas.
 * Image is rendered with object-contain so it fills the slide area at any size
 * (fixes the tiny-image / whitespace bug) and prints/exports cleanly.
 */
function ClientContentSlide({ slide }) {
  const specs = parseSpecs(slide);
  const imgs = parseImagesLayout(slide);
  const img = imgs[0];
  const roomPricingItems = Array.isArray(specs.room_pricing_items) ? specs.room_pricing_items : [];
  const roomTotal = roomPricingItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const hasRoomPricing = roomPricingItems.length > 0 && roomTotal > 0;

  return (
    <div className="bg-white shadow-xl flex flex-col rounded-lg overflow-hidden" style={{ aspectRatio: "11 / 8.5", width: "100%" }}>
      <div className="px-6 pt-4 pb-3 border-b-2 border-slate-800 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900">{slide.room_name}</h2>
            {slide.slide_label ? <p className="text-sm text-slate-500 mt-0.5">{slide.slide_label}</p> : null}
          </div>
          {hasRoomPricing && (
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Room Total</p>
              <p className="text-xl font-bold text-amber-700">${roomTotal.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3 flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        {img ? (
          <img src={img.url} alt={slide.room_name || ""} className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
        ) : (
          <p className="text-sm text-slate-400">No image available</p>
        )}
      </div>

      <div className="px-6 pb-4 pt-2 flex-shrink-0">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "13%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} /><col style={{ width: "10%" }} /><col style={{ width: "9%" }} />
            <col style={{ width: "37%" }} />
          </colgroup>
          <tbody>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td key={f.key} className="border border-slate-300 px-1.5 py-1 text-[10px] font-semibold bg-slate-100 text-slate-600 text-center whitespace-nowrap overflow-hidden text-ellipsis">{f.label}</td>
              ))}
            </tr>
            <tr>
              {SPEC_FIELDS.map(f => (
                <td key={f.key} className="border border-slate-300 px-1.5 py-1 text-[11px] text-blue-700 font-medium truncate" title={specs[f.key] || ""}>{specs[f.key] || "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlideView({ slide }) {
  return isCoverSlide(slide) ? <CoverSlide slide={slide} editable={false} /> : <ClientContentSlide slide={slide} />;
}

export default function ClientPresentationViewer({ presentationId, projectName }) {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const captureRefs = useRef([]);

  useEffect(() => {
    base44.entities.PresentationSlide.filter({ presentation_id: presentationId })
      .then(s => setSlides(s.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [presentationId]);

  const go = (d) => setIdx(i => Math.max(0, Math.min(slides.length - 1, i + d)));

  const buildPDF = async () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [11, 8.5] });
    for (let i = 0; i < slides.length; i++) {
      const node = captureRefs.current[i];
      if (!node) continue;
      // Ensure images are loaded before capture
      const imgs = node.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(im => im.complete ? Promise.resolve() : new Promise(r => { im.onload = r; im.onerror = r; })));
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([11, 8.5], "landscape");
      pdf.addImage(imgData, "JPEG", 0, 0, 11, 8.5);
    }
    return pdf;
  };

  const downloadPDF = async () => {
    if (!slides.length) return;
    setGenerating(true);
    try {
      const pdf = await buildPDF();
      pdf.save(`${(projectName || "presentation").replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Sorry, PDF generation failed. Please try the Print button instead.");
    } finally {
      setGenerating(false);
    }
  };

  const printPDF = async () => {
    if (!slides.length) return;
    setGenerating(true);
    try {
      const pdf = await buildPDF();
      const url = pdf.output("bloburl");
      const w = window.open(url, "_blank");
      if (w) {
        w.addEventListener("load", () => { try { w.focus(); w.print(); } catch {} });
      }
    } catch (e) {
      console.error("Print failed:", e);
      alert("Sorry, print failed. Please use Download PDF instead.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;
  if (!slides.length) return <p className="text-sm text-slate-400 text-center py-6">No presentation available yet.</p>;

  const slide = slides[idx];

  return (
    <div>
      <style>{`
        .cpv-capture { position: absolute; left: -10000px; top: 0; width: 1100px; }
        .cpv-capture-slide { width: 100%; }
        @media print {
          .cpv-screen, .cpv-toolbar, .cpv-nav { display: none !important; }
          .cpv-capture { position: static !important; left: 0 !important; width: 100% !important; }
          .cpv-capture-slide { page-break-after: always; }
          .cpv-capture-slide:last-child { page-break-after: auto; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="cpv-toolbar flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-700 truncate">{projectName}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => setFullscreen(true)} className="gap-1.5">
            <Expand className="w-3.5 h-3.5" /> Expand
          </Button>
          <Button size="sm" variant="outline" onClick={printPDF} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Print
          </Button>
          <Button size="sm" onClick={downloadPDF} disabled={generating} className="bg-amber-600 hover:bg-amber-700 gap-1.5">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Current slide (on screen) */}
      <div className="cpv-screen">
        <SlideView slide={slide} />
      </div>

      {/* Nav */}
      {slides.length > 1 && (
        <div className="cpv-nav flex items-center justify-center gap-3 mt-3">
          <button onClick={() => go(-1)} disabled={idx === 0} className="bg-slate-100 hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-sm text-slate-500 font-medium">{idx + 1} / {slides.length}</span>
          <button onClick={() => go(1)} disabled={idx === slides.length - 1} className="bg-slate-100 hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}

      {/* Off-screen capture container — full-size slides for PDF + print */}
      <div className="cpv-capture" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.id} className="cpv-capture-slide" ref={el => { captureRefs.current[i] = el; }}>
            <SlideView slide={s} />
          </div>
        ))}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-white truncate">{projectName} · Slide {idx + 1} of {slides.length}</p>
            <button onClick={() => setFullscreen(false)} className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium">
              <X className="w-5 h-5" /> Close
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4">
            <div style={{ width: "min(95vw, 1100px)" }}>
              <SlideView slide={slide} />
            </div>
          </div>
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-3 pb-4">
              <button onClick={() => go(-1)} disabled={idx === 0} className="bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <span className="text-sm text-white/80 font-medium">{idx + 1} / {slides.length}</span>
              <button onClick={() => go(1)} disabled={idx === slides.length - 1} className="bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-30 transition-colors">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}