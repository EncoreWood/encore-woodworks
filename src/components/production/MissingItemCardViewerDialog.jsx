import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, ExternalLink, Home, StickyNote, FileText } from "lucide-react";

const STAGE_BADGES = {
  cut: "bg-amber-100 text-amber-800 border-amber-200",
  face_frame: "bg-orange-100 text-amber-900 border-orange-200",
  spray: "bg-purple-100 text-purple-800 border-purple-200",
  build: "bg-blue-100 text-blue-800 border-blue-200",
  complete: "bg-green-100 text-green-800 border-green-200",
  on_hold: "bg-slate-200 text-slate-700 border-slate-300",
};

export default function MissingItemCardViewerDialog({ cardId, onClose }) {
  const { data: card, isLoading } = useQuery({
    queryKey: ["productionItem", cardId],
    queryFn: () => base44.entities.ProductionItem.get(cardId),
    enabled: !!cardId,
  });

  const stageLabel = card?.stage ? card.stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Not Started";
  const stageColor = card?.stage ? (STAGE_BADGES[card.stage] || "bg-slate-100 text-slate-700 border-slate-200") : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <Dialog open={!!cardId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Production Card</DialogTitle>
        </DialogHeader>
        {isLoading || !card ? (
          <div className="py-10 text-center text-slate-400 text-sm">Loading card…</div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-slate-800">{card.name || "Untitled card"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${stageColor}`}>{stageLabel}</span>
                {card.room_name && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{card.room_name}</span>
                )}
                {card.project_name && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Home className="w-3 h-3" />{card.project_name}</span>
                )}
              </div>
            </div>

            {card.sent_back_for_missing && (
              <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                Sent back — missing item
              </div>
            )}

            {card.notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3" />Notes</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{card.notes}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Files ({(card.files || []).length})</p>
              {(card.files || []).length === 0 ? (
                <p className="text-xs text-slate-400">No files attached</p>
              ) : (
                <div className="space-y-1">
                  {card.files.map((f, idx) => (
                    <a
                      key={idx}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}