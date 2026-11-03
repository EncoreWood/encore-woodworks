import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Check, Eye, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { demoteOtherEstimates } from "@/components/bidding/estimateStatus";
import ProposalRoomsEditor from "./ProposalRoomsEditor";
import ProposalOptionsEditor from "./ProposalOptionsEditor";
import RoomBasedClientView from "./RoomBasedClientView";
import { computeRoomBasedTotals, money, nextSortOrder } from "./roomBasedTotals";

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const FIELD_DEFS = [
  { key: "cabinet_style", label: "Cabinet Style" },
  { key: "wood_species", label: "Wood Species" },
  { key: "door_style", label: "Door Style" },
  { key: "handles", label: "Handles" },
  { key: "drawerbox", label: "Drawerbox" },
  { key: "drawer_glides", label: "Drawer Glides" },
  { key: "hinges", label: "Hinges" },
];

/**
 * Room-based proposal editor. Rooms are priced as whole rooms (no LF, no
 * catalog items); upgrades and optional rooms sit in the Options section and
 * never leak into the Standard Total.
 */
export default function RoomBasedEstimateWorkspace({ bidId, project, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createdBidId, setCreatedBidId] = useState(null);
  const effBidId = bidId || createdBidId;

  const [projectName, setProjectName] = useState(project?.project_name || "");
  const [clientName, setClientName] = useState(project?.home_owner?.name || project?.client_name || "");
  const [address, setAddress] = useState(project?.address || "");
  const [linkedProjectId, setLinkedProjectId] = useState(project?.id || null);
  const [fields, setFields] = useState({});
  const [rooms, setRooms] = useState([]);
  const [options, setOptions] = useState([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const hydratedRef = useRef(null);

  const { data: bidData } = useQuery({
    queryKey: ["bid", bidId],
    queryFn: () => base44.entities.Bid.filter({ id: bidId }),
    enabled: !!bidId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Hydrate once — local edits stay authoritative until Save.
  useEffect(() => {
    const bid = bidData?.[0];
    if (!bid || hydratedRef.current === bidId) return;
    hydratedRef.current = bidId;
    setProjectName(bid.project_name || "");
    setClientName(bid.client_name || "");
    setAddress(bid.address || "");
    setLinkedProjectId(bid.project_id || null);
    setFields({
      cabinet_style: bid.cabinet_style || "",
      wood_species: bid.wood_species || "",
      door_style: bid.door_style || "",
      handles: bid.handles || "",
      drawerbox: bid.drawerbox || "",
      drawer_glides: bid.drawer_glides || "",
      hinges: bid.hinges || "",
    });
    setRooms(bid.proposal_rooms || []);
    setOptions(bid.proposal_options || []);
    setNotes(bid.notes || "");
  }, [bidData, bidId]);

  const totals = computeRoomBasedTotals({ rooms, options });
  const standardRooms = totals.standardRooms;
  const optionalRooms = totals.optionalRooms;

  const reorder = (rows, id, delta) => {
    const index = rows.findIndex((row) => row.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= rows.length) return rows;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    return next.map((row, i) => ({ ...row, sort_order: i + 1 }));
  };

  // ── Rooms ────────────────────────────────────────────────────────────────
  const addRoom = (payload, isOptional) => {
    setRooms((prev) => [...prev, {
      id: uid("room"),
      room_name: payload.room_name,
      finish: payload.finish,
      items_of_recognition: payload.items_of_recognition,
      price: payload.price || 0,
      is_optional: isOptional,
      selected: false,
      sort_order: nextSortOrder(prev),
    }]);
  };
  const updateRoom = (id, patch) => setRooms((prev) => prev.map((room) => room.id === id ? { ...room, ...patch } : room));
  const deleteRoom = (id) => {
    setRooms((prev) => prev.filter((room) => room.id !== id));
    // A removed room's upgrades become whole-job options instead of orphans.
    setOptions((prev) => prev.map((option) => option.parent_room_id === id ? { ...option, parent_room_id: "", parent_room_name: "" } : option));
  };
  const duplicateRoom = (id) => setRooms((prev) => {
    const row = prev.find((room) => room.id === id);
    if (!row) return prev;
    return [...prev, { ...row, id: uid("room"), room_name: `${row.room_name || "Room"} (copy)`, sort_order: nextSortOrder(prev) }];
  });
  const moveRoom = (id, delta) => setRooms((prev) => {
    const moving = prev.find((room) => room.id === id);
    if (!moving) return prev;
    const sameKind = prev.filter((room) => !!room.is_optional === !!moving.is_optional);
    const reordered = reorder(sameKind, id, delta);
    // Rebuild the full list, keeping optional and standard rooms in their own tracks.
    let cursor = 0;
    return prev.map((room) => (!!room.is_optional === !!moving.is_optional ? reordered[cursor++] : room));
  });

  // ── Options ──────────────────────────────────────────────────────────────
  const addOption = (payload) => setOptions((prev) => [...prev, {
    id: uid("opt"),
    title: payload.title,
    description: payload.description,
    price: payload.price || 0,
    price_mode: "delta",
    parent_room_id: "",
    parent_room_name: "",
    default_selected: false,
    selected: false,
    sort_order: nextSortOrder(prev),
  }]);
  const updateOption = (id, patch) => setOptions((prev) => prev.map((option) => option.id === id ? { ...option, ...patch } : option));
  const deleteOption = (id) => setOptions((prev) => prev.filter((option) => option.id !== id));
  const duplicateOption = (id) => setOptions((prev) => {
    const row = prev.find((option) => option.id === id);
    if (!row) return prev;
    return [...prev, { ...row, id: uid("opt"), title: `${row.title || "Option"} (copy)`, sort_order: nextSortOrder(prev) }];
  });
  const moveOption = (id, delta) => setOptions((prev) => reorder(prev, id, delta));

  const refreshCache = (id, data) => {
    queryClient.setQueryData(["bid", id], (old) => {
      const prev = Array.isArray(old) ? old?.[0] : old;
      return [{ ...(prev || {}), ...data, id, updated_date: new Date().toISOString() }];
    });
  };

  const buildPayload = () => ({
    template: "room_based",
    project_name: projectName || "Untitled Proposal",
    client_name: clientName,
    address,
    project_id: linkedProjectId || null,
    cabinet_style: fields.cabinet_style || "",
    wood_species: fields.wood_species || "",
    door_style: fields.door_style || "",
    handles: fields.handles || "",
    drawerbox: fields.drawerbox || "",
    drawer_glides: fields.drawer_glides || "",
    hinges: fields.hinges || "",
    proposal_rooms: rooms,
    proposal_options: options,
    total: Math.round(totals.standardTotal),
    total_lf: 0,
    notes,
  });

  const handleSave = async () => {
    setIsSaving(true);
    const data = buildPayload();
    if (effBidId) {
      await base44.entities.Bid.update(effBidId, data);
      refreshCache(effBidId, data);
    } else {
      const created = await base44.entities.Bid.create({ ...data, estimate_status: "current", status: "draft" });
      try { await demoteOtherEstimates(created.id, data.project_id); } catch (err) { console.error(err); }
      setCreatedBidId(created.id);
      refreshCache(created.id, data);
    }
    // Selection made in the client preview is saved with the same record.
    setIsSaving(false);
    setSaved(true);
    onSaved?.();
    toast({ title: "Proposal saved" });
    setTimeout(() => setSaved(false), 2000);
  };

  const persistSelection = async ({ proposal_rooms, proposal_options }) => {
    setRooms(proposal_rooms);
    setOptions(proposal_options);
    if (!effBidId) return;
    await base44.entities.Bid.update(effBidId, { proposal_rooms, proposal_options });
    refreshCache(effBidId, { proposal_rooms, proposal_options });
  };

  const previewBid = {
    ...buildPayload(),
    id: effBidId,
    created_date: bidData?.[0]?.created_date,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Job Name"
            className="text-lg font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
          />
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 flex-shrink-0">
            Room-Based
          </span>
        </div>
        <Button variant="outline" onClick={() => setShowClientView(true)} className="h-9">
          <Eye className="w-4 h-4 mr-1.5" /> Client View
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-9">
          {saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Job fields */}
          <Card className="p-4">
            <p className="font-semibold text-slate-900 mb-3">Job Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Job Name</Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              {FIELD_DEFS.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs text-slate-500">{field.label}</Label>
                  <Input
                    value={fields[field.key] || ""}
                    onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">Client Name (not printed)</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
            </div>
          </Card>

          <ProposalRoomsEditor
            rooms={standardRooms}
            onAdd={addRoom}
            onChange={updateRoom}
            onMove={moveRoom}
            onDuplicate={duplicateRoom}
            onDelete={deleteRoom}
          />

          <ProposalOptionsEditor
            options={options}
            optionalRooms={optionalRooms}
            rooms={rooms}
            onAddOption={addOption}
            onChangeOption={updateOption}
            onMoveOption={moveOption}
            onDuplicateOption={duplicateOption}
            onDeleteOption={deleteOption}
            onAddRoom={addRoom}
            onChangeRoom={updateRoom}
            onMoveRoom={moveRoom}
            onDuplicateRoom={duplicateRoom}
            onDeleteRoom={deleteRoom}
          />

          {/* Totals */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Standard Total</p>
                <p className="text-xl font-bold text-slate-900">{money(totals.standardTotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Options (selected)</p>
                <p className="text-xl font-bold text-green-700">{money(totals.optionsTotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Projected Total</p>
                <p className="text-xl font-bold text-amber-700">{money(totals.selectedTotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">If all options selected</p>
                <p className="text-xl font-bold text-slate-500">{money(totals.ceilingTotal)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <Label className="text-xs text-slate-500">Notes / Payment Schedule</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={`50% Deposit required before Job Production Starts\n40% Payment will be required upon Completion of cabinet Production\nFinal 10% Will be due at completion of Installation`}
            />
          </Card>
        </div>
      </div>

      {showClientView && (
        <RoomBasedClientView
          open
          onClose={() => setShowClientView(false)}
          bid={previewBid}
          onSelectionSaved={persistSelection}
        />
      )}
    </div>
  );
}