import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Shuffle } from "lucide-react";
import FlowCanvas from "@/components/flow/FlowCanvas";
import ZoneEditor from "@/components/flow/ZoneEditor";
import ArrowEditor from "@/components/flow/ArrowEditor";
import AddZoneDialog from "@/components/flow/AddZoneDialog";
import FlowManager from "@/components/flow/FlowManager";
import FlowSequenceBuilder from "@/components/flow/FlowSequenceBuilder";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { generateFlowPath, pruneRemovedZones, getFlowSequenceIds } from "@/components/flow/flowPathUtils";
import { DEFAULT_ZONES, CANVAS_INCHES, FLOW_COLORS } from "@/components/flow/flowConstants";
import ZoneSopViewer from "@/components/flow/ZoneSopViewer";

export default function Flow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [mode, setMode] = useState("view"); // "view" (safe walkthrough) | "edit" (full editing) — defaults to View, not persisted
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFlowManager, setShowFlowManager] = useState(false);
  const [editingSequenceFlow, setEditingSequenceFlow] = useState(null);
  const [checkedFlows, setCheckedFlows] = useState(new Set());
  const [selectedPathId, setSelectedPathId] = useState(null);
  const [pendingRegenFlow, setPendingRegenFlow] = useState(null);
  const [sopViewZoneId, setSopViewZoneId] = useState(null);
  const checkedInitRef = useRef(false);
  const pathGenRef = useRef(false);

  // Queries
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["shopFlowAreas"],
    queryFn: () => base44.entities.ShopFlowArea.list(),
    staleTime: 15000,
  });
  const { data: arrows = [] } = useQuery({
    queryKey: ["shopFlowArrows"],
    queryFn: () => base44.entities.ShopFlowArrow.list(),
    staleTime: 15000,
  });
  const { data: flows = [] } = useQuery({
    queryKey: ["shopFlows"],
    queryFn: () => base44.entities.ShopFlow.list(),
    staleTime: 15000,
  });
  const { data: sops = [] } = useQuery({
    queryKey: ["shopZoneSops"],
    queryFn: () => base44.entities.ShopZoneSOP.list(),
    staleTime: 15000,
  });
  const sopZoneIds = new Set(sops.map((s) => s.zone_id));

  const isLoading = zonesLoading;

  // Auto-seed zones
  const seedZones = useMutation({
    mutationFn: () => base44.entities.ShopFlowArea.bulkCreate(DEFAULT_ZONES),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  useEffect(() => {
    if (!isLoading && zones.length === 0 && !seedZones.isPending) seedZones.mutate();
  }, [isLoading, zones.length, seedZones.isPending]);

  // Migrate old inch-based positions (x > 100) to percentage-based
  const migratingRef = useRef(false);
  useEffect(() => {
    if (!isLoading && zones.length > 0 && !migratingRef.current) {
      const needsMigration = zones.some((z) => z.x > 100 || z.y > 100 || z.width > 100 || z.height > 100);
      if (needsMigration) {
        migratingRef.current = true;
        const updates = zones.map((z) => {
          const def = DEFAULT_ZONES.find((d) => d.name === z.name);
          if (def) return { id: z.id, x: def.x, y: def.y, width: def.width, height: def.height };
          // Proportional conversion for custom zones
          return {
            id: z.id,
            x: Math.min((z.x / CANVAS_INCHES) * 100, 100),
            y: Math.min((z.y / CANVAS_INCHES) * 100, 100),
            width: Math.min((z.width / CANVAS_INCHES) * 100, 100),
            height: Math.min((z.height / CANVAS_INCHES) * 100, 100),
          };
        });
        base44.entities.ShopFlowArea.bulkUpdate(updates).then(() =>
          queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] })
        );
      }
    }
  }, [isLoading, zones]);

  // Initialize checked flows (all visible by default)
  useEffect(() => {
    if (!checkedInitRef.current && flows.length > 0) {
      checkedInitRef.current = true;
      setCheckedFlows(new Set(flows.map((f) => f.name)));
    }
  }, [flows]);

  // Auto-generate flow paths for existing sequences on initial load
  useEffect(() => {
    if (pathGenRef.current || isLoading || flows.length === 0 || zones.length === 0) return;
    pathGenRef.current = true;
    (async () => {
      let created = false;
      for (const flow of flows) {
        let seqIds = [];
        try { seqIds = JSON.parse(flow.sequence || "[]"); } catch { seqIds = []; }
        if (seqIds.length < 2) continue;
        const hasPath = arrows.some((a) => a.arrow_type === "flow_path" && a.flow_name === flow.name);
        if (hasPath) continue;
        const pathData = generateFlowPath(zones, seqIds);
        if (!pathData) continue;
        await base44.entities.ShopFlowArrow.create({
          arrow_type: "flow_path",
          flow_name: flow.name,
          start_x: pathData.points[0][0],
          start_y: pathData.points[0][1],
          end_x: pathData.points[pathData.points.length - 1][0],
          end_y: pathData.points[pathData.points.length - 1][1],
          label: JSON.stringify(pathData),
          color: FLOW_COLORS[flow.color] || "#64748b",
          stroke_width: 2,
          arrowhead_style: "filled",
        });
        created = true;
      }
      if (created) queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    })();
  }, [isLoading, flows, arrows, zones]);

  // SINGLE load-time initialization — dedupe + seed, sequential (no competing effects).
  // Replaces the old separate dedupe + Cut-bootstrap effects that raced each other
  // and caused "Entity ShopFlow with ID ... not found" errors. Runs ONCE on mount.
  // Updates debugStatus throughout so the on-screen banner shows real DB results.
  const [debugStatus, setDebugStatus] = useState("Initializing...");
  const initFlowsRef = useRef(false);
  useEffect(() => {
    if (initFlowsRef.current) return;
    initFlowsRef.current = true;
    (async () => {
      try {
        // Step 1: fetch all flows once
        setDebugStatus("Fetching existing flows...");
        const allFlows = await base44.entities.ShopFlow.list();
        setDebugStatus(`Found ${allFlows.length} existing flows in DB`);

        // Step 2: dedupe by name — keep oldest, merge sequences, delete duplicates.
        // Each await completes before the next step; no concurrent mutations.
        const groups = {};
        for (const f of allFlows) {
          const key = f.name.trim().toLowerCase();
          (groups[key] = groups[key] || []).push(f);
        }
        for (const key of Object.keys(groups)) {
          const group = groups[key].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          if (group.length < 2) continue;
          const keeper = group[0];
          const dups = group.slice(1);
          let merged = [];
          try { merged = JSON.parse(keeper.sequence || "[]"); } catch { merged = []; }
          for (const d of dups) {
            let ds = [];
            try { ds = JSON.parse(d.sequence || "[]"); } catch { ds = []; }
            for (const id of ds) if (!merged.includes(id)) merged.push(id);
          }
          try {
            await base44.entities.ShopFlow.update(keeper.id, { sequence: JSON.stringify(merged) });
          } catch (e) { console.warn("Flow init: keeper update skipped:", e?.message); }
          for (const d of dups) {
            try { await base44.entities.ShopFlow.delete(d.id); }
            catch (e) { console.warn("Flow init: dup delete skipped:", e?.message); }
          }
        }

        // Step 3: re-fetch the clean list
        let cleanFlows = await base44.entities.ShopFlow.list();
        setDebugStatus(`After dedupe: ${cleanFlows.length} flows in DB`);

        // Step 4: if no flows exist at all, seed ONE default "Cut" flow
        if (cleanFlows.length === 0) {
          setDebugStatus("No flows found — creating default 'Cut' flow...");
          try {
            const created = await base44.entities.ShopFlow.create({
              name: "Cut",
              color: "blue",
              sequence: JSON.stringify([]),
              is_active: true,
              sort_order: 1,
            });
            setDebugStatus(`✅ SUCCESS — Created flow with ID: ${created.id}`);
          } catch (e) {
            setDebugStatus(`❌ FAILED to create: ${e.message || JSON.stringify(e)}`);
            return;
          }
          cleanFlows = await base44.entities.ShopFlow.list();
          setDebugStatus(`✅ Created default flow. Now ${cleanFlows.length} flows in DB`);
        }

        // Step 5: ensure the "Cut" flow has a valid, non-orphaned sequence
        const allZones = await base44.entities.ShopFlowArea.list();
        const cutFlow = cleanFlows.find((f) => f.name === "Cut");
        if (cutFlow) {
          let seq = [];
          try { seq = JSON.parse(cutFlow.sequence || "[]"); } catch { seq = []; }
          const orphanCount = seq.filter((id) => !allZones.find((z) => z.id === id)).length;
          if (seq.length === 0 || orphanCount === seq.length) {
            const ordered = allZones
              .filter((z) => z.flow_order != null)
              .sort((a, b) => (a.flow_order ?? 999) - (b.flow_order ?? 999))
              .map((z) => z.id);
            if (ordered.length >= 2) {
              setDebugStatus(`Seeding Cut sequence with ${ordered.length} zones...`);
              try {
                await base44.entities.ShopFlow.update(cutFlow.id, { sequence: JSON.stringify(ordered) });
                setDebugStatus(`✅ Cut sequence seeded (${ordered.length} zones)`);
              } catch (e) {
                setDebugStatus(`❌ Cut sequence seed FAILED: ${e.message || JSON.stringify(e)}`);
              }
            }
          } else {
            setDebugStatus(`✅ Loaded ${cleanFlows.length} flows; Cut seq OK (${seq.length} zones)`);
          }
        }

        // Step 6: refresh react-query cache with the final clean state
        queryClient.invalidateQueries({ queryKey: ["shopFlows"] });
      } catch (err) {
        console.error("Flow init failed:", err);
        setDebugStatus(`❌ FAILED: ${err.message || JSON.stringify(err)}`);
        initFlowsRef.current = false; // allow a retry on next mount
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs ONCE on mount — never on unrelated state changes


  // Zone mutations
  const updateZone = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlowArea.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  const createZone = useMutation({
    mutationFn: (data) => base44.entities.ShopFlowArea.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }),
  });
  const deleteZone = useMutation({
    mutationFn: (id) => base44.entities.ShopFlowArea.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shopFlowAreas"] }); setSelectedZoneId(null); },
  });

  // Arrow mutations
  const createArrow = useMutation({
    mutationFn: (data) => base44.entities.ShopFlowArrow.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }),
  });
  const updateArrow = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlowArrow.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }),
  });
  const deleteArrow = useMutation({
    mutationFn: (id) => base44.entities.ShopFlowArrow.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] }); setSelectedArrowId(null); },
  });

  // Flow mutations — every save/delete surfaces success + failure toasts so
  // silent DB write failures can't hide (errors would otherwise be swallowed
  // by react-query's internal pipeline and never reach the user).
  const createFlow = useMutation({
    mutationFn: (data) => base44.entities.ShopFlow.create(data),
    onSuccess: (result) => {
      console.log("✅ ShopFlow.create succeeded:", result);
      queryClient.invalidateQueries({ queryKey: ["shopFlows"] });
      toast({ title: "✅ Flow saved to database" });
    },
    onError: (err) => {
      console.error("❌ ShopFlow.create FAILED:", err);
      toast({ title: "Failed to save flow", description: err?.message || String(err), variant: "destructive" });
    },
  });
  const deleteFlow = useMutation({
    mutationFn: (id) => base44.entities.ShopFlow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopFlows"] });
      toast({ title: "✅ Flow deleted" });
    },
    onError: (err) => {
      console.error("❌ ShopFlow.delete FAILED:", err);
      toast({ title: "Failed to delete flow", description: err?.message || String(err), variant: "destructive" });
    },
  });
  const renameFlow = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopFlow.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopFlows"] });
      toast({ title: "✅ Flow renamed" });
    },
    onError: (err) => {
      console.error("❌ ShopFlow.update (rename) FAILED:", err);
      toast({ title: "Failed to rename flow", description: err?.message || String(err), variant: "destructive" });
    },
  });
  const updateFlowSequence = useMutation({
    mutationFn: ({ id, sequence }) => base44.entities.ShopFlow.update(id, { sequence }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopFlows"] });
      toast({ title: "✅ Flow sequence saved" });
    },
    onError: (err) => {
      console.error("❌ ShopFlow.update (sequence) FAILED:", err);
      toast({ title: "Failed to save flow sequence", description: err?.message || String(err), variant: "destructive" });
    },
  });

  // Helper: delete all flow_path arrows by ID
  const deleteFlowPaths = async (ids) => {
    await Promise.all(ids.map((id) => base44.entities.ShopFlowArrow.delete(id)));
  };

  // Helper: build a flow_path record from generated path data
  const createFlowPathRecord = (flow, pathData) => ({
    arrow_type: "flow_path",
    flow_name: flow.name,
    start_x: pathData.points[0][0],
    start_y: pathData.points[0][1],
    end_x: pathData.points[pathData.points.length - 1][0],
    end_y: pathData.points[pathData.points.length - 1][1],
    label: JSON.stringify(pathData),
    color: FLOW_COLORS[flow.color] || "#64748b",
    stroke_width: 2,
    arrowhead_style: "filled",
  });

  // Ensure a flow has a path; delete old + regenerate if auto, prompt if manual
  const ensureFlowPath = async (flow, sequenceIds) => {
    if (!sequenceIds || sequenceIds.length < 2) return;
    const existingPaths = arrows.filter((a) => a.arrow_type === "flow_path" && a.flow_name === flow.name);
    const pathData = generateFlowPath(zones, sequenceIds);
    if (!pathData) return;

    if (existingPaths.length === 0) {
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
      return;
    }

    const manuallyEdited = existingPaths.some((p) => {
      try { return JSON.parse(p.label || "{}").auto_generated === false; } catch { return false; }
    });

    if (manuallyEdited) {
      setPendingRegenFlow({ flow, sequenceIds, existingPathIds: existingPaths.map((p) => p.id) });
    } else {
      await deleteFlowPaths(existingPaths.map((p) => p.id));
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    }
  };

  const handleRegeneratePath = async () => {
    if (!pendingRegenFlow) return;
    const { flow, sequenceIds, existingPathIds } = pendingRegenFlow;
    await deleteFlowPaths(existingPathIds);
    const pathData = generateFlowPath(zones, sequenceIds);
    if (pathData) {
      await base44.entities.ShopFlowArrow.create(createFlowPathRecord(flow, pathData));
    }
    queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    setPendingRegenFlow(null);
  };

  // Keep manually edited path but prune segments for zones removed from the sequence
  const handleKeepEdits = async () => {
    if (!pendingRegenFlow) return;
    const { sequenceIds, existingPathIds } = pendingRegenFlow;
    const existingPaths = arrows.filter((a) => existingPathIds.includes(a.id));
    for (const path of existingPaths) {
      try {
        const pathData = JSON.parse(path.label || "{}");
        const pruned = pruneRemovedZones(pathData, sequenceIds);
        if (pruned.points.length < 2) {
          await base44.entities.ShopFlowArrow.delete(path.id);
        } else {
          await base44.entities.ShopFlowArrow.update(path.id, {
            start_x: pruned.points[0][0],
            start_y: pruned.points[0][1],
            end_x: pruned.points[pruned.points.length - 1][0],
            end_y: pruned.points[pruned.points.length - 1][1],
            label: JSON.stringify(pruned),
          });
        }
      } catch { /* skip unparseable */ }
    }
    queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    setPendingRegenFlow(null);
  };

  // Rename flow and update flow_name on all its path arrows
  const handleRenameFlow = async (id, newName) => {
    const oldFlow = flows.find((f) => f.id === id);
    if (!oldFlow || oldFlow.name === newName) return;
    const dup = flows.find((f) => f.id !== id && f.name.trim().toLowerCase() === newName.trim().toLowerCase());
    if (dup) {
      toast({ title: "Duplicate flow", description: `A flow named "${dup.name}" already exists. Choose a different name.`, variant: "destructive" });
      return;
    }
    await renameFlow.mutateAsync({ id, data: { name: newName } });
    const flowArrows = arrows.filter((a) => a.arrow_type === "flow_path" && a.flow_name === oldFlow.name);
    if (flowArrows.length > 0) {
      await Promise.all(flowArrows.map((a) => base44.entities.ShopFlowArrow.update(a.id, { flow_name: newName })));
      queryClient.invalidateQueries({ queryKey: ["shopFlowArrows"] });
    }
    setCheckedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(oldFlow.name)) { next.delete(oldFlow.name); next.add(newName); }
      return next;
    });
    if (selectedFlow === oldFlow.name) setSelectedFlow(newName);
  };

  // Flow visibility handlers
  const toggleFlowVisibility = (flowName) => {
    setCheckedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(flowName)) next.delete(flowName);
      else next.add(flowName);
      return next;
    });
    if (checkedFlows.has(flowName) && selectedFlow === flowName) setSelectedFlow(null);
  };
  const showAllFlows = () => { setSelectedFlow(null); setSopViewZoneId(null); setCheckedFlows(new Set(flows.map((f) => f.name))); };
  const showSelectedOnly = () => setCheckedFlows(new Set());

  // Drag handlers (optimistic local update, save on end)
  const handleDragMove = (id, x, y, width, height) => {
    queryClient.setQueryData(["shopFlowAreas"], (old = []) =>
      old.map((z) => (z.id === id ? { ...z, x, y, width, height } : z))
    );
  };
  const handleDragEnd = (id) => {
    const current = queryClient.getQueryData(["shopFlowAreas"])?.find((z) => z.id === id);
    if (current) updateZone.mutate({ id, data: { x: current.x, y: current.y, width: current.width, height: current.height } });
  };

  const handleCreateZone = (data) => {
    createZone.mutate({ ...data, x: 40, y: 40, width: 15, height: 15, flow_tags: [] });
  };

  const handleSelectZone = (id) => {
    if (!id) { setSelectedZoneId(null); return; }
    if (mode === "edit") {
      setSelectedZoneId(id);
      setSelectedArrowId(null);
      setSelectedPathId(null);
      return;
    }
    // View mode: clicking a zone that belongs to the viewed flow opens its SOP panel
    if (viewingFlow && highlightedZoneIds.has(id)) {
      setSopViewZoneId(id);
    }
    // otherwise: do nothing (non-flow zones are non-interactive)
  };
  const handleSelectArrow = (id) => { setSelectedArrowId(id); if (id) { setSelectedZoneId(null); setSelectedPathId(null); } };
  const handleSelectPath = (id) => { setSelectedPathId(id); if (id) { setSelectedZoneId(null); setSelectedArrowId(null); } };
  const handleSelectFlow = (flowName) => {
    setSelectedFlow(flowName);
    setSelectedZoneId(null);
    setSelectedPathId(null);
    setSopViewZoneId(null);
    if (!flowName) return;
    setCheckedFlows((prev) => new Set([...prev, flowName]));
    const flowObj = flows.find((f) => f.name === flowName);

    // ===== TEMP DEBUG: verify the actual flow sequence data =====
    let rawSeq = [];
    try { rawSeq = JSON.parse(flowObj?.sequence || "[]"); } catch { rawSeq = []; }
    console.log(`=== FLOW DEBUG: ${flowName} ===`);
    console.log('Flow sequence (zone IDs):', rawSeq);
    console.log('Total zones in DB:', zones.length);
    rawSeq.forEach((zoneId, index) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) {
        console.log(`Step ${index + 1}: ZONE ID ${zoneId} — ⚠️ NOT FOUND (orphaned reference)`);
      } else {
        console.log(`Step ${index + 1}: ${zone.name} (id: ${zone.id}) — width: ${zone.width}, height: ${zone.height}, x: ${zone.x}, y: ${zone.y}`);
      }
    });
    const orphanCount = rawSeq.filter((id) => !zones.find((z) => z.id === id)).length;
    const tinyCount = rawSeq
      .map((id) => zones.find((z) => z.id === id))
      .filter((z) => z && (z.width < 5 || z.height < 5)).length;
    console.log(`Orphaned IDs: ${orphanCount}/${rawSeq.length} | Tiny zones (<5%): ${tinyCount}/${rawSeq.length}`);
    console.log('=== END FLOW DEBUG ===');
    // ===== END TEMP DEBUG =====

    const seq = getFlowSequenceIds(flowObj, zones);
    // In View mode, auto-open the first stage to start the walkthrough
    if (mode === "view" && seq.length > 0) setSopViewZoneId(seq[0]);
  };

  // Keyboard shortcut listener — delete selected zone/arrow/path
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.page !== "flow") return;
      if (e.detail.action === "delete-selected") {
        if (selectedZoneId) { deleteZone.mutate(selectedZoneId); setSelectedZoneId(null); }
        else if (selectedArrowId) { deleteArrow.mutate(selectedArrowId); setSelectedArrowId(null); }
        else if (selectedPathId) { deleteArrow.mutate(selectedPathId); setSelectedPathId(null); }
      }
    };
    window.addEventListener("encore:shortcut", handler);
    return () => window.removeEventListener("encore:shortcut", handler);
  }, [selectedZoneId, selectedArrowId, selectedPathId]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const selectedArrow = arrows.find((a) => a.id === selectedArrowId);
  const selectedFlowObj = flows.find((f) => f.name === selectedFlow) || null;
  const viewingFlow = mode === "view" && !!selectedFlow;
  const flowColorHex = viewingFlow && selectedFlowObj ? (FLOW_COLORS[selectedFlowObj.color] || "#64748b") : null;
  const flowSequenceIds = getFlowSequenceIds(selectedFlowObj, zones);
  const highlightedZoneIds = new Set(flowSequenceIds);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-screen bg-slate-50 overflow-hidden">
      {/* TEMP DEBUG BANNER — visible proof of seed/save success/failure */}
      <div style={{ padding: "8px 16px", background: "#fef3c7", fontSize: "12px", fontFamily: "monospace", borderBottom: "1px solid #fcd34d" }}>
        DEBUG: {debugStatus}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">Shop Flow</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View / Edit mode toggle — defaults to View on every page load */}
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`px-3 py-1.5 text-sm font-medium transition ${mode === "view" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            >
              👁 View
            </button>
            <button
              type="button"
              onClick={() => { setMode("edit"); setSopViewZoneId(null); }}
              className={`px-3 py-1.5 text-sm font-medium transition border-l border-slate-200 ${mode === "edit" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            >
              ✏️ Edit
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFlowManager(true)}>
            <Shuffle className="w-4 h-4 mr-1.5" />Flows
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1.5" />Add Zone
          </Button>
        </div>
      </div>

      {/* Flow View banner */}
      {viewingFlow && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-100 border-b border-amber-300 flex-shrink-0">
          <span className="font-semibold text-amber-900 text-sm truncate">
            👁️ Viewing: {selectedFlow}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-200"
            onClick={() => { setSelectedFlow(null); setSopViewZoneId(null); }}
          >
            ✕ Exit Flow View
          </Button>
        </div>
      )}

      {/* Zone / Arrow Editor (top panel) — Edit mode only */}
      {mode === "edit" && selectedZone && (
        <ZoneEditor
          zone={selectedZone}
          flows={flows}
          sop={sops.find((s) => s.zone_id === selectedZone.id)}
          onUpdate={(data) => updateZone.mutate({ id: selectedZone.id, data })}
          onDelete={() => deleteZone.mutate(selectedZone.id)}
          onClose={() => setSelectedZoneId(null)}
        />
      )}
      {mode === "edit" && selectedArrow && (
        <ArrowEditor
          arrow={selectedArrow}
          flows={flows}
          onUpdate={(data) => updateArrow.mutate({ id: selectedArrow.id, data })}
          onDelete={() => deleteArrow.mutate(selectedArrow.id)}
          onClose={() => setSelectedArrowId(null)}
        />
      )}

      {/* Canvas */}
      <div className="flex-1 p-2 min-h-0">
        <FlowCanvas
          zones={zones}
          mode={mode}
          selectedZoneId={selectedZoneId}
          onSelectZone={handleSelectZone}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          arrows={arrows}
          selectedArrowId={selectedArrowId}
          onSelectArrow={handleSelectArrow}
          onArrowCreate={(data) => createArrow.mutate(data)}
          onArrowUpdate={(id, data) => updateArrow.mutate({ id, data })}
          selectedFlow={selectedFlow}
          checkedFlows={checkedFlows}
          highlightedZoneIds={highlightedZoneIds}
          selectedPathId={selectedPathId}
          onSelectPath={handleSelectPath}
          onUpdatePath={(id, data) => updateArrow.mutate({ id, data })}
          sopZoneIds={sopZoneIds}
          flowColorHex={flowColorHex}
          isLoading={isLoading}
          activeZoneId={sopViewZoneId}
          onSelectStage={(zoneId) => setSopViewZoneId(zoneId)}
        />
      </div>

      {/* Modals */}
      <AddZoneDialog open={showAddDialog} onOpenChange={setShowAddDialog} onCreate={handleCreateZone} />
      <FlowManager
        open={showFlowManager}
        onOpenChange={setShowFlowManager}
        flows={flows}
        onCreate={createFlow.mutate}
        onDelete={deleteFlow.mutate}
        onRename={handleRenameFlow}
        selectedFlow={selectedFlow}
        onSelectFlow={handleSelectFlow}
        onEditSequence={(flow) => { setEditingSequenceFlow(flow); setShowFlowManager(false); }}
        checkedFlows={checkedFlows}
        onToggleFlowVisibility={toggleFlowVisibility}
        onShowAllFlows={showAllFlows}
        onShowSelectedOnly={showSelectedOnly}
      />
      <FlowSequenceBuilder
        flow={editingSequenceFlow}
        zones={zones}
        open={!!editingSequenceFlow}
        onOpenChange={(open) => { if (!open) setEditingSequenceFlow(null); }}
        onSave={async (id, sequence) => {
          await updateFlowSequence.mutateAsync({ id, sequence });
          const flow = flows.find((f) => f.id === id);
          if (flow) {
            let seqIds = [];
            try { seqIds = JSON.parse(sequence || "[]"); } catch { seqIds = []; }
            await ensureFlowPath(flow, seqIds);
          }
        }}
      />

      {/* SOP Viewer (Flow View training walkthrough) */}
      <ZoneSopViewer
        open={!!sopViewZoneId && viewingFlow}
        onClose={() => setSopViewZoneId(null)}
        zone={zones.find((z) => z.id === sopViewZoneId)}
        sop={sops.find((s) => s.zone_id === sopViewZoneId)}
        flowName={selectedFlow}
        stepIndex={sopViewZoneId ? flowSequenceIds.indexOf(sopViewZoneId) : -1}
        totalSteps={flowSequenceIds.length}
        hasPrev={sopViewZoneId ? flowSequenceIds.indexOf(sopViewZoneId) > 0 : false}
        hasNext={sopViewZoneId ? flowSequenceIds.indexOf(sopViewZoneId) < flowSequenceIds.length - 1 : false}
        onPrev={() => { const i = flowSequenceIds.indexOf(sopViewZoneId); if (i > 0) setSopViewZoneId(flowSequenceIds[i - 1]); }}
        onNext={() => { const i = flowSequenceIds.indexOf(sopViewZoneId); if (i < flowSequenceIds.length - 1) setSopViewZoneId(flowSequenceIds[i + 1]); }}
        onExitToEdit={() => { const id = sopViewZoneId; setSelectedFlow(null); setSopViewZoneId(null); setMode("edit"); if (id) setSelectedZoneId(id); }}
      />

      {/* Regeneration prompt */}
      <Dialog open={!!pendingRegenFlow} onOpenChange={(open) => !open && setPendingRegenFlow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sequence changed — regenerate path?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">The flow sequence was updated but the path has manual edits.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleKeepEdits}>Keep Edits</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleRegeneratePath}>Regenerate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}