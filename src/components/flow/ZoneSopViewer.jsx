import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle, Video, Camera, List } from "lucide-react";
import ImageLightbox from "./ImageLightbox";
import VideoLightbox from "./VideoLightbox";

// Step shape is either a plain string (legacy) or an object
// { text, image_url, video_url, subtasks }.
const stepText = (s) => (typeof s === "string" ? s : s?.text || "");
const stepImg = (s) => (typeof s === "string" ? null : s?.image_url || null);
const stepVid = (s) => (typeof s === "string" ? null : s?.video_url || null);
const stepSubs = (s) =>
  typeof s === "string" ? [] : Array.isArray(s?.subtasks) ? s.subtasks : [];

export default function ZoneSopViewer({
  open,
  onClose,
  zone,
  sop,
  flowName,
  stepIndex,
  totalSteps,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onExitToEdit,
}) {
  const [page, setPage] = useState(0); // 0 = Overview, 1..N = step N
  const [checked, setChecked] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const steps = sop?.steps || [];
  const numSteps = steps.length;

  // Reset to Overview + clear checks whenever the zone/SOP changes
  useEffect(() => {
    setPage(0);
    setChecked({});
  }, [zone?.id, sop?.id]);

  if (!open || !zone) return null;

  const isOverview = page === 0;
  const hasStageNav = totalSteps > 0;

  const pageLabel = isOverview
    ? "Overview"
    : `Step ${page} of ${numSteps}`;
  const zoneLabel = hasStageNav ? ` · Zone ${stepIndex + 1}/${totalSteps}` : "";

  const SubtaskList = ({ subs, pageKey }) => (
    <ul className="space-y-1.5">
      {subs.map((sub, si) => {
        const k = `${pageKey}-${si}`;
        const done = !!checked[k];
        return (
          <li key={si} className="flex items-start gap-2">
            <Checkbox
              checked={done}
              onCheckedChange={(v) => setChecked((p) => ({ ...p, [k]: !!v }))}
              className="mt-0.5 h-4 w-4"
            />
            <span className={cn("text-sm text-slate-700", done && "line-through text-slate-400")}>
              {sub}
            </span>
          </li>
        );
      })}
    </ul>
  );

  const StepBody = () => {
    const step = steps[page - 1];
    const text = stepText(step);
    const img = stepImg(step);
    const vid = stepVid(step);
    const subs = stepSubs(step);

    const VideoLink = () =>
      vid ? (
        <button
          type="button"
          onClick={() => setVideoUrl(vid)}
          className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium hover:underline"
        >
          <Video className="w-4 h-4" /> Watch step video
        </button>
      ) : null;

    // Plain text only — no image, no subtasks
    if (!img && subs.length === 0) {
      return (
        <div className="space-y-2">
          <p className="text-base text-slate-800 leading-relaxed">{text}</p>
          <VideoLink />
        </div>
      );
    }

    // Image + subtasks — side by side
    if (img && subs.length > 0) {
      return (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <button type="button" onClick={() => setLightboxUrl(img)} className="block">
              <img src={img} alt="" className="w-full rounded-lg border border-slate-200" />
            </button>
            <VideoLink />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">✅ Subtasks</p>
            <SubtaskList subs={subs} pageKey={page} />
          </div>
        </div>
      );
    }

    // Image only (no subtasks)
    if (img) {
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => setLightboxUrl(img)} className="block">
            <img src={img} alt="" className="w-full rounded-lg border border-slate-200" />
          </button>
          <VideoLink />
        </div>
      );
    }

    // Subtasks only (no image)
    return (
      <div className="max-w-md mx-auto space-y-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">✅ Subtasks</p>
        <SubtaskList subs={subs} pageKey={page} />
        <VideoLink />
      </div>
    );
  };

  const OverviewBody = () => {
    if (!sop) {
      return (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-slate-500 mb-3">No SOP created for this station yet.</p>
          <Button variant="outline" size="sm" onClick={onExitToEdit}>
            Create one in Edit Mode
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{sop.title}</h3>
          {sop.overview && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{sop.overview}</p>}
        </div>

        {sop.required_ppe?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Required PPE
            </p>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
              {sop.required_ppe.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {sop.safety_notes && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Safety Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{sop.safety_notes}</p>
          </div>
        )}

        {sop.common_mistakes && (
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Common Mistakes
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{sop.common_mistakes}</p>
          </div>
        )}

        {numSteps > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">📋 Steps</p>
            <ol className="space-y-0.5">
              {steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setPage(i + 1)}
                    className="flex items-center gap-2 w-full text-left text-sm text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-md px-2 py-1.5 transition-colors"
                  >
                    <span className="text-slate-400 font-mono w-5 flex-shrink-0">{i + 1}.</span>
                    <span className="flex-1">{stepText(s)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {sop.training_video_url && (
          <a href={sop.training_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium hover:underline">
            <Video className="w-4 h-4" /> Watch Training Video
          </a>
        )}

        {sop.photos?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1 mb-1">
              <Camera className="w-3.5 h-3.5" /> Reference Photos
            </p>
            <div className="flex flex-wrap gap-2">
              {sop.photos.map((url, i) => (
                <button key={i} type="button" onClick={() => setLightboxUrl(url)}>
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-md border border-slate-200" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const PagePill = ({ active, onClick, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors flex-shrink-0",
        active ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{zone.icon}</span>
              {zone.name}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              {flowName ? `${flowName} flow` : "SOP walkthrough"}
              {zoneLabel}
            </p>
          </DialogHeader>

          {/* Back to Overview */}
          {!isOverview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(0)}
              className="self-start -mt-1 mb-1 text-slate-600 hover:text-amber-700"
            >
              <List className="w-4 h-4" /> Back to Overview
            </Button>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isOverview ? <OverviewBody /> : (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-lg">
                  {page}. {stepText(steps[page - 1])}
                </h3>
                <StepBody />
              </div>
            )}
          </div>

          {/* Footer — page pagination */}
          {sop && numSteps > 0 && (
            <div className="border-t border-slate-200 pt-3 mt-2 space-y-2">
              {/* Page pills (jump to any page) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <PagePill active={isOverview} onClick={() => setPage(0)} title="Overview">
                  <List className="w-3.5 h-3.5" />
                </PagePill>
                {steps.map((s, i) => (
                  <PagePill key={i} active={page === i + 1} onClick={() => setPage(i + 1)} title={stepText(s)}>
                    {i + 1}
                  </PagePill>
                ))}
              </div>

              {/* Prev / position / Next */}
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                  {pageLabel}{zoneLabel}
                </span>
                <Button variant="outline" size="sm" disabled={page === numSteps} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Stage (zone-to-zone) navigation within the flow sequence */}
              {hasStageNav && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Button variant="ghost" size="sm" disabled={!hasPrev} onClick={onPrev} className="text-slate-600">
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous Stage
                  </Button>
                  <Button variant="ghost" size="sm" disabled={!hasNext} onClick={onNext} className="text-slate-600">
                    Next Stage <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <VideoLightbox url={videoUrl} onClose={() => setVideoUrl(null)} />
    </>
  );
}