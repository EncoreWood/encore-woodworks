import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const SPECIAL_FROM = ["Office", "Shop", "Company", "Anonymous"];
const SPECIAL_TO = ["Office", "Shop", "Company"];

export default function GiveComplimentDialog({ open, onOpenChange }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [shareInMeeting, setShareInMeeting] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const employeeNames = employees.map(e => e.full_name).filter(Boolean).sort();
  const nowFormatted = format(new Date(), "MMM d, yyyy h:mm a");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Compliment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliments"] });
      setFrom("");
      setTo("");
      setMessage("");
      setShareInMeeting(false);
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    if (!message.trim() || !from || !to) return;
    createMutation.mutate({
      from,
      to,
      message: message.trim(),
      date: format(new Date(), "yyyy-MM-dd"),
      submitted_at: new Date().toISOString(),
      share_in_meeting: shareInMeeting,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 text-xl">
            🎉 Give a Compliment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From + Timestamp */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-slate-700">From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={currentUser?.full_name || "Select person..."} />
                </SelectTrigger>
                <SelectContent>
                  {employeeNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  <SelectItem value="---" disabled>──────────</SelectItem>
                  {SPECIAL_FROM.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-slate-400 pb-2.5 whitespace-nowrap">{nowFormatted}</div>
          </div>

          {/* To */}
          <div>
            <Label className="text-sm font-semibold text-slate-700">For</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Who is this for?" />
              </SelectTrigger>
              <SelectContent>
                {employeeNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
                <SelectItem value="---" disabled>──────────</SelectItem>
                {SPECIAL_TO.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <Label className="text-sm font-semibold text-slate-700">Compliment *</Label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={4}
              placeholder="Share the kind words..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {/* Share in meeting toggle */}
          <button
            type="button"
            onClick={() => setShareInMeeting(v => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
              shareInMeeting
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="text-lg">{shareInMeeting ? "☀️" : "🌙"}</span>
            <span className="flex-1 text-left">
              {shareInMeeting ? "Share in Morning Meeting" : "Keep private (don't share in meeting)"}
            </span>
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${shareInMeeting ? "bg-amber-500 border-amber-500" : "border-slate-300"}`} />
          </button>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || !from || !to || createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {createMutation.isPending ? "Sending..." : "🎉 Send Compliment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}