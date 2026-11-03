import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sun, Smile, Meh, Frown, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import EndOfDayReportSection from "./EndOfDayReportSection";
import { loadClockState, submitReview, clockOutEntry, formatClockTime, formatDuration } from "./eodReview";

// Status colours only — icons, borders and light tints. Labels stay in the
// normal foreground colour so contrast holds in dark mode.
const RATINGS = [
  {
    value: "great",
    label: "Great",
    icon: Sun,
    iconColor: "text-emerald-600",
    selected: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    value: "good",
    label: "Good",
    icon: Smile,
    iconColor: "text-emerald-500",
    selected: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    value: "fuck_alright",
    label: "F*** Alright",
    icon: Meh,
    iconColor: "text-amber-400",
    selected: "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  },
  {
    value: "okay",
    label: "Okay",
    icon: Meh,
    iconColor: "text-amber-500",
    selected: "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  },
  {
    value: "bad",
    label: "Bad",
    icon: Frown,
    iconColor: "text-orange-600",
    selected: "bg-orange-50 border-orange-300 dark:bg-orange-950/40 dark:border-orange-800",
  },
  {
    value: "terrible",
    label: "Terrible",
    icon: AlertCircle,
    iconColor: "text-red-600",
    selected: "bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800",
  },
];

const emptyForm = () => ({
  day_rating: "",
  reason: "",
  area_clean: true,
  area_notes: "",
  comments: "",
});

export default function EndOfDayDialog({ open, onOpenChange, currentUser }) {
  const [form, setForm] = useState(emptyForm);
  const [reports, setReports] = useState([]);
  const [clock, setClock] = useState(undefined); // undefined = loading, null = not clocked in
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setReports([]);
    setResult(null);
    setError("");
    setSubmitting(false);
    setClock(undefined);
    if (!currentUser?.email) {
      setClock(null);
      return;
    }
    let alive = true;
    loadClockState(currentUser)
      .then((state) => { if (alive) setClock(state); })
      .catch(() => { if (alive) setClock(null); });
    return () => { alive = false; };
  }, [open, currentUser?.email]);

  const clockedIn = !!clock?.entryId;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    let saved;
    try {
      saved = await submitReview({ user: currentUser, form, reports });
    } catch (err) {
      console.error("End of day review failed:", err);
      setError("Could not save your review. Nothing was submitted — please try again.");
      setSubmitting(false);
      return;
    }

    let clockOutFailed = false;
    if (clockedIn) {
      try {
        await clockOutEntry(clock.entryId, clock.clockIn);
      } catch (err) {
        console.error("Clock out failed:", err);
        clockOutFailed = true;
      }
    }

    setSubmitting(false);
    setResult({ clockOutFailed, reportFailed: saved.failed });

    if (!clockOutFailed) {
      setTimeout(() => onOpenChange(false), 1600);
    }
  };

  const renderBody = () => {
    if (result?.clockOutFailed) {
      return (
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-800 dark:text-slate-200">
              Your review was saved, but <span className="font-semibold">clocking out failed</span>. Please clock out
              from the Time Sheet so your hours are right.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      );
    }
    if (result) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Review submitted!</p>
          {result.clockOutFailed === false && clockedIn && (
            <p className="text-sm text-slate-500">You're clocked out.</p>
          )}
          {result.reportFailed?.length > 0 && (
            <p className="text-xs text-amber-700 text-center px-4">
              Some reports didn't save ({result.reportFailed.join(", ")}). Your review itself was saved.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-5 pt-2">
        {/* Day rating — optional */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">How was the day?</Label>
          <div className="flex gap-2 flex-wrap">
            {RATINGS.map(({ value, label, icon: Icon, iconColor, selected }) => {
              const isSelected = form.day_rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, day_rating: isSelected ? "" : value }))}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                    "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                    "dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
                    isSelected && selected
                  )}
                >
                  <Icon className={cn("w-4 h-4", isSelected ? iconColor : "text-slate-400")} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
            Why? What made it that way?
          </Label>
          <Textarea
            placeholder="Describe what went well or what was difficult..."
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="resize-none h-20 text-sm"
          />
        </div>

        <EndOfDayReportSection entries={reports} onChange={setReports} />

        {/* Comments */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Comments</Label>
          <Textarea
            placeholder="Anything else worth noting?"
            value={form.comments}
            onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
            className="resize-none h-16 text-sm"
          />
        </div>

        {/* Area clean */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/60">
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Is the work area clean?</Label>
            <p className="text-xs text-slate-400 mt-0.5">Shop floor, tools put away, dust collected</p>
          </div>
          <Switch
            checked={form.area_clean}
            onCheckedChange={(v) => setForm((f) => ({ ...f, area_clean: v }))}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
        {!form.area_clean && (
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
              What still needs attention?
            </Label>
            <Textarea
              placeholder="Describe what's not clean or needs follow-up..."
              value={form.area_notes}
              onChange={(e) => setForm((f) => ({ ...f, area_notes: e.target.value }))}
              className="resize-none h-16 text-sm"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        <div>
          {clock === undefined && <p className="text-[11px] text-slate-400 mb-1">Checking your clock…</p>}
          {clockedIn && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Clocked in {formatClockTime(clock.clockIn)} · {formatDuration(clock.minutesToday)} today
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || clock === undefined}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? "Submitting..." : clockedIn ? "Submit & Clock Out" : "Submit End of Day Review"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60">
              <Sun className="w-4 h-4 text-amber-600" />
            </span>
            End of Day Review
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser?.full_name || currentUser?.email} · {format(new Date(), "MMMM d, yyyy · h:mm a")}
          </p>
        </DialogHeader>

        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}