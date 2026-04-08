import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function QuickReportMissingDialog({ open, onOpenChange, item, currentUser }) {
  const [room, setRoom] = useState(item?.room_name || "");
  const [cabinet, setCabinet] = useState("");
  const [whatsMissing, setWhatsMissing] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();

  const { data: allMissing = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MissingItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MissingItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missingItems"] });
      reset();
      onOpenChange(false);
    },
  });

  const reset = () => {
    setRoom(item?.room_name || "");
    setCabinet("");
    setWhatsMissing("");
    setNotes("");
    setDuplicate(null);
    setConfirming(false);
  };

  const handleSubmit = () => {
    if (!whatsMissing.trim()) return;

    // Check for duplicate
    const match = allMissing.find(m =>
      m.production_item_id === item?.id &&
      (m.status === "open" || m.status === "ordered") &&
      m.room_name?.toLowerCase() === room.toLowerCase() &&
      m.cabinet_name?.toLowerCase() === cabinet.toLowerCase() &&
      (m.item_description || m.description || "").toLowerCase() === whatsMissing.toLowerCase()
    );

    if (match) {
      setDuplicate(match);
      return;
    }

    createMutation.mutate({
      production_item_id: item?.id,
      production_item_name: item?.name,
      project_id: item?.project_id,
      project_name: item?.project_name,
      room_name: room,
      cabinet_name: cabinet,
      item_description: whatsMissing,
      description: notes,
      production_stage: item?.stage,
      reported_by: currentUser?.full_name || currentUser?.email || "Unknown",
      reported_at: new Date().toISOString(),
      confirmed_by: "[]",
      status: "open",
    });
  };

  const handleConfirmDuplicate = () => {
    if (!duplicate) return;
    const existing = JSON.parse(duplicate.confirmed_by || "[]");
    const name = currentUser?.full_name || currentUser?.email || "Unknown";
    if (!existing.includes(name)) {
      updateMutation.mutate({
        id: duplicate.id,
        data: { confirmed_by: JSON.stringify([...existing, name]) },
      });
    } else {
      reset();
      onOpenChange(false);
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

        {duplicate ? (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">Already Reported!</p>
              <p className="text-sm text-slate-700">
                This was already reported by <strong>{duplicate.reported_by}</strong> on{" "}
                {duplicate.reported_at ? format(new Date(duplicate.reported_at), "MMM d, yyyy") : "—"}.
              </p>
              {JSON.parse(duplicate.confirmed_by || "[]").length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  Also noticed by: {JSON.parse(duplicate.confirmed_by).join(", ")}
                </p>
              )}
            </div>
            <p className="text-sm text-slate-600 font-medium">Tap below to confirm you also noticed this:</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1">Cancel</Button>
              <Button
                onClick={handleConfirmDuplicate}
                disabled={updateMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                👁 I also noticed this
              </Button>
            </div>
          </div>
        ) : (
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
                disabled={!whatsMissing.trim() || createMutation.isPending}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {createMutation.isPending ? "Reporting..." : "🚩 Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}