import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Eye, Edit2, Trash2, GripVertical, ArrowUp, ArrowDown, Upload, ChevronLeft, ChevronRight, Share2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import ProjectSelector from "@/components/presentations/ProjectSelector";

const statusColors = {
  draft: "bg-slate-100 text-slate-800",
  ready: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
};

export default function Presentations() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const presentationId = urlParams.get("id");
  const projectId = urlParams.get("projectId");
  const shareToken = urlParams.get("token");

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [slides, setSlides] = useState([]);
  const [copied, setCopied] = useState(false);

  // Data fetching
  const { data: presentations = [], refetch: refetchPresentations } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => base44.entities.Presentation.list("-created_date"),
  });

  const { data: presentation } = useQuery({
    queryKey: ["presentation", presentationId],
    queryFn: () => base44.entities.Presentation.list().then(list => list.find(p => p.id === presentationId)),
    enabled: !!presentationId,
  });

  const { data: sharePresentation } = useQuery({
    queryKey: ["presentation-share", shareToken],
    queryFn: () => base44.entities.Presentation.filter({ shared_link_token: shareToken }).then(list => list[0]),
    enabled: !!shareToken,
  });

  const { data: existingSlides = [] } = useQuery({
    queryKey: ["slides", presentationId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presentationId }, "sort_order"),
    enabled: !!presentationId,
  });

  const { data: shareSlides = [] } = useQuery({
    queryKey: ["slides-share", sharePresentation?.id],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: sharePresentation.id }, "sort_order"),
    enabled: !!sharePresentation,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.list().then(list => list.find(p => p.id === projectId)),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (existingSlides.length > 0) {
      setSlides(existingSlides);
      setCurrentSlideIdx(0);
    }
  }, [existingSlides]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let pres = presentation;
      if (!pres.id) {
        pres = await base44.entities.Presentation.create({
          project_id: presentation.project_id,
          project_name: presentation.project_name,
          client_name: presentation.client_name,
          address: presentation.address,
          status: presentation.status,
        });
      } else {
        await base44.entities.Presentation.update(pres.id, presentation);
      }

      for (let i = 0; i < slides.length; i++) {
        const slide = { ...slides[i], presentation_id: pres.id, sort_order: i };
        if (slide.id) {
          await base44.entities.PresentationSlide.update(slide.id, slide);
        } else {
          await base44.entities.PresentationSlide.create(slide);
        }
      }
      return pres;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presentations"] });
      queryClient.invalidateQueries({ queryKey: ["slides"] });
    },
  });

  const handleDelete = async (id) => {
    if (confirm("Delete this presentation?")) {
      await base44.entities.Presentation.delete(id);
      refetchPresentations();
    }
  };

  const handleProjectSelected = (proj) => {
    setShowNewDialog(false);
    navigateTo("editor", proj.id);
  };

  const navigateTo = (newMode, id = null) => {
    const params = new URLSearchParams();
    params.set("mode", newMode);
    if (id) params.set("id", id);
    window.history.pushState(null, "", `?${params.toString()}`);
    window.location.reload();
  };

  // Keyboard navigation for views
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((mode === "view" || mode === "share") && shareSlides.length > 0) {
        if (e.key === "ArrowLeft" && currentSlideIdx > 0) setCurrentSlideIdx(currentSlideIdx - 1);
        if (e.key === "ArrowRight" && currentSlideIdx < shareSlides.length - 1) setCurrentSlideIdx(currentSlideIdx + 1);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [currentSlideIdx, shareSlides, mode]);

  // LIST VIEW
  if (!mode || mode === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Presentations</h1>
              <p className="text-slate-600 mt-1">Create and manage 3D design presentations</p>
            </div>
            <Button
              onClick={() => setShowNewDialog(true)}
              className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Presentation
            </Button>
          </div>

          {presentations.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-slate-600 mb-4">No presentations yet</p>
              <Button onClick={() => setShowNewDialog(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Create your first presentation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presentations.map((pres) => (
                <div key={pres.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{pres.project_name}</h3>
                        <p className="text-sm text-slate-600">{pres.client_name}</p>
                      </div>
                      <Badge className={statusColors[pres.status]}>
                        {pres.status === "draft" && "Draft"}
                        {pres.status === "ready" && "Ready"}
                        {pres.status === "sent" && "Sent"}
                      </Badge>
                    </div>

                    {pres.address && <p className="text-xs text-slate-500 mb-4">{pres.address}</p>}
                    {pres.sent_date && <p className="text-xs text-slate-500 mb-4">Sent: {format(new Date(pres.sent_date), "MMM d, yyyy")}</p>}
                    <div className="text-xs text-slate-500 mb-4">Created: {format(new Date(pres.created_date), "MMM d, yyyy")}</div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigateTo("editor", pres.id)}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                      </button>
                      <button
                        onClick={() => navigateTo("view", pres.id)}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pres.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Presentation</DialogTitle>
              </DialogHeader>
              <ProjectSelector onProjectSelected={handleProjectSelected} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // EDITOR VIEW
  if (mode === "editor" && presentation) {
    const currentSlide = slides[currentSlideIdx];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{presentation.project_name}</h1>
              <p className="text-sm text-slate-600">{presentation.client_name}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigateTo("list")}>
                Back
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-6 p-6 max-w-7xl mx-auto w-full">
          <div className="w-40 flex flex-col gap-3">
            <Button
              onClick={() => setSlides([...slides, { room_name: "New Room", slide_label: "", notes: "", sort_order: slides.length }])}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Slide
            </Button>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {slides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIdx(idx)}
                  className={`w-full p-2 rounded text-left text-xs border transition-all ${
                    currentSlideIdx === idx ? "border-amber-600 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium truncate">{slide.room_name}</div>
                  {slide.slide_label && <div className="text-slate-500 truncate">{slide.slide_label}</div>}
                </button>
              ))}
            </div>
          </div>

          {currentSlide && (
            <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Name</label>
                <Input
                  value={currentSlide.room_name}
                  onChange={(e) => {
                    const updated = [...slides];
                    updated[currentSlideIdx].room_name = e.target.value;
                    setSlides(updated);
                  }}
                  placeholder="e.g., Kitchen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Slide Label</label>
                <Input
                  value={currentSlide.slide_label || ""}
                  onChange={(e) => {
                    const updated = [...slides];
                    updated[currentSlideIdx].slide_label = e.target.value;
                    setSlides(updated);
                  }}
                  placeholder="e.g., Kitchen Island Option 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">3D Image</label>
                {currentSlide.image_3d_url ? (
                  <div className="space-y-2">
                    <img src={currentSlide.image_3d_url} alt="3D" className="w-full h-48 object-cover rounded" />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const updated = [...slides];
                        updated[currentSlideIdx].image_3d_url = null;
                        setSlides(updated);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-all flex flex-col items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-600">Upload 3D image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                          const updated = [...slides];
                          updated[currentSlideIdx].image_3d_url = file_url;
                          setSlides(updated);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">2D Image</label>
                {currentSlide.image_2d_url ? (
                  <div className="space-y-2">
                    <img src={currentSlide.image_2d_url} alt="2D" className="w-full h-32 object-cover rounded" />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const updated = [...slides];
                        updated[currentSlideIdx].image_2d_url = null;
                        setSlides(updated);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-all flex flex-col items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-600">Upload 2D image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                          const updated = [...slides];
                          updated[currentSlideIdx].image_2d_url = file_url;
                          setSlides(updated);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <Textarea
                  value={currentSlide.notes || ""}
                  onChange={(e) => {
                    const updated = [...slides];
                    updated[currentSlideIdx].notes = e.target.value;
                    setSlides(updated);
                  }}
                  placeholder="Add notes for this slide..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <Button
                  onClick={() => {
                    const updated = [...slides];
                    [updated[currentSlideIdx - 1], updated[currentSlideIdx]] = [updated[currentSlideIdx], updated[currentSlideIdx - 1]];
                    setSlides(updated);
                    setCurrentSlideIdx(currentSlideIdx - 1);
                  }}
                  disabled={currentSlideIdx === 0}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <ArrowUp className="w-3 h-3" />
                  Up
                </Button>
                <Button
                  onClick={() => {
                    const updated = [...slides];
                    [updated[currentSlideIdx], updated[currentSlideIdx + 1]] = [updated[currentSlideIdx + 1], updated[currentSlideIdx]];
                    setSlides(updated);
                    setCurrentSlideIdx(currentSlideIdx + 1);
                  }}
                  disabled={currentSlideIdx === slides.length - 1}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <ArrowDown className="w-3 h-3" />
                  Down
                </Button>
                <Button
                  onClick={() => {
                    if (confirm("Delete this slide?")) {
                      setSlides(slides.filter((_, i) => i !== currentSlideIdx));
                      setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1));
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW & SHARE VIEWS
  const viewSlides = mode === "share" ? shareSlides : existingSlides;
  const viewPresentation = mode === "share" ? sharePresentation : presentation;

  if ((mode === "view" || mode === "share") && viewPresentation && viewSlides.length > 0) {
    const currentSlide = viewSlides[currentSlideIdx];
    const isCoverSlide = currentSlideIdx === 0;

    return (
      <div className="w-full h-screen bg-slate-900 text-white flex flex-col">
        {isCoverSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png"
              alt="Encore Woodworks"
              className="h-32 mb-8"
            />
            <h1 className="text-5xl font-bold text-center mb-4">{viewPresentation.project_name}</h1>
            <p className="text-2xl text-slate-300 mb-8">{viewPresentation.client_name}</p>
            <p className="text-xl text-slate-400">3D Renderings</p>
            <p className="text-sm text-slate-500 mt-12">{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            {currentSlide.image_3d_url && (
              <img
                src={currentSlide.image_3d_url}
                alt={currentSlide.room_name}
                className="max-h-96 max-w-2xl object-cover rounded-lg mb-6"
              />
            )}
            <h2 className="text-4xl font-bold mb-4">{currentSlide.room_name}</h2>
            {currentSlide.notes && (
              <p className="text-slate-300 text-center max-w-2xl mb-6">{currentSlide.notes}</p>
            )}
            {currentSlide.image_2d_url && (
              <img
                src={currentSlide.image_2d_url}
                alt={`${currentSlide.room_name} 2D`}
                className="max-h-48 max-w-xl object-cover rounded-lg"
              />
            )}
          </div>
        )}

        <div className="bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1))}
              disabled={currentSlideIdx === 0}
              className="p-2 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSlideIdx(Math.min(viewSlides.length - 1, currentSlideIdx + 1))}
              disabled={currentSlideIdx === viewSlides.length - 1}
              className="p-2 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-sm ml-4">
              {currentSlideIdx + 1} / {viewSlides.length}
            </span>
          </div>

          {mode === "view" && (
            <div className="flex gap-2">
              {viewPresentation.status === "draft" && (
                <Button
                  onClick={async () => {
                    await base44.entities.Presentation.update(viewPresentation.id, { status: "ready" });
                    queryClient.invalidateQueries({ queryKey: ["presentation"] });
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mark as Ready
                </Button>
              )}
              {viewPresentation.status === "ready" && (
                <Button
                  onClick={async () => {
                    const token = Math.random().toString(36).substring(2, 15);
                    await base44.entities.Presentation.update(viewPresentation.id, {
                      status: "sent",
                      sent_date: format(new Date(), "yyyy-MM-dd"),
                      shared_link_token: token,
                    });
                    queryClient.invalidateQueries({ queryKey: ["presentation"] });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Sent
                </Button>
              )}
              {viewPresentation.shared_link_token && (
                <Button
                  onClick={async () => {
                    const link = `${window.location.origin}${createPageUrl(`Presentations?mode=share&token=${viewPresentation.shared_link_token}`)}`;
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-700 gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              )}
              <Button
                onClick={() => navigateTo("list")}
                variant="outline"
                className="text-white border-slate-600 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="p-8">Loading...</div>;
}