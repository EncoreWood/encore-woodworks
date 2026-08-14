import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const STAGE_OPTIONS = [
  { id: "cut", label: "1. Cut", color: "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200" },
  { id: "face_frame", label: "2. Face Frame", color: "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200" },
  { id: "spray", label: "3. Spray", color: "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200" },
  { id: "build", label: "4. Build", color: "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200" },
  { id: "complete", label: "5. Complete", color: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200" },
];

export default function SendToProductionDialog({ open, items, onConfirm, onClose }) {
  const [stage, setStage] = useState("cut");

  useEffect(() => {
    if (open) setStage("cut");
  }, [open]);

  const count = items?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send {count} card{count !== 1 ? "s" : ""} to Production</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">Choose the production stage these cards should start in.</p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-2">
          {STAGE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStage(opt.id)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${opt.color} ${stage === opt.id ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
            >
              <span>{opt.label}</span>
              {stage === opt.id && <span className="text-xs font-bold">✓ Selected</span>}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-green-600 hover:bg-green-700 gap-2"
            disabled={count === 0}
            onClick={() => onConfirm(stage)}
          >
            <ArrowRight className="w-4 h-4" />
            Send to {STAGE_OPTIONS.find(s => s.id === stage)?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}