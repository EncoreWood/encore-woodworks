import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PacingTargetsForm from "./PacingTargetsForm";

export default function PacingTargetsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pacing targets</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-1 mb-2">
          A production day is measured against these. Past days keep the target they were measured against.
        </p>
        <PacingTargetsForm
          onCancel={() => onOpenChange(false)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}