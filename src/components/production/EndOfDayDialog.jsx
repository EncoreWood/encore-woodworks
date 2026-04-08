import { useState, useEffect } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sun, Smile, Meh, Frown, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RATINGS = [
  { value: "great", label: "Great", icon: Sun, color: "bg-green-500 text-white border-green-500" },
  { value: "good", label: "Good", icon: Smile, color: "bg-emerald-400 text-white border-emerald-400" },
  { value: "okay", label: "Okay", icon: Meh, color: "bg-yellow-400 text-white border-yellow-400" },
  { value: "bad", label: "Bad", icon: Frown, color: "bg-orange-500 text-white border-orange-500" },
  { value: "terrible", label: "Terrible", icon: AlertCircle, color: "bg-red-600 text-white border-red-600" },
];

export default function EndOfDayDialog({ open, onOpenChange, currentUser }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    day_rating: "",
    reason: "",
    last_cabinet: "",
    area_clean: true,
    area_notes: "",
    accomplishments: "",
    blockers: "",
    tomorrow_plan: "",
  });

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setForm({
        day_rating: "",
        reason: "",
        last_cabinet: "",
        area_clean: true,
        area_notes: "",
        accomplishments: "",
        blockers: "",
        tomorrow_plan: "",
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.day_rating) return;
    setSubmitting(true);
    const now = new Date();
    const localDate = format(new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" })), "yyyy-MM-dd");
    await base44.entities.EndOfDayReview.create({
      submitted_by: currentUser?.full_name || currentUser?.email || "Unknown",
      submitted_by_email: currentUser?.email || "",
      submitted_at: now.toISOString(),
      date: localDate,
      ...form,
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => onOpenChange(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Sun className="w-5 h-5 text-amber-500" /> End of Day Review
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser?.full_name || currentUser?.email} · {format(new Date(), "MMMM d, yyyy · h:mm a")}
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-semibold text-slate-800">Review submitted!</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Day Rating */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">How was the day? *</Label>
              <div className="flex gap-2 flex-wrap">
                {RATINGS.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setForm(f => ({ ...f, day_rating: value }))}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                      form.day_rating === value ? color : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Why? What made it that way?</Label>
              <Textarea
                placeholder="Describe what went well or what was difficult..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="resize-none h-20 text-sm"
              />
            </div>

            {/* Last Cabinet */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Which cabinet did you end on?</Label>
              <Input
                placeholder="e.g. Upper-Left Kitchen, Base Cabinet #3..."
                value={form.last_cabinet}
                onChange={e => setForm(f => ({ ...f, last_cabinet: e.target.value }))}
                className="text-sm"
              />
            </div>

            {/* Area Clean */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Is the work area clean?</Label>
                <p className="text-xs text-slate-400 mt-0.5">Shop floor, tools put away, dust collected</p>
              </div>
              <Switch
                checked={form.area_clean}
                onCheckedChange={v => setForm(f => ({ ...f, area_clean: v }))}
              />
            </div>
            {!form.area_clean && (
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1 block">What still needs attention?</Label>
                <Textarea
                  placeholder="Describe what's not clean or needs follow-up..."
                  value={form.area_notes}
                  onChange={e => setForm(f => ({ ...f, area_notes: e.target.value }))}
                  className="resize-none h-16 text-sm"
                />
              </div>
            )}

            {/* Accomplishments */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">What did you accomplish today?</Label>
              <Textarea
                placeholder="Cabinets built, faces framed, sprayed..."
                value={form.accomplishments}
                onChange={e => setForm(f => ({ ...f, accomplishments: e.target.value }))}
                className="resize-none h-16 text-sm"
              />
            </div>

            {/* Blockers */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Any blockers or issues?</Label>
              <Textarea
                placeholder="Missing parts, equipment issues, waiting on anything..."
                value={form.blockers}
                onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
                className="resize-none h-16 text-sm"
              />
            </div>

            {/* Tomorrow Plan */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Plan for tomorrow?</Label>
              <Textarea
                placeholder="What's on deck for tomorrow..."
                value={form.tomorrow_plan}
                onChange={e => setForm(f => ({ ...f, tomorrow_plan: e.target.value }))}
                className="resize-none h-16 text-sm"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!form.day_rating || submitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? "Submitting..." : "Submit End of Day Review"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}