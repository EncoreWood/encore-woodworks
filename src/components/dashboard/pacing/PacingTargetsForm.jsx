import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import usePacingTargets from "@/hooks/usePacingTargets";
import { validatePacingTargets } from "@/lib/pacingSettings";

// The one editor for the shop's daily pacing targets. Used behind the PTS Pacing gear
// and on the Admin settings tab.
export default function PacingTargetsForm({ onDone, onCancel }) {
  const { target, minimum, saveTargets, isSaving } = usePacingTargets();
  const [draft, setDraft] = useState({ target: String(target), minimum: String(minimum) });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const targetValue = Number(draft.target);
    const minimumValue = Number(draft.minimum);
    const problem = validatePacingTargets({ target: targetValue, minimum: minimumValue });
    if (problem) {
      setError(problem);
      setSaved(false);
      return;
    }
    setError("");
    try {
      await saveTargets({ target: targetValue, minimum: minimumValue });
      setSaved(true);
      onDone?.();
    } catch (failure) {
      setError(failure?.message || "Could not save the pacing targets.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="pacing-target" className="text-xs text-slate-500">Daily target</Label>
          <Input
            id="pacing-target"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={draft.target}
            onChange={(event) => setDraft(prev => ({ ...prev, target: event.target.value }))}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="pacing-minimum" className="text-xs text-slate-500">Daily minimum</Label>
          <Input
            id="pacing-minimum"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={draft.minimum}
            onChange={(event) => setDraft(prev => ({ ...prev, minimum: event.target.value }))}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {!error && saved && (
        <p className="text-xs text-green-700">Pacing targets saved — today's charts now use them.</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}