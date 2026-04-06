import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function ReportStruggleDialog({ open, onOpenChange, item }) {
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Struggle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["struggles"] });
      setProblem("");
      setSolution("");
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    if (!problem.trim()) return;
    createMutation.mutate({
      problem: problem.trim(),
      solution: solution.trim() || undefined,
      reported_by: currentUser?.full_name || currentUser?.email || "Unknown",
      production_item_name: item?.name,
      production_item_id: item?.id,
      project_name: item?.project_name,
      status: "open",
      comments: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Report a Struggle
          </DialogTitle>
        </DialogHeader>
        {item && (
          <p className="text-xs text-slate-500 -mt-2 mb-1">
            Re: <strong>{item.name}</strong>{item.project_name ? ` · ${item.project_name}` : ""}
          </p>
        )}
        <div className="space-y-4">
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