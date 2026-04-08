import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { appParams } from "@/lib/app-params";

const API_BASE = "https://vivica-d92c9f97.base44.app/functions/reportMissingItem";

export default function QuickReportMissingDialog({ open, onOpenChange, item, currentUser }) {
  const [room, setRoom] = useState(item?.room_name || "");
  const [cabinet, setCabinet] = useState("");
  const [whatsMissing, setWhatsMissing] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => {
    setRoom(item?.room_name || "");
    setCabinet("");
    setWhatsMissing("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!whatsMissing.trim()) return;
    setLoading(true);

    const token = appParams.token;

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        production_item_id: item?.id,
        production_item_name: item?.name,
        project_name: item?.project_name,
        room,
        cabinet,
        item_description: whatsMissing.trim(),
        notes,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.result === "created") {
      toast.success("Missing item reported ✓");
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    } else if (data.result === "confirmed") {
      toast.warning(`Already reported by ${data.reported_by}. You've been added as a confirmer.`);
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    } else if (data.result === "already_confirmed") {
      toast.info("You already reported or confirmed this item.");
      reset();
      onOpenChange(false);
    } else {
      toast.error(data.error || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            🚩 Report Missing Item
          </DialogTitle>
          {item && <p className="text-xs text-slate-500 mt-1">For: <strong>{item.name}</strong></p>}
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Room</Label>
            <Input className="mt-1 h-8 text-sm" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Kitchen" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Cabinet</Label>
            <Input className="mt-1 h-8 text-sm" value={cabinet} onChange={e => setCabinet(e.target.value)} placeholder="e.g. Upper-Left" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">What's Missing *</Label>
            <Input className="mt-1 h-8 text-sm" value={whatsMissing} onChange={e => setWhatsMissing(e.target.value)} placeholder="e.g. Door hinge" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Notes (optional)</Label>
            <Input className="mt-1 h-8 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!whatsMissing.trim() || loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Reporting..." : "🚩 Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}