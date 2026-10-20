import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function EditRequestDialog({ open, onOpenChange, date, onSubmit, saving }) {
  const [reason, setReason] = useState("");

  useEffect(() => { if (open) setReason(""); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Time Edit</DialogTitle>
        </DialogHeader>
        <p className="text-sm font-semibold text-slate-700">
          {date ? format(new Date(date + "T00:00:00"), "EEEE, MMMM d") : ""}
        </p>
        <p className="text-xs text-slate-400 -mt-2">
          Your request will be reviewed by an admin, who will update your time card if accepted.
        </p>
        <Textarea
          rows={4}
          placeholder="What needs to change? e.g. 'I forgot to clock out at 4:30 PM'"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            disabled={!reason.trim() || saving}
            onClick={() => onSubmit(reason.trim())}
          >
            {saving ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}