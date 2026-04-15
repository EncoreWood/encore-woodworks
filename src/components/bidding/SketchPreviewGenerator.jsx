import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Download, BookOpen, Loader2 } from "lucide-react";

const CANVAS_W = 2000;

/**
 * Gets the X anchor of a highlight path (wall-based or free-drawn).
 */
function getHighlightX(h) {
  if (h.anchorX !== undefined) return h.anchorX;
  if (h.x1 !== undefined) return Math.min(h.x1, h.x2);
  return 0;
}

/**
 * Builds a dynamic left-to-right layout prompt from sketch highlight paths.
 */
function buildPrompt({ room, specs }) {
  const sketchPaths = room.sketch_paths || [];
  const highlights = sketchPaths.filter(p => p.type === "highlight");
  const ceilingHeight = room.ceiling_height || 96;
  const { door_style, wood_species } = specs || {};
  const doorPart = door_style ? `${door_style} door style` : "Shaker door style";
  const woodPart = wood_species ? `, ${wood_species}` : "";

  if (highlights.length === 0) {
    return `Architectural cabinet elevation line drawing. Single continuous wall view from left to right. Standard kitchen layout: base cabinets at counter height with upper wall cabinets mounted above with a gap, ${doorPart}${woodPart}. Ceiling height ${ceilingHeight} inches. ALL cabinets must appear in ONE single horizontal elevation — do NOT split into separate views. Tall cabinets extend full floor-to-ceiling height. Black and white line drawing only, no color, no shading, no measurements, white background, clean thin lines.`;
  }

  // Sort highlights left to right by X position
  const sorted = [...highlights].sort((a, b) => getHighlightX(a) - getHighlightX(b));

  const tallCabs = highlights.filter(h => h.cabKey === "tall");
  const baseCabs = highlights.filter(h => h.cabKey === "base");
  const upperCabs = highlights.filter(h => h.cabKey === "upper");
  const miscCabs = highlights.filter(h => h.cabKey === "misc" || h.cabKey === "custom");

  const hasTallLeft  = tallCabs.some(h => getHighlightX(h) < CANVAS_W * 0.3);
  const hasTallRight = tallCabs.some(h => getHighlightX(h) > CANVAS_W * 0.7);
  const hasTallMid   = tallCabs.some(h => getHighlightX(h) >= CANVAS_W * 0.3 && getHighlightX(h) <= CANVAS_W * 0.7);

  // Build left-to-right layout description from sorted highlights
  const layoutParts = sorted.map(h => {
    const label = h.customLabel || h.cabKey;
    const widthIn = h.widthIn || (h.x1 !== undefined ? Math.round(Math.abs(h.x2 - h.x1) / 40 * 12) : null);
    const widthStr = widthIn ? ` (${widthIn}" wide)` : "";
    if (h.cabKey === "tall")  return `tall floor-to-ceiling pantry cabinet${widthStr}`;
    if (h.cabKey === "base")  return `base cabinet at counter height${widthStr}`;
    if (h.cabKey === "upper") return `upper wall cabinet mounted above bases${widthStr}`;
    return `${label} cabinet${widthStr}`;
  });

  let layout = "Left to right: " + layoutParts.join(", then ");

  // Add positional tall cabinet notes
  const tallNotes = [];
  if (hasTallLeft)  tallNotes.push("tall floor-to-ceiling cabinet on the far left");
  if (hasTallRight) tallNotes.push("tall floor-to-ceiling cabinet on the far right");
  if (hasTallMid)   tallNotes.push("tall floor-to-ceiling cabinet in the middle");

  const baseLf  = baseCabs.reduce((s, h) => s + (h.widthIn ? h.widthIn / 12 : Math.abs((h.x2||0) - (h.x1||0)) / 40), 0);
  const upperLf = upperCabs.reduce((s, h) => s + (h.widthIn ? h.widthIn / 12 : Math.abs((h.x2||0) - (h.x1||0)) / 40), 0);

  const rules = [
    upperCabs.length > 0 ? "upper wall cabinets are mounted ABOVE the base cabinets with a gap between them" : null,
    tallCabs.length > 0  ? "tall cabinets extend the FULL floor-to-ceiling height" : null,
    baseLf > 0   ? `base cabinets span approximately ${baseLf.toFixed(1)} linear feet` : null,
    upperLf > 0  ? `upper cabinets span approximately ${upperLf.toFixed(1)} linear feet` : null,
    ...tallNotes,
  ].filter(Boolean);

  return `Architectural cabinet elevation line drawing. Single continuous wall view from left to right — do NOT split into separate views. ${layout}. ${rules.join(". ")}. ${doorPart}${woodPart}. Ceiling height ${ceilingHeight} inches. ALL cabinets must appear in ONE single horizontal elevation. Black and white line drawing only, no color, no shading, no measurements, white background, clean thin lines.`;
}

export default function SketchPreviewGenerator({ room, specs, linkedProjectId, onRoomChange }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const sketchPaths = room.sketch_paths || [];
  const generatedImageUrl = room.ai_sketch_url || null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    const prompt = buildPrompt({ room, specs });

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