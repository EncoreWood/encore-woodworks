import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Printer, Send, ChevronLeft, Copy, Trash2, Edit2 } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import ProjectSelector from "@/components/presentations/ProjectSelector";
import SlideThumbnailStrip from "@/components/presentations/SlideThumbnailStrip";
import { parseImages, parseSpec } from "@/components/presentations/SlidePreview";
import FabricSlideCanvas, { CANVAS_W, CANVAS_H } from "@/components/presentations/FabricSlideCanvas";
import SendToClientModal from "@/components/presentations/SendToClientModal";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700 border-slate-300",
  ready: "bg-blue-100 text-blue-700 border-blue-300",
  sent: "bg-green-100 text-green-700 border-green-300",
};

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function navigateTo(mode, id = null) {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (id) params.set("id", id);
  window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
  window.dispatchEvent(new Event("popstate"));
}

// ─── COVER THUMBNAIL ─────────────────────────────────────────────────────────
function CoverThumb({ presId }) {
  const { data: slides = [] } = useQuery({
    queryKey: ["slides-thumb", presId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presId }, "sort_order"),
    staleTime: 60000,
  });
  const first = slides[0];
  const thumb = first?.thumbnail_url || (first ? (parseImages(first.image_3d_url)[0]?.url) : null);
  if (thumb) return <img src={thumb} alt="" className="w-full h-full" style={{ objectFit: "contain", background: "#f8fafc" }} />;
  return <span className="text-xs text-slate-400">{slides.length} slide{slides.length !== 1 ? "s" : ""}</span>;
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function PresentationsList({ onNew }) {
  const queryClient = useQueryClient();
  const { data: presentations = [] } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => base44.entities.Presentation.list("-created_date"),
  });

  const handleDuplicate = async (pres) => {
    const { id, created_date, updated_date, ...rest } = pres;
    const newPres = await base44.entities.Presentation.create({ ...rest, project_name: rest.project_name + " (Copy)", status: "draft" });
    const slides = await base44.entities.PresentationSlide.filter({ presentation_id: id }, "sort_order");
    for (const s of slides) {
      const { id: sid, created_date: sc, updated_date: su, ...srest } = s;
      await base44.entities.PresentationSlide.create({ ...srest, presentation_id: newPres.id });
    }
    queryClient.invalidateQueries({ queryKey: ["presentations"] });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this presentation?")) return;
    const slides = await base44.entities.PresentationSlide.filter({ presentation_id: id });
    for (const s of slides) await base44.entities.PresentationSlide.delete(s.id);
    await base44.entities.Presentation.delete(id);
    queryClient.invalidateQueries({ queryKey: ["presentations"] });
  };

  return (
    <div className="min-h-screen p-6 sm:p-8" style={{ backgroundColor: "#d1d5db" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Presentations</h1>
            <p className="text-slate-600 text-sm mt-1">Create and manage 3D design presentations for clients</p>
          </div>
          <Button onClick={onNew} className="bg-amber-700 hover:bg-amber-800 gap-2">
            <Plus className="w-4 h-4" /> New Presentation
          </Button>
        </div>

        {presentations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <p className="text-slate-500 mb-4">No presentations yet.</p>
            <Button onClick={onNew} className="bg-amber-700 hover:bg-amber-800 gap-2">
              <Plus className="w-4 h-4" /> Create first presentation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {presentations.map(pres => (
              <div key={pres.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className="h-36 bg-slate-100 flex items-center justify-center text-slate-300 text-sm border-b border-slate-100">
                  <CoverThumb presId={pres.id} />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{pres.project_name}</h3>
                      <p className="text-sm text-slate-500 truncate">{pres.client_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_COLORS[pres.status]}`}>
                      {pres.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{format(new Date(pres.created_date), "MMM d, yyyy")}</p>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" className="flex-1 bg-amber-700 hover:bg-amber-800 gap-1" onClick={() => navigateTo("editor", pres.id)}>
                      <Edit2 className="w-3 h-3" /> Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(pres)} title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(pres.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EDITOR VIEW ──────────────────────────────────────────────────────────────
function PresentationEditor({ presId }) {
  const queryClient = useQueryClient();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [slides, setSlides] = useState([]);
  const [presData, setPresData] = useState(null);
  const [showSend, setShowSend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const editorPanelRef = useRef(null);

  const { data: presentation, isLoading: presLoading } = useQuery({
    queryKey: ["presentation", presId],
    queryFn: () => base44.entities.Presentation.list().then(l => l.find(p => p.id === presId)),
    enabled: !!presId,
  });

  const { data: existingSlides = [], isLoading: slidesLoading } = useQuery({
    queryKey: ["slides", presId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presId }, "sort_order"),
    enabled: !!presId,
  });

  useEffect(() => {
    if (presentation) setPresData({ ...presentation });
  }, [presentation]);

  useEffect(() => {
    if (existingSlides.length > 0) setSlides([...existingSlides]);
  }, [existingSlides]);

  const scheduleAutoSave = (updatedSlides, updatedPres) => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const slidesToSave = updatedSlides || slides;
    const presToSave = updatedPres || presData;
    const t = setTimeout(() => doSave(slidesToSave, presToSave), 2000);
    setAutoSaveTimer(t);
  };

  const doSave = async (slidesToSave, presToSave) => {
    setSaving(true);
    if (presToSave?.id) {
      await base44.entities.Presentation.update(presToSave.id, {
        project_name: presToSave.project_name,
        client_name: presToSave.client_name,
        status: presToSave.status,
      });
    }
    const existingIds = new Set(existingSlides.map(s => s.id));
    const updatedSlides = [...slidesToSave];
    for (let i = 0; i < updatedSlides.length; i++) {
      const slide = { ...updatedSlides[i], presentation_id: presId, sort_order: i };
      if (slide.id && existingIds.has(slide.id)) {
        // Always persist canvas_json and thumbnail_url so sidebar stays current
        await base44.entities.PresentationSlide.update(slide.id, {
          ...slide,
          canvas_json: slide.canvas_json,
          thumbnail_url: slide.thumbnail_url,
        });
      } else if (!slide.id) {
        const created = await base44.entities.PresentationSlide.create(slide);
        updatedSlides[i] = created;
      }
    }
    setSlides(updatedSlides);
    queryClient.invalidateQueries({ queryKey: ["presentations"] });
    setSaving(false);
  };

  const updateSlide = (idx, patch) => {
    const updated = slides.map((s, i) => i === idx ? { ...s, ...patch } : s);
    setSlides(updated);
    scheduleAutoSave(updated, null);
  };

  const addSlide = () => {
    const newSlide = { room_name: "New Room", slide_label: "", notes: "{}", image_3d_url: "[]", sort_order: slides.length };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setSelectedIdx(updated.length - 1);
    scheduleAutoSave(updated, null);
  };

  const reorderSlides = (fromIdx, toIdx) => {
    const updated = [...slides];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setSlides(updated);
    setSelectedIdx(toIdx);
    scheduleAutoSave(updated, null);
  };

  const deleteSlide = async (idx) => {
    if (!confirm("Delete this slide?")) return;
    const slide = slides[idx];
    if (slide?.id) await base44.entities.PresentationSlide.delete(slide.id);
    const updated = slides.filter((_, i) => i !== idx);
    setSlides(updated);
    setSelectedIdx(Math.max(0, idx - 1));
  };

  const updatePres = (patch) => {
    const updated = { ...presData, ...patch };
    setPresData(updated);
    scheduleAutoSave(null, updated);
  };

  if (presLoading || slidesLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!presData) return <div className="p-8 text-center text-slate-500">Presentation not found.</div>;

  const currentSlide = slides[selectedIdx];

  // Export all slides to a landscape PDF using saved thumbnails (reliable, no CORS issues)
  const handleExportPDF = async () => {
    setIsPrinting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [11, 8.5] });

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        // Use the saved thumbnail (already rendered PNG), fall back to blank white page
        const dataUrl = slide.thumbnail_url;
        if (!dataUrl) continue;

        if (i > 0) pdf.addPage([11, 8.5], "landscape");
        pdf.addImage(dataUrl, "PNG", 0, 0, 11, 8.5);
      }

      // Save the PDF file
      const fileName = `${presData.project_name || "presentation"}.pdf`;
      pdf.save(fileName);

      // Also open print dialog using the PDF blob
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWin = window.open(blobUrl, "_blank");
      if (printWin) {
        printWin.onload = () => {
          printWin.focus();
          printWin.print();
        };
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      {/* Editor UI */}
      <div className="flex flex-col h-screen bg-slate-200">
        {/* Toolbar */}
        <div className="no-print bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0 z-10">
          <button
            onClick={() => navigateTo("list")}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <input
            className="font-semibold text-slate-900 text-sm border-none outline-none bg-transparent min-w-0 flex-1"
            value={presData.project_name || ""}
            onChange={e => updatePres({ project_name: e.target.value })}
            placeholder="Presentation title"
          />
          <Select value={presData.status || "draft"} onValueChange={v => updatePres({ status: v })}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-400">{saving ? "Saving..." : "Saved"}</span>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5" disabled={isPrinting}>
            <Printer className="w-3.5 h-3.5" /> {isPrinting ? "Preparing..." : "Export PDF"}
          </Button>
          <Button size="sm" className="bg-amber-700 hover:bg-amber-800 gap-1.5" onClick={() => setShowSend(true)}>
            <Send className="w-3.5 h-3.5" /> Send to Client
          </Button>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: thumbnail strip */}
          <div className="no-print w-52 bg-white border-r border-slate-200 p-3 flex flex-col overflow-hidden flex-shrink-0">
            <SlideThumbnailStrip
              slides={slides}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
              onAdd={addSlide}
              onReorder={reorderSlides}
            />
          </div>

          {/* Right: Fabric canvas slide editor */}
          <div ref={editorPanelRef} className="flex-1 overflow-y-auto p-6 bg-slate-200">
            {currentSlide ? (
              <div className="flex flex-col items-center gap-3">
                <FabricSlideCanvas
                  key={currentSlide.id || selectedIdx}
                  slide={currentSlide}
                  onUpdate={(patch) => updateSlide(selectedIdx, patch)}
                  editable={true}
                  containerWidth={editorPanelRef.current?.offsetWidth || 1100}
                />
                <div className="no-print">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => deleteSlide(selectedIdx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Slide
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="mb-4">No slides yet.</p>
                <Button onClick={addSlide} className="bg-amber-700 hover:bg-amber-800 gap-2">
                  <Plus className="w-4 h-4" /> Add First Slide
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SendToClientModal
        open={showSend}
        onOpenChange={setShowSend}
        presentation={presData}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["presentations"] })}
      />
    </>
  );
}

// ─── SHARE VIEW ───────────────────────────────────────────────────────────────
function ShareView({ token }) {
  const [idx, setIdx] = useState(0);

  const { data: presentation } = useQuery({
    queryKey: ["pres-share", token],
    queryFn: () => base44.entities.Presentation.filter({ shared_link_token: token }).then(r => r[0]),
    enabled: !!token,
  });

  const { data: slides = [] } = useQuery({
    queryKey: ["slides-share", presentation?.id],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presentation.id }, "sort_order"),
    enabled: !!presentation?.id,
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slides]);

  if (!presentation) return <div className="p-8 text-center">Loading...</div>;

  const slide = slides[idx];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full">
        {idx === 0 && slides.length === 0 ? (
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">{presentation.project_name}</h1>
            <p className="text-2xl text-slate-300">{presentation.client_name}</p>
          </div>
        ) : slide ? (
          <div className="w-full flex justify-center">
            <FabricSlideCanvas
              key={slide.id}
              slide={slide}
              onUpdate={() => {}}
              editable={false}
              containerWidth={900}
            />
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">{presentation.project_name}</h1>
            <p className="text-2xl text-slate-300">{presentation.client_name}</p>
          </div>
        )}
      </div>
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-2 hover:bg-slate-700 rounded disabled:opacity-40">◀</button>
          <span className="text-slate-400 text-sm">{idx + 1} / {Math.max(slides.length, 1)}</span>
          <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx >= slides.length - 1} className="p-2 hover:bg-slate-700 rounded disabled:opacity-40">▶</button>
        </div>
        <span className="text-slate-500 text-sm">{presentation.project_name}</span>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Presentations() {
  const [mode, setMode] = useState(() => getUrlParams().get("mode") || "list");
  const [presId, setPresId] = useState(() => getUrlParams().get("id"));
  const [shareToken, setShareToken] = useState(() => getUrlParams().get("token"));
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    const handler = () => {
      const p = getUrlParams();
      setMode(p.get("mode") || "list");
      setPresId(p.get("id"));
      setShareToken(p.get("token"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const handleProjectSelected = (pres) => {
    setShowNewDialog(false);
    navigateTo("editor", pres.id);
  };

  if (shareToken) return <ShareView token={shareToken} />;
  if (mode === "editor" && presId) return <PresentationEditor presId={presId} />;

  return (
    <>
      <PresentationsList onNew={() => setShowNewDialog(true)} />
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Presentation</DialogTitle></DialogHeader>
          <ProjectSelector onProjectSelected={handleProjectSelected} />
        </DialogContent>
      </Dialog>
    </>
  );
}