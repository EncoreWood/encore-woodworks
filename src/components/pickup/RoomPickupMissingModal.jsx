import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageX, Plus, ArrowRight, Trash2, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PickupItemForm from "./PickupItemForm";

// Unified stage vocabulary for the combined Pickup + Missing list.
// "Missing" is a stage an item can be in — not a separate dataset.
const STAGE_LABELS = {
  open: "Missing",
  in_progress: "Ordered",
  ready_at_shop: "In Shop",
  installers: "Installers",
  resolved: "Resolved",
};
const STAGE_COLORS = {
  open: "bg-red-100 text-red-700 border-red-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  ready_at_shop: "bg-blue-100 text-blue-700 border-blue-200",
  installers: "bg-purple-100 text-purple-700 border-purple-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const STAGE_ORDER = ["open", "in_progress", "ready_at_shop", "installers", "resolved"];

// Bridge MissingItem.status <-> unified stage
const missingStatusToStage = { open: "open", ordered: "in_progress", resolved: "resolved" };
const stageToMissingStatus = { open: "open", in_progress: "ordered", ready_at_shop: "ordered", installers: "ordered", resolved: "resolved" };

function adaptMissing(m) {
  return {
    id: m.id, _source: "missing",
    project_id: m.project_id, project_name: m.project_name, room_name: m.room_name,
    title: m.production_item_name || m.item_description || "Missing item",
    type: "missing",
    stage: missingStatusToStage[m.status] || "open",
    priority: "medium",
    notes: [m.item_description, m.description].filter(Boolean).join(" — "),
    reported_by: m.reported_by,
    production_item_id: m.production_item_id, production_stage: m.production_stage,
    archived: m.archived, files: [], sketch_url: null, pts: 0,
  };
}
function adaptPickup(p) {
  return {
    id: p.id, _source: "pickup",
    project_id: p.project_id, project_name: p.project_name, room_name: p.room_name,
    title: p.title, type: p.type, stage: p.stage || p.status || "open",
    priority: p.priority, notes: p.notes, reported_by: null,
    production_item_id: p.production_item_id, production_stage: p.production_stage,
    archived: p.archived, files: p.files, sketch_url: p.sketch_url, pts: p.pts,
  };
}

export default function RoomPickupMissingModal({ project, roomName }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: pickupItems = [] } = useQuery({
    queryKey: ["pickupItems"],
    queryFn: () => base44.entities.PickupItem.list("-created_date"),
  });
  const { data: missingItems = [] } = useQuery({
    queryKey: ["missingItems"],
    queryFn: () => base44.entities.MissingItem.list("-reported_at"),
  });

  const unified = [
    ...pickupItems.filter(p => !p.archived).map(adaptPickup),
    ...missingItems.filter(m => !m.archived).map(adaptMissing),
  ].filter(i => i.project_id === project.id && (i.room_name || "") === (roomName || ""));

  const openCount = unified.filter(i => i.stage !== "resolved").length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["pickupItems"] });
    queryClient.invalidateQueries({ queryKey: ["missingItems"] });
    queryClient.invalidateQueries({ queryKey: ["productionItems"] });
  };

  const cycleStage = (item) => {
    const idx = STAGE_ORDER.indexOf(item.stage);
    const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
    if (item._source === "missing") {
      base44.entities.MissingItem.update(item.id, { status: stageToMissingStatus[next] }).then(invalidate);
    } else {
      const newStatus = next === "resolved" ? "resolved" : next === "open" ? "open" : "in_progress";
      base44.entities.PickupItem.update(item.id, { stage: next, status: newStatus }).then(invalidate);
    }
  };

  const sendToProduction = async (item) => {
    const prod = await base44.entities.ProductionItem.create({
      name: item.title,
      type: "pickup",
      stage: "cut",
      project_id: item.project_id,
      project_name: item.project_name,
      room_name: item.room_name || "",
      notes: item.notes || "",
      priority: item.priority || "medium",
      files: item.files || [],
      sketch_url: item.sketch_url || null,
      pts: item.pts || undefined,
    });
    if (item._source === "missing") {
      await base44.entities.MissingItem.update(item.id, { production_item_id: prod.id, production_stage: "cut" });
    } else {
      await base44.entities.PickupItem.update(item.id, { production_item_id: prod.id, production_stage: "cut" });
    }
    invalidate();
  };

  const remove = (item) => {
    if (!window.confirm("Delete this item?")) return;
    if (item._source === "missing") base44.entities.MissingItem.delete(item.id).then(invalidate);
    else base44.entities.PickupItem.delete(item.id).then(invalidate);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50 gap-1"
        title="Pickup / Missing items for this room"
      >
        <PackageX className="w-3 h-3" />
        Pickup/Missing{openCount > 0 && ` (${openCount})`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-lg">
                  <span className="text-slate-500 font-normal">{project.project_name} /</span> {roomName}
                </DialogTitle>
                <p className="text-sm text-slate-400 mt-0.5">
                  {openCount} open pickup/missing item{openCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {unified.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <PackageX className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No pickup/missing items for this room yet.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add first item
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {unified.map(item => (
                  <div
                    key={item._source + item.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white",
                      item.stage === "resolved" && "opacity-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium text-slate-900 truncate", item.stage === "resolved" && "line-through")}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                        {item.reported_by && <span className="text-xs text-slate-400">by {item.reported_by}</span>}
                        {item.production_item_id && (
                          <Link to={createPageUrl("ShopProduction")} onClick={() => setOpen(false)}>
                            <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200 gap-1 cursor-pointer hover:opacity-80">
                              <Factory className="w-2.5 h-2.5" /> In Production
                            </Badge>
                          </Link>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.notes}</p>}
                    </div>

                    <button
                      onClick={() => cycleStage(item)}
                      title="Click to advance stage"
                      className={cn(
                        "text-xs font-semibold border rounded-full px-2 py-0.5 transition-all hover:opacity-80",
                        STAGE_COLORS[item.stage] || STAGE_COLORS.open
                      )}
                    >
                      {STAGE_LABELS[item.stage] || item.stage}
                    </button>

                    {!item.production_item_id && item.stage !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1"
                        onClick={() => sendToProduction(item)}
                        title="Send to shop production queue so it can be built/cut"
                      >
                        <ArrowRight className="w-3 h-3" /> Send to Production
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => remove(item)}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PickupItemForm
        open={showForm}
        onOpenChange={(o) => { setShowForm(o); if (!o) setShowForm(false); }}
        onSubmit={(data) => {
          const { linkToProduction, productionStage, ...itemData } = data;
          const payload = {
            ...itemData,
            project_id: project.id,
            project_name: project.project_name,
            room_name: data.room_name || roomName,
            source: "project",
          };
          base44.entities.PickupItem.create(payload).then(async (created) => {
            if (linkToProduction) {
              const prod = await base44.entities.ProductionItem.create({
                name: payload.title, type: "pickup", stage: productionStage || "cut",
                project_id: project.id, project_name: project.project_name,
                room_name: roomName, notes: payload.notes || "", priority: payload.priority || "medium",
                files: payload.files || [], sketch_url: payload.sketch_url || null,
                pts: payload.pts || undefined, pickup_item_id: created.id,
              });
              await base44.entities.PickupItem.update(created.id, { production_item_id: prod.id, production_stage: productionStage || "cut" });
            }
            invalidate();
            setShowForm(false);
          });
        }}
        projectId={project.id}
        projectName={project.project_name}
        rooms={[{ room_name: roomName }]}
        isLoading={false}
      />
    </>
  );
}