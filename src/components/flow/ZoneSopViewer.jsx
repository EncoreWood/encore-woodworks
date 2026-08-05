import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, AlertTriangle, Video, Camera } from "lucide-react";

export default function ZoneSopViewer({ open, onClose, zone, sop, flowName, stepIndex, totalSteps, hasPrev, hasNext, onPrev, onNext, onExitToEdit }) {
  if (!open || !zone) return null;
  const stepLabel = totalSteps > 0 ? `Step ${stepIndex + 1} of ${totalSteps}` : "";

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-slate-200 transition-transform">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{flowName ? `${flowName} flow` : ""}{stepLabel ? ` · ${stepLabel}` : ""}</p>
          <h2 className="font-bold text-slate-900 truncate flex items-center gap-1.5">{zone.icon} {zone.name}</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sop ? (
          <>
            <div>
              <h3 className="font-semibold text-slate-900">{sop.title}</h3>
              {sop.overview && <p className="text-sm text-slate-600 mt-1">{sop.overview}</p>}
            </div>

            {sop.required_ppe?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Required PPE</p>
                <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
                  {sop.required_ppe.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {sop.steps?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">📋 Steps</p>
                <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-2">
                  {sop.steps.map((s, i) => {
                    const text = typeof s === "string" ? s : s?.text;
                    const img = typeof s === "string" ? null : s?.image_url;
                    return (
                      <li key={i} className="list-item">
                        <span>{text}</span>
                        {img && (
                          <a href={img} target="_blank" rel="noreferrer" className="block mt-1">
                            <img src={img} alt="" className="w-full max-w-[220px] rounded-md border border-slate-200" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {sop.common_mistakes && (
              <div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Common Mistakes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{sop.common_mistakes}</p>
              </div>
            )}

            {sop.safety_notes && (
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Safety Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{sop.safety_notes}</p>
              </div>
            )}

            {sop.training_video_url && (
              <a href={sop.training_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium hover:underline">
                <Video className="w-4 h-4" /> Watch Training Video
              </a>
            )}

            {sop.photos?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1 mb-1"><Camera className="w-3.5 h-3.5" /> Reference Photos</p>
                <div className="flex flex-wrap gap-2">
                  {sop.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-md border border-slate-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-slate-500 mb-3">No SOP created for this station yet.</p>
            <Button variant="outline" size="sm" onClick={onExitToEdit}>Create one in Edit Mode</Button>
          </div>
        )}
      </div>

      {/* Footer nav — only shown when viewing within a flow sequence */}
      {totalSteps > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev} className="flex-1">
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous Stage
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext} className="flex-1">
            Next Stage <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}