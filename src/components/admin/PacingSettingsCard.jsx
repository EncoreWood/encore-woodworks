import { Card } from "@/components/ui/card";
import PacingTargetsForm from "@/components/dashboard/pacing/PacingTargetsForm";

// Shop-wide pacing targets, editable from the Admin settings tab as well as from the
// gear on the PTS Pacing panel.
export default function PacingSettingsCard() {
  return (
    <Card className="max-w-xl p-6 bg-white border-0 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Pacing targets</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        The daily points a production day is measured against. Charts, chips, checkpoints and the
        Previous Day Review all read these. Past days keep the target they were measured against.
      </p>
      <PacingTargetsForm />
    </Card>
  );
}