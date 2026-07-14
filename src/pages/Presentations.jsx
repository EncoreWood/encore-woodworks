import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Printer, Send, ChevronLeft, ChevronRight, Copy, Trash2, Edit2, Save, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProjectSelector from "@/components/presentations/ProjectSelector";
import SendToClientModal from "@/components/presentations/SendToClientModal";
import SlideThumbnailPanel from "@/components/presentations/SlideThumbnailPanel";
import SlideCard from "@/components/presentations/SlideCard";
import SlidePropertiesPanel from "@/components/presentations/SlidePropertiesPanel";
import { parseSpecs, parseImageUrl, SPEC_FIELDS } from "@/components/presentations/slideHelpers";

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

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── COVER THUMBNAIL ─────────────────────────────────────────────────────────
function CoverThumb({ presId }) {
  const { data: slides = [] } = useQuery({
    queryKey: ["slides-thumb", presId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presId }, "sort_order"),
    staleTime: 60000,
  });
  const first = slides[0];
  const img = first ? parseImageUrl(first.image_3d_url) : null;
  if (img) return <img src={img} alt="" className="w-full h-full" style={{ objectFit: "cover" }} />;
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

  // Refs for latest data in async closures
  const slidesRef = useRef([]);
  const presDataRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    if (presentation) {
      setPresData({ ...presentation });
      presDataRef.current = { ...presentation };
    }
  }, [presentation]);

  useEffect(() => {
    if (existingSlides.length > 0) {
      setSlides([...existingSlides]);
      slidesRef.current = [...existingSlides];
    }
  }, [existingSlides]);

  const scheduleAutoSave = (updatedSlides, updatedPres) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (updatedSlides) slidesRef.current = updatedSlides;
    if (updatedPres) presDataRef.current = updatedPres;
    autoSaveTimerRef.current = setTimeout(() => doSave(slidesRef.current, presDataRef.current), 1500);
  };

  const doSave = async (slidesToSave, presToSave) => {
    setSaving(true);
    try {
      if (presToSave?.id) {
        await base44.entities.Presentation.update(presToSave.id, {
          project_name: presToSave.project_name,
          client_name: presToSave.client_name,
          status: presToSave.status,
        });
      }
      const updated = [...slidesToSave];
      for (let i = 0; i < updated.length; i++) {
        const slideData = {
          presentation_id: presId,
          sort_order: i,
          room_name: updated[i].room_name,
          slide_label: updated[i].slide_label,
          image_3d_url: updated[i].image_3d_url,
          image_2d_url: updated[i].image_2d_url,
          specs: updated[i].specs,
          notes: updated[i].notes,
        };
        if (updated[i].id) {
          await base44.entities.PresentationSlide.update(updated[i].id, slideData);
        } else {
          const created = await base44.entities.PresentationSlide.create(slideData);
          updated[i] = { ...updated[i], id: created.id };
          slidesRef.current = updated;
        }
      }
      setSlides([...updated]);
      queryClient.invalidateQueries({ queryKey: ["presentations"] });
      queryClient.invalidateQueries({ queryKey: ["slides", presId] });
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (idx, patch) => {
    const updated = slidesRef.current.map((s, i) => i === idx ? { ...s, ...patch } : s);
    slidesRef.current = updated;
    setSlides(updated);
    scheduleAutoSave(updated, null);
  };

  const addSlide = () => {
    const newSlide = {
      room_name: "New Room",
      slide_label: "",
      notes: "",
      image_3d_url: null,
      image_2d_url: null,
      specs: "{}",
      sort_order: slides.length,
    };
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
    slidesRef.current = updated;
    setSelectedIdx(Math.max(0, idx - 1));
    queryClient.invalidateQueries({ queryKey: ["slides", presId] });
  };

  const updatePres = (patch) => {
    const updated = { ...presDataRef.current, ...patch };
    presDataRef.current = updated;
    setPresData(updated);
    scheduleAutoSave(null, updated);
  };

  // Arrow key navigation between slides
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.key === "ArrowLeft") setSelectedIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setSelectedIdx(i => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slides.length]);

  if (presLoading || slidesLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!presData) return <div className="p-8 text-center text-slate-500">Presentation not found.</div>;

  const currentSlide = slides[selectedIdx];

  // Print / PDF — open a new window with all slides, one per letter-landscape page
  const handlePrint = () => {
    const slidesHTML = slides.map(slide => {
      const specs = parseSpecs(slide);
      const img3d = parseImageUrl(slide.image_3d_url);
      const img2d = slide.image_2d_url;
      return `
        <div class="slide-page">
          <div class="slide-header">
            <h1>${escapeHtml(slide.room_name || "")}</h1>
            ${slide.slide_label ? `<p>${escapeHtml(slide.slide_label)}</p>` : ""}
          </div>
          <div class="slide-images">
            ${img3d ? `<img src="${img3d}" class="main-img" />` : ""}
            ${img2d ? `<img src="${img2d}" class="second-img" />` : ""}
          </div>
          <table class="specs-table">
            <tr>${SPEC_FIELDS.map(f => `<th>${f.label}</th>`).join("")}</tr>
            <tr>${SPEC_FIELDS.map(f => `<td>${escapeHtml(specs[f.key] || "")}</td>`).join("")}</tr>
          </table>
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(presData.project_name || "Presentation")}</title>
      <style>
        @page { size: letter landscape; margin: 0.5in; }
        body { margin: 0; font-family: Georgia, serif; color: #1e293b; }
        .slide-page { width: 100%; min-height: 7.5in; page-break-after: always; display: flex; flex-direction: column; }
        .slide-page:last-child { page-break-after: auto; }
        .slide-header { border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
        .slide-header h1 { font-size: 28px; margin: 0; font-weight: bold; }
        .slide-header p { font-size: 14px; color: #64748b; margin: 4px 0 0; }
        .slide-images { flex: 1; display: flex; gap: 12px; align-items: center; justify-content: center; min-height: 3in; }
        .main-img { max-width: 65%; max-height: 3.5in; object-fit: contain; }
        .second-img { max-width: 30%; max-height: 3.5in; object-fit: contain; }
        .specs-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; table-layout: fixed; }
        .specs-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-weight: 600; }
        .specs-table td { border: 1px solid #cbd5e1; padding: 4px 6px; word-wrap: break-word; }
      </style>
    </head><body>${slidesHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-200">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 sm:gap-3 flex-shrink-0 z-10 flex-wrap">
        <button
          onClick={() => navigateTo("list")}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-px h-5 bg-slate-200 hidden sm:block" />
        <input
          className="font-semibold text-slate-900 text-sm border-none outline-none bg-transparent min-w-0 flex-1"
          value={presData.project_name || ""}
          onChange={e => updatePres({ project_name: e.target.value })}
          placeholder="Presentation title"
        />
        <Select value={presData.status || "draft"} onValueChange={v => updatePres({ status: v })}>
          <SelectTrigger className="h-8 w-24 text-xs flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
        {presData.project_id && (
          <Link to={createPageUrl("ProjectDetails") + "?id=" + presData.project_id} className="flex-shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View Project</span>
            </Button>
          </Link>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => doSave(slidesRef.current, presDataRef.current)}
          disabled={saving}
          className="gap-1.5 flex-shrink-0"
        >
          <Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 flex-shrink-0">
          <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Print</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 flex-shrink-0">
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button
          size="sm"
          className="bg-amber-700 hover:bg-amber-800 gap-1.5 flex-shrink-0"
          onClick={() => setShowSend(true)}
        >
          <Send className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Send to Client</span>
        </Button>
      </div>

      {/* ── 3-Panel Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: thumbnails */}
        <div className="w-44 lg:w-52 bg-white border-r border-slate-200 p-3 flex-shrink-0 overflow-hidden hidden sm:block">
          <SlideThumbnailPanel
            slides={slides}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            onAdd={addSlide}
            onReorder={reorderSlides}
          />
        </div>

        {/* Center: slide editor */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 flex flex-col">
          {currentSlide ? (
            <>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div style={{ width: "100%", maxWidth: "1000px" }}>
                  <SlideCard
                    key={selectedIdx}
                    slide={currentSlide}
                    onUpdate={(patch) => updateSlide(selectedIdx, patch)}
                    editable={true}
                  />
                </div>
              </div>
              {/* Navigation arrows + counter */}
              <div className="flex items-center justify-center gap-4 py-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
                  disabled={selectedIdx === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 font-medium min-w-[50px] text-center">
                  {selectedIdx + 1} / {slides.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedIdx(i => Math.min(slides.length - 1, i + 1))}
                  disabled={selectedIdx >= slides.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="mb-4">No slides yet.</p>
              <Button onClick={addSlide} className="bg-amber-700 hover:bg-amber-800 gap-2">
                <Plus className="w-4 h-4" /> Add First Slide
              </Button>
            </div>
          )}
        </div>

        {/* Right: properties */}
        <div className="w-64 bg-white border-l border-slate-200 p-4 overflow-y-auto flex-shrink-0 hidden lg:block">
          {currentSlide ? (
            <SlidePropertiesPanel
              slide={currentSlide}
              onUpdate={(patch) => updateSlide(selectedIdx, patch)}
              onDelete={() => deleteSlide(selectedIdx)}
            />
          ) : null}
        </div>
      </div>

      <SendToClientModal
        open={showSend}
        onOpenChange={setShowSend}
        presentation={presData}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["presentations"] })}
      />
    </div>
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
  }, [slides.length]);

  if (!presentation) return <div className="p-8 text-center">Loading...</div>;

  const slide = slides[idx];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {slide ? (
          <div className="w-full" style={{ maxWidth: "1000px" }}>
            <SlideCard key={slide.id} slide={slide} onUpdate={() => {}} editable={false} />
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl font-bold mb-4">{presentation.project_name}</h1>
            <p className="text-xl sm:text-2xl text-slate-300">{presentation.client_name}</p>
          </div>
        )}
      </div>
      <div className="bg-slate-800 border-t border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-2 hover:bg-slate-700 rounded disabled:opacity-40">◀</button>
          <span className="text-slate-400 text-sm">{idx + 1} / {Math.max(slides.length, 1)}</span>
          <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx >= slides.length - 1} className="p-2 hover:bg-slate-700 rounded disabled:opacity-40">▶</button>
        </div>
        <span className="text-slate-500 text-sm truncate ml-4">{presentation.project_name}</span>
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