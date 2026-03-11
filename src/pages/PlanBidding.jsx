import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Trash2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import BidWorkspace from "@/components/bidding/BidWorkspace";

export default function PlanBidding() {
  const [activeBidId, setActiveBidId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: bids = [], isLoading } = useQuery({
    queryKey: ["bids"],
    queryFn: () => base44.entities.Bid.list("-created_date"),
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Bid.delete(id);
    queryClient.invalidateQueries({ queryKey: ["bids"] });
  };

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ["bids"] });

  if (activeBidId || isCreating) {
    return (
      <BidWorkspace
        bidId={activeBidId}
        onClose={() => { setActiveBidId(null); setIsCreating(false); }}
        onSaved={handleSaved}
      />
    );
  }

  const statusColors = {
    draft: "bg-amber-100 text-amber-700",
    finalized: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan Bidding</h1>
          <p className="text-sm text-slate-500 mt-1">Upload architect plans — AI identifies cabinet areas &amp; bids by linear foot</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-1" /> New Bid
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-500">No bids yet</p>
          <p className="text-sm mt-1">Upload house plans to generate your first bid</p>
          <Button onClick={() => setIsCreating(true)} className="mt-4 bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1" /> Create Bid
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <Card
              key={bid.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setActiveBidId(bid.id)}
            >
              <div className="flex items-center gap-4">
                <FileText className="w-9 h-9 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{bid.project_name}</div>
                  <div className="text-sm text-slate-500 truncate">{bid.client_name || bid.address || "No details"}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {bid.rooms?.length || 0} cabinet areas · {bid.total_lf ? `${bid.total_lf} LF · ` : ""}
                    {format(new Date(bid.created_date), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-lg text-slate-900">${(bid.total || 0).toLocaleString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[bid.status] || statusColors.draft}`}>
                      {bid.status || "draft"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-9 w-9"
                    onClick={(e) => handleDelete(e, bid.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}