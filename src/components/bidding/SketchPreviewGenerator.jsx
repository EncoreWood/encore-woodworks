import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Download, BookOpen, Loader2 } from "lucide-react";

/**
 * Builds a layout description string from the sketch paths (highlights).
 */
function buildLayoutDescription(sketchPaths) {
  if (!sketchPaths || sketchPaths.length === 0) return null;
  const highlights = sketchPaths.filter(p => p.type === "highlight");
  if (highlights.length === 0) return null;

  const groups = {};
  highlights.forEach(p => {
    const key = p.cabKey || "base";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const parts = [];
  if (groups.base?.length) {
    const total = groups.base.reduce((s, h) => s + (h.lf || h.wFt || 0), 0);
    parts.push(`${Math.round(total)} LF of base cabinets`);
  }
  if (groups.upper?.length) {
    const total = groups.upper.reduce((s, h) => s + (h.lf || h.wFt || 0), 0);
    parts.push(`${Math.round(total)} LF of upper/wall cabinets`);
  }
  if (groups.tall?.length) {
    const total = groups.tall.reduce((s, h) => s + (h.lf || h.wFt || 0), 0);
    const count = groups.tall.length;
    parts.push(`${count > 1 ? `${count} tall/pantry cabinet sections` : "1 tall pantry section"} (${Math.round(total)} LF)`);
  }
  if (groups.misc?.length) {
    parts.push(`${groups.misc.length} misc/island section(s)`);
  }

  // Detect custom-labeled items for extra description
  const customLabels = highlights.filter(h => h.customLabel).map(h => h.customLabel);
  if (customLabels.length) {
    parts.push(`including: ${customLabels.join(", ")}`);
  }

  return parts.join(", ");
}

/**
 * Builds the image generation prompt.
 */
function buildPrompt({ roomName, layoutDescription, specs }) {
  const { door_style, wood_species } = specs || {};
  const doorPart = door_style ? `${door_style} door style` : "shaker door style";
  const woodPart = wood_species ? `, ${wood_species} wood species` : "";
  const layoutPart = layoutDescription
    ? `Cabinet layout: ${layoutDescription}.`
    : "Standard cabinet layout with base and upper cabinets.";

  return `Clean architectural line drawing sketch of a ${roomName || "room"} cabinet elevation. ${layoutPart} ${doorPart}${woodPart}. Clean architectural line drawing, black and white, no color, no shading, no measurements, white background. Thin clean lines only, simple elevation view, just cabinet outlines and door/drawer lines. No text, no dimensions, no people, no decorations.`;
}

export default function SketchPreviewGenerator({ room, specs, linkedProjectId, onRoomChange }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const sketchPaths = room.sketch_paths || [];
  const generatedImageUrl = room.ai_sketch_url || null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    const layoutDescription = buildLayoutDescription(sketchPaths);
    const prompt = buildPrompt({ roomName: room.room_name, layoutDescription, specs });

    const result = await base44.integrations.Core.GenerateImage({ prompt });
    const url = result?.url;
    if (url) {
      onRoomChange({ ...room, ai_sketch_url: url });
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    const a = document.createElement("a");
    a.href = generatedImageUrl;
    a.download = `${room.room_name || "sketch"}_ai_preview.png`;
    a.target = "_blank";
    a.click();
  };

  const handleSaveToPresentation = async () => {
    if (!generatedImageUrl || !linkedProjectId) return;
    setIsSaving(true);

    // Find or create a Presentation for this project
    let presentations = await base44.entities.Presentation.filter({ project_id: linkedProjectId });
    let presentation = presentations[0];
    if (!presentation) {
      presentation = await base44.entities.Presentation.create({
        project_id: linkedProjectId,
        title: "Cabinet Estimate Sketches",
      });
    }

    // Find highest sort_order in existing slides for this room
    const existingSlides = await base44.entities.PresentationSlide.filter({ presentation_id: presentation.id });
    const roomSlides = existingSlides.filter(s => s.room_name === (room.room_name || "Room"));
    const maxOrder = roomSlides.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);

    await base44.entities.PresentationSlide.create({
      presentation_id: presentation.id,
      room_name: room.room_name || "Room",
      slide_label: `${room.room_name || "Room"} AI Sketch`,
      image_3d_url: JSON.stringify([generatedImageUrl]),
      sort_order: maxOrder + 1,
    });

    setIsSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      {/* Generate button */}
      {!generatedImageUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-8 gap-1.5 text-xs text-slate-600 border-slate-300 hover:bg-slate-50"
        >
          {isGenerating
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating sketch (~10s)...</>
            : <><Sparkles className="w-3.5 h-3.5 text-amber-500" /> ✨ Generate Sketch Preview</>
          }
        </Button>
      )}

      {/* Generated image area */}
      {generatedImageUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">AI Sketch Preview</p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="h-7 gap-1 text-xs"
              >
                {isGenerating
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <RefreshCw className="w-3 h-3" />
                }
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-7 gap-1 text-xs"
              >
                <Download className="w-3 h-3" /> Download
              </Button>
              {linkedProjectId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToPresentation}
                  disabled={isSaving}
                  className="h-7 gap-1 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  {isSaving
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : savedMsg
                      ? <><BookOpen className="w-3 h-3" /> Saved!</>
                      : <><BookOpen className="w-3 h-3" /> Save to Presentation</>
                  }
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
            <img
              src={generatedImageUrl}
              alt={`${room.room_name} AI sketch`}
              className="w-full object-contain max-h-80"
            />
          </div>
        </div>
      )}
    </div>
  );
}