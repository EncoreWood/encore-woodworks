import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import SlideThumbnails from "@/components/presentations/SlideThumbnails.jsx";
import SlideEditor from "@/components/presentations/SlideEditor.jsx";

export default function PresentationEditor() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const presentationId = urlParams.get("id");
  const projectId = urlParams.get("projectId");

  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [isNew, setIsNew] = useState(!presentationId);

  const { data: existingPresentation } = useQuery({
    queryKey: ["presentation", presentationId],
    queryFn: () => base44.entities.Presentation.list().then(list => list.find(p => p.id === presentationId)),
    enabled: !!presentationId,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => base44.entities.Project.list().then(list => list.find(p => p.id === projectId)),
    enabled: !!projectId,
  });

  const { data: existingSlides = [] } = useQuery({
    queryKey: ["slides", presentationId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presentationId }, "sort_order"),
    enabled: !!presentationId,
  });

  // Initialize
  useEffect(() => {
    if (existingPresentation) {
      setPresentation(existingPresentation);
      setSlides(existingSlides);
      setIsNew(false);
    } else if (project) {
      setPresentation({
        project_id: project.id,
        project_name: project.project_name,
        client_name: project.client_name,
        address: project.address,
        cabinet_style: project.cabinet_style,
        wood_species: project.wood_species,
        finish: project.finish,
        status: "draft",
      });
      setIsNew(true);
    }
  }, [existingPresentation, project, existingSlides]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let pres = presentation;
      if (isNew) {
        pres = await base44.entities.Presentation.create(presentation);
        setPresentation(pres);
      } else {
        await base44.entities.Presentation.update(presentation.id, presentation);
      }

      // Save slides
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
    onSuccess: (pres) => {
      setIsNew(false);
      queryClient.invalidateQueries({ queryKey: ["presentation"] });
      queryClient.invalidateQueries({ queryKey: ["slides"] });
    },
  });

  const handleAddSlide = () => {
    setSlides([...slides, { room_name: "New Room", slide_label: "", notes: "", sort_order: slides.length }]);
    setSelectedSlideIdx(slides.length);
  };

  const handleUpdateSlide = (idx, data) => {
    const updated = [...slides];
    updated[idx] = { ...updated[idx], ...data };
    setSlides(updated);
  };

  const handleDeleteSlide = (idx) => {
    if (confirm("Delete this slide?")) {
      setSlides(slides.filter((_, i) => i !== idx));
      setSelectedSlideIdx(Math.max(0, selectedSlideIdx - 1));
    }
  };

  const handleMoveSlide = (idx, direction) => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < slides.length) {
      const updated = [...slides];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      setSlides(updated);
      setSelectedSlideIdx(newIdx);
    }
  };

  if (!presentation) return <div className="p-8">Loading...</div>;

  const currentSlide = slides[selectedSlideIdx];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{presentation.project_name}</h1>
            <p className="text-sm text-slate-600">{presentation.client_name}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
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
        {/* Slides Panel */}
        <div className="w-40 flex flex-col gap-3">
          <Button
            onClick={handleAddSlide}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Slide
          </Button>
          <SlideThumbnails
            slides={slides}
            selectedIdx={selectedSlideIdx}
            onSelect={setSelectedSlideIdx}
          />
        </div>

        {/* Slide Editor */}
        {currentSlide && (
          <div className="flex-1">
            <SlideEditor
              slide={currentSlide}
              onUpdate={(data) => handleUpdateSlide(selectedSlideIdx, data)}
              onDelete={() => handleDeleteSlide(selectedSlideIdx)}
              onMoveUp={() => handleMoveSlide(selectedSlideIdx, "up")}
              onMoveDown={() => handleMoveSlide(selectedSlideIdx, "down")}
              canMoveUp={selectedSlideIdx > 0}
              canMoveDown={selectedSlideIdx < slides.length - 1}
            />
          </div>
        )}
      </div>
    </div>
  );
}