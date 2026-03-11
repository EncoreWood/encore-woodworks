import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Share2, Check } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PresentationView() {
  const urlParams = new URLSearchParams(window.location.search);
  const presentationId = urlParams.get("id");
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data: presentation } = useQuery({
    queryKey: ["presentation", presentationId],
    queryFn: () => base44.entities.Presentation.list().then(list => list.find(p => p.id === presentationId)),
    enabled: !!presentationId,
  });

  const { data: slides = [] } = useQuery({
    queryKey: ["slides", presentationId],
    queryFn: () => base44.entities.PresentationSlide.filter({ presentation_id: presentationId }, "sort_order"),
    enabled: !!presentationId,
  });

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [currentSlideIdx]);

  const nextSlide = () => {
    if (currentSlideIdx < slides.length - 1) setCurrentSlideIdx(currentSlideIdx + 1);
  };

  const prevSlide = () => {
    if (currentSlideIdx > 0) setCurrentSlideIdx(currentSlideIdx - 1);
  };

  const copyShareLink = async () => {
    if (presentation?.shared_link_token) {
      const link = `${window.location.origin}${createPageUrl(`PresentationShare?token=${presentation.shared_link_token}`)}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const markAsReady = async () => {
    if (presentation) {
      await base44.entities.Presentation.update(presentation.id, { status: "ready" });
      window.location.reload();
    }
  };

  const markAsSent = async () => {
    if (presentation) {
      const token = Math.random().toString(36).substring(2, 15);
      await base44.entities.Presentation.update(presentation.id, {
        status: "sent",
        sent_date: format(new Date(), "yyyy-MM-dd"),
        shared_link_token: token,
      });
      window.location.reload();
    }
  };

  if (!presentation || slides.length === 0) return <div className="p-8">Loading...</div>;

  const currentSlide = slides[currentSlideIdx];
  const isCoverSlide = currentSlideIdx === 0;

  return (
    <div className="w-full h-screen bg-slate-900 text-white flex flex-col">
      {/* Cover Slide */}
      {isCoverSlide ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6984bc8fae105e5a06a39d65/db639205f_ew_wood1.png"
            alt="Encore Woodworks"
            className="h-32 mb-8"
          />
          <h1 className="text-5xl font-bold text-center mb-4">{presentation.project_name}</h1>
          <p className="text-2xl text-slate-300 mb-8">{presentation.client_name}</p>
          <p className="text-xl text-slate-400">3D Renderings</p>
          <p className="text-sm text-slate-500 mt-12">{format(new Date(), "MMMM d, yyyy")}</p>
        </div>
      ) : (
        /* Content Slide */
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

      {/* Controls */}
      <div className="bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={prevSlide}
            disabled={currentSlideIdx === 0}
            variant="outline"
            className="text-white border-slate-600 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={nextSlide}
            disabled={currentSlideIdx === slides.length - 1}
            variant="outline"
            className="text-white border-slate-600 hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-slate-400 text-sm ml-4">
            {currentSlideIdx + 1} / {slides.length}
          </span>
        </div>

        <div className="flex gap-2">
          {presentation.status === "draft" && (
            <Button onClick={markAsReady} className="bg-blue-600 hover:bg-blue-700">
              Mark as Ready
            </Button>
          )}
          {presentation.status === "ready" && (
            <Button onClick={markAsSent} className="bg-green-600 hover:bg-green-700">
              Mark as Sent
            </Button>
          )}
          {presentation.shared_link_token && (
            <Button
              onClick={copyShareLink}
              variant="outline"
              className="text-white border-slate-600 hover:bg-slate-700 gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          )}
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="text-white border-slate-600 hover:bg-slate-700"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}