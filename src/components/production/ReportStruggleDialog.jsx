import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const FRUSTRATION_LABELS = {
  1: { label: "1 – Minor", color: "bg-green-100 text-green-700 border-green-300" },
  2: { label: "2 – Annoying", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  3: { label: "3 – Frustrating", color: "bg-orange-100 text-orange-700 border-orange-300" },
  4: { label: "4 – Serious", color: "bg-red-100 text-red-700 border-red-300" },
  5: { label: "5 – Critical", color: "bg-red-200 text-red-800 border-red-400" },
};

export default function ReportStruggleDialog({ open, onOpenChange }) {
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [frustrationLevel, setFrustrationLevel] = useState(3);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Pre-fill reporter from current user on first open
  const employeeNames = employees.map(e => e.full_name).filter(Boolean).sort();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Struggle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["struggles"] });
      setProblem("");
      setSolution("");
      setReportedBy("");
      setFrustrationLevel(3);
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    if (!problem.trim()) return;
    const name = reportedBy || currentUser?.full_name || currentUser?.email || "Unknown";
    createMutation.mutate({
      problem: problem.trim(),
      solution: solution.trim() || undefined,
      reported_by: name,
      frustration_level: frustrationLevel,
      status: "open",
      comments: [],
    });
  };

  const nowFormatted = format(new Date(), "MMM d, yyyy h:mm a");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Report a Struggle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reporter + Timestamp row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-slate-700">Reported By</Label>
              <Select value={reportedBy} onValueChange={setReportedBy}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={currentUser?.full_name || "Select person..."} />
                </SelectTrigger>
                <SelectContent>
                  {employeeNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-slate-400 pb-2.5 whitespace-nowrap">{nowFormatted}</div>
          </div>

          {/* Frustration level */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Frustration Level</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFrustrationLevel(level)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    frustrationLevel === level
                      ? FRUSTRATION_LABELS[level].color + " ring-2 ring-offset-1 ring-current"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">{FRUSTRATION_LABELS[frustrationLevel]?.label}</p>
          </div>

          {/* Problem */}
          <div>
            <Label className="text-sm font-semibold text-slate-700">What's the problem? *</Label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3}
              placeholder="Describe the struggle or issue..."
              value={problem}
              onChange={e => setProblem(e.target.value)}
            />
          </div>

          {/* Solution */}
          <div>
            <Label className="text-sm font-semibold text-slate-700">Do you have a solution? (optional)</Label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              rows={2}
              placeholder="If you have an idea, share it here..."
              value={solution}
              onChange={e => setSolution(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!problem.trim() || createMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {createMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}