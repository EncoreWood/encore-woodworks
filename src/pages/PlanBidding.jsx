import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Trash2, ChevronRight, Link2, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import BidWorkspace from "@/components/bidding/BidWorkspace";
import OnsiteBidWorkspace from "@/components/bidding/OnsiteBidWorkspace";
import BidPricingTab from "@/components/bidding/BidPricingTab";

export default function PlanBidding() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlProjectId = urlParams.get("project_id");
  const urlBidId = urlParams.get("bid_id");
  const urlTab = urlParams.get("tab"); // support ?tab=pricing

  const [activeTab, setActiveTab] = useState(urlTab === "pricing" ? "pricing" : "bids");
  const [activeBidId, setActiveBidId] = useState(urlBidId || null);
  const [isCreating, setIsCreating] = useState(!!urlProjectId);
  const [isCreatingOnsite, setIsCreatingOnsite] = useState(false);
  const [activeOnsiteBidId, setActiveOnsiteBidId] = useState(null);
  const queryClient = useQueryClient();

  const { data: linkedProjectData } = useQuery({
    queryKey: ["project_for_bid", urlProjectId],
    queryFn: () => base44.entities.Project.filter({ id: urlProjectId }).then(r => r[0]),
    enabled: !!urlProjectId,
  });

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
        project={!activeBidId ? linkedProjectData : undefined}
        onClose={() => { setActiveBidId(null); setIsCreating(false); }}
        onSaved={handleSaved}
        onOpenPricing={() => { setActiveBidId(null); setIsCreating(false); setActiveTab("pricing"); }}
      />
    );
  }

  if (activeOnsiteBidId || isCreatingOnsite) {
    return (
      <OnsiteBidWorkspace
        bidId={activeOnsiteBidId}
        onClose={() => { setActiveOnsiteBidId(null); setIsCreatingOnsite(false); }}
        onSaved={handleSaved}
        onOpenPricing={() => { setActiveOnsiteBidId(null); setIsCreatingOnsite(false); setActiveTab("pricing"); }}
      />
    );
  }

  const statusColors = {
    draft: "bg-amber-100 text-amber-700",
    finalized: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Estimates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage bids and configure pricing</p>
        </div>
        {activeTab === "bids" && (
          <div className="flex gap-2">
            <Button onClick={() => setIsCreatingOnsite(true)} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              <MapPin className="w-4 h-4 mr-1" /> New Onsite Bid
            </Button>
            <Button onClick={() => setIsCreating(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-1" /> New Plan Bid
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6">
        {[
          { key: "bids", label: "Bids", icon: FileText },
          { key: "pricing", label: "Pricing", icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Bids Tab ── */}
      {activeTab === "bids" && (
        <>
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
                  onClick={() => bid.bid_mode === "onsite" ? setActiveOnsiteBidId(bid.id) : setActiveBidId(bid.id)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-9 h-9 text-amber-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{bid.project_name}</span>
                        {bid.bid_mode === "onsite" && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ONSITE</span>}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{bid.client_name || bid.address || "No details"}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{bid.rooms?.length || 0} cabinet areas · {bid.total_lf ? `${bid.total_lf} LF · ` : ""}{format(new Date(bid.created_date), "MMM d, yyyy")}</span>
                        {bid.project_id && (
                          <a href={createPageUrl("ProjectDetails") + "?id=" + bid.project_id} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium">
                            <Link2 className="w-3 h-3" /> Project
                          </a>
                        )}
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
        </>
      )}

      {/* ── Pricing Tab ── */}
      {activeTab === "pricing" && <BidPricingTab />}
    </div>
  );
}