import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { useState } from "react";
import { Plus, FileText, Loader2, ExternalLink, Eye, EyeOff, Copy, RotateCcw, ChevronDown } from "lucide-react";
import { duplicateBid, markBidCurrent } from "@/components/bidding/estimateStatus";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function EstimatesProposalTab({ project }) {
  const qc = useQueryClient();

  const { data: bids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ["bids_for_project", project.id],
    queryFn: () => base44.entities.Bid.filter({ project_id: project.id }),
  });

  const { data: presentations = [], isLoading: presLoading } = useQuery({
    queryKey: ["presentations_for_project", project.id],
    queryFn: () => base44.entities.Presentation.filter({ project_id: project.id }),
  });

  const createPres = useMutation({
    mutationFn: () => base44.entities.Presentation.create({
      project_id: project.id,
      project_name: project.project_name,
      client_name: project.home_owner?.name || project.client_name || project.project_name,
      status: "draft",
    }),
    onSuccess: (pres) => {
      qc.invalidateQueries({ queryKey: ["presentations_for_project", project.id] });
      qc.invalidateQueries({ queryKey: ["presentations"] });
      window.location.href = createPageUrl("Presentations") + "?mode=editor&id=" + pres.id;
    },
  });

  const newEstimate = () => {
    window.location.href = createPageUrl("PlanBidding") + "?project_id=" + project.id;
  };
  const newPresentation = () => createPres.mutate();

  const { toast } = useToast();
  const toggleClientVisible = useMutation({
    mutationFn: ({ bidId, visible }) => base44.entities.Bid.update(bidId, { client_visible: visible }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["bids_for_project", project.id] });
      toast({
        title: updated.client_visible ? "Estimate shared with client" : "Estimate hidden from client",
        description: updated.client_visible
          ? "The client can now view this estimate in their portal Proposal tab."
          : "The client can no longer see this estimate.",
      });
    },
    onError: () => toast({ title: "Failed to update estimate visibility", variant: "destructive" }),
  });

  // ── Estimate versioning ────────────────────────────────────────────────────
  // "current" estimates are this project's active versions; "outdated" ones are
  // older revisions kept for reference. Missing estimate_status = current.
  const [showOutdated, setShowOutdated] = useState(false);
  const currentBids = bids.filter(b => b.estimate_status !== "outdated");
  const outdatedBids = bids.filter(b => b.estimate_status === "outdated");

  const duplicateEstimate = useMutation({
    mutationFn: (bid) => duplicateBid(bid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bids_for_project", project.id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
      toast({
        title: "Estimate duplicated",
        description: "A full copy was created and marked current. The previous current estimate moved to Outdated.",
      });
    },
    onError: (err) => {
      console.error("Failed to duplicate estimate:", err);
      toast({ title: "Failed to duplicate estimate", variant: "destructive" });
    },
  });

  const markCurrent = useMutation({
    mutationFn: ({ bidId }) => markBidCurrent(bidId, project.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bids_for_project", project.id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
      toast({ title: "Estimate marked as current", description: "The previous current estimate moved to Outdated." });
    },
    onError: (err) => {
      console.error("Failed to mark estimate as current:", err);
      toast({ title: "Failed to mark estimate as current", variant: "destructive" });
    },
  });

  const renderEstimateRow = (bid, isOutdated) => (
    <div key={bid.id}
      className="flex items-center gap-2 sm:gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
      <a href={createPageUrl("PlanBidding") + "?bid_id=" + bid.id} className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-2">
            <span className="truncate">{bid.project_name}{bid.bid_type && ` · ${bid.bid_type}`}</span>
            {isOutdated
              ? <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Outdated</span>
              : <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Current</span>}
          </p>
          <p className="text-xs text-slate-400">
            {bid.rooms?.length || 0} rooms · {bid.total_lf ? `${bid.total_lf} LF` : "—"}
            {bid.updated_date && ` · ${format(new Date(bid.updated_date), "MMM d, yyyy")}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-slate-800">${(bid.total || 0).toLocaleString()}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bidStatusColors[bid.status] || bidStatusColors.draft}`}>
            {bid.status || "draft"}
          </span>
        </div>
      </a>
      {isOutdated && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => markCurrent.mutate({ bidId: bid.id })}
          disabled={markCurrent.isPending}
          title="Make this the project's current estimate"
          className="gap-1.5 flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mark Current</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => duplicateEstimate.mutate(bid)}
        disabled={duplicateEstimate.isPending}
        title="Create a full copy as a new estimate — the copy becomes the current version"
        className="gap-1.5 flex-shrink-0"
      >
        {duplicateEstimate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">Duplicate</span>
      </Button>
      <Button
        size="sm"
        variant={bid.client_visible ? "default" : "outline"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleClientVisible.mutate({ bidId: bid.id, visible: !bid.client_visible });
        }}
        disabled={toggleClientVisible.isPending}
        title={bid.client_visible ? "Visible to client — click to hide" : "Hidden from client — click to share"}
        className={bid.client_visible
          ? "bg-green-600 hover:bg-green-700 gap-1.5 flex-shrink-0"
          : "gap-1.5 flex-shrink-0"}
      >
        {bid.client_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{bid.client_visible ? "Client View On" : "Client View"}</span>
      </Button>
    </div>
  );

  const bidStatusColors = {
    draft: "bg-amber-100 text-amber-700",
    finalized: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      {/* Estimates */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Estimates ({currentBids.length})</h2>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={newEstimate}>
            <Plus className="w-3.5 h-3.5" /> New Estimate
          </Button>
        </div>
        {bidsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : bids.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-3">No estimates yet for this project.</p>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={newEstimate}>
              <Plus className="w-3.5 h-3.5" /> Create Your First Estimate
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {currentBids.map(bid => renderEstimateRow(bid, false))}
            {currentBids.length === 0 && outdatedBids.length > 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No current estimate — mark one as current from Outdated Estimates below.</p>
            )}
          </div>
        )}

        {/* Outdated Estimates — older revisions, collapsed by default, kept for reference */}
        {outdatedBids.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              onClick={() => setShowOutdated(v => !v)}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showOutdated ? "" : "-rotate-90"}`} />
              Outdated Estimates ({outdatedBids.length})
            </button>
            {showOutdated && (
              <div className="space-y-2 mt-3">
                {outdatedBids.map(bid => renderEstimateRow(bid, true))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Presentations */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Presentations ({presentations.length})</h2>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={newPresentation} disabled={createPres.isPending}>
            {createPres.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} New Presentation
          </Button>
        </div>
        {presLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <ExternalLink className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-3">No presentations yet for this project.</p>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={newPresentation} disabled={createPres.isPending}>
              {createPres.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create Your First Presentation
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {presentations.map(pres => (
              <a key={pres.id} href={createPageUrl("Presentations") + "?mode=editor&id=" + pres.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                <ExternalLink className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {pres.project_name || "Untitled Presentation"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pres.status || "draft"}
                    {pres.sent_date && ` · sent ${format(new Date(pres.sent_date), "MMM d, yyyy")}`}
                    {!pres.sent_date && pres.updated_date && ` · updated ${format(new Date(pres.updated_date), "MMM d, yyyy")}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}