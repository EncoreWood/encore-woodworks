import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Check, Plus, Trash2, X, Send, Settings2, Link2, Search, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { createPageUrl } from "@/utils";
import BidPricingSettings from "./BidPricingSettings";
import BidClientView from "./BidClientView";
import BidCatalogEditor from "./BidCatalogEditor";
import { getCategoryStyle } from "./BidCatalogEditor";
import RoomSketch from "./RoomSketch";

// Aliases for use inside RoomItemsEditor to avoid naming conflicts
const UISelect = Select, UISelectContent = SelectContent, UISelectItem = SelectItem, UISelectTrigger = SelectTrigger, UISelectValue = SelectValue;

const BID_STYLES = [
  { key: "basic_euro",          label: "Tier 1 Euro" },
  { key: "high_end_euro",       label: "Tier 3 Euro" },
  { key: "basic_face_frame",    label: "Tier 1 Face Frame" },
  { key: "mid_face_frame",      label: "Tier 2 Face Frame" },
  { key: "high_end_face_frame", label: "Tier 3 Face Frame" },
];



// ── Room Items Editor ───────────────────────────────────────────────────────────
function RoomItemsEditor({ room, catalogItems, categories, pricingConfigs, bidType, onChange }) {
  const [catalogFilter, setCatalogFilter] = useState("all");

  const getPrice = (category, measureType) => {
    if (measureType === "lf" && ["base", "upper", "tall"].includes(category)) {
      const cfg = pricingConfigs.find(c => c.style_key === bidType);
      if (cfg) {
        if (category === "base") return cfg.bases_lf || 0;
        if (category === "upper") return cfg.uppers_lf || 0;
        if (category === "tall") return cfg.tall_lf || 0;
      }
    }
    return 0;
  };

  const addFromCatalog = (catalogId) => {
    const blank = { id: `item_${Date.now()}`, name: "", cabinet_category: "misc", measure_type: "lf", quantity: 0, unit_price: 0, notes: "" };
    if (!catalogId || catalogId === "__custom__") { onChange({ ...room, items: [...(room.items || []), blank] }); return; }
    const cat = catalogItems.find(c => c.id === catalogId);
    if (!cat) return;
    const price = getPrice(cat.cabinet_category, cat.measure_type);
    onChange({ ...room, items: [...(room.items || []), { id: `item_${Date.now()}`, name: cat.name, cabinet_category: cat.cabinet_category || "misc", measure_type: cat.measure_type || "lf", quantity: 0, unit_price: price || cat.default_price || 0, notes: "" }] });
  };

  const updateItem = (itemId, field, value) => {
    const updated = (room.items || []).map(item => {
      if (item.id !== itemId) return item;
      const u = { ...item, [field]: value };
      if (field === "cabinet_category") u.unit_price = getPrice(value, item.measure_type);
      return u;
    });
    onChange({ ...room, items: updated });
  };

  const removeItem = (itemId) => onChange({ ...room, items: (room.items || []).filter(i => i.id !== itemId) });

  const getCatClass = (key) => {
    const color = (categories || []).find(c => c.key === key)?.color;
    const style = getCategoryStyle(color || "slate");
    return `${style.bg} ${style.text}`;
  };

  const getCatLabel = (key) => (categories || []).find(c => c.key === key)?.label || key;
  const byCategory = {};
  (catalogItems || []).forEach(c => { const cat = c.cabinet_category || "misc"; if (!byCategory[cat]) byCategory[cat] = []; byCategory[cat].push(c); });

  const roomTotal = (room.items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const roomLf = (room.items || []).filter(i => i.measure_type === "lf").reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

  return (
    <div>
      {(room.items || []).length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2 px-1">
            <span>Items</span>
            <span>{roomLf > 0 ? `${roomLf.toFixed(1)} LF · ` : ""}<span className="text-amber-700 font-bold">${roomTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
          </div>
          <div className="space-y-2">
            {(room.items || []).map(item => {
              const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
              return (
                <div key={item.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex gap-2">
                    <Input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} className="h-8 text-sm flex-1" placeholder="Item name" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <UISelect value={item.cabinet_category} onValueChange={v => updateItem(item.id, "cabinet_category", v)}>
                      <UISelectTrigger className={`h-8 text-xs ${getCatClass(item.cabinet_category)}`}><UISelectValue /></UISelectTrigger>
                      <UISelectContent>{(categories || []).map(c => <UISelectItem key={c.key} value={c.key}>{c.label}</UISelectItem>)}</UISelectContent>
                    </UISelect>
                    <UISelect value={item.measure_type} onValueChange={v => updateItem(item.id, "measure_type", v)}>
                      <UISelectTrigger className="h-8 text-xs"><UISelectValue /></UISelectTrigger>
                      <UISelectContent>
                        <UISelectItem value="lf">Linear Feet</UISelectItem>
                        <UISelectItem value="qty">Quantity</UISelectItem>
                        <UISelectItem value="sqft">Square Feet</UISelectItem>
                      </UISelectContent>
                    </UISelect>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-xs text-slate-500">{item.measure_type === "lf" ? "Lin. Feet" : item.measure_type === "sqft" ? "Sq. Feet" : "Qty"}</label>
                      <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-8 text-sm mt-0.5" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Unit Price</label>
                      <Input type="number" value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} className="h-8 text-sm mt-0.5" />
                    </div>
                    <div className="text-right">
                      <label className="text-xs text-slate-500">Subtotal</label>
                      <p className="font-bold text-amber-700 mt-1">${sub.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Category filter + catalog dropdown */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setCatalogFilter("all")} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${catalogFilter === "all" ? "bg-slate-700 text-white border-transparent" : "text-slate-600 bg-slate-100 border-slate-200"}`}>All</button>
          {(categories || []).map(cat => {
            const style = getCategoryStyle(cat.color);
            return (
              <button key={cat.key} onClick={() => setCatalogFilter(cat.key)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${catalogFilter === cat.key ? `${style.active} border-transparent` : `${style.text} ${style.bg} border-slate-200`}`}>{cat.label}</button>
            );
          })}
        </div>
        <UISelect value="" onValueChange={addFromCatalog}>
          <UISelectTrigger className="h-9 border-dashed text-slate-500 text-sm"><UISelectValue placeholder="+ Add item from catalog..." /></UISelectTrigger>
          <UISelectContent>
            <UISelectItem value="__custom__">✏️ Custom Item</UISelectItem>
            {Object.entries(byCategory).filter(([cat]) => catalogFilter === "all" || cat === catalogFilter).map(([cat, items]) => (
              <SelectGroup key={cat}>
                <SelectLabel className="text-xs text-slate-400">{getCatLabel(cat)}</SelectLabel>
                {items.map(ci => <UISelectItem key={ci.id} value={ci.id}>{ci.name} <span className="text-slate-400 text-xs ml-1">({ci.measure_type === "lf" ? "LF" : ci.measure_type === "sqft" ? "SqFt" : "Qty"})</span></UISelectItem>)}
              </SelectGroup>
            ))}
          </UISelectContent>
        </UISelect>
      </div>
    </div>
  );
}

// ── Onsite Bid Workspace ────────────────────────────────────────────────────────
export default function OnsiteBidWorkspace({ bidId, project: linkedProject, onClose, onSaved }) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState(linkedProject?.id || null);
  const [bidType, setBidType] = useState(null);
  const [specs, setSpecs] = useState({ wood_species: "", door_style: "", handles: "", drawerbox: "", drawer_glides: "", hinges: "" });
  const [rooms, setRooms] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [showCatalogEditor, setShowCatalogEditor] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showLinkProjectDialog, setShowLinkProjectDialog] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [allProjects, setAllProjects] = useState([]);
  const [uploadingRoomId, setUploadingRoomId] = useState(null);
  const [estimatedBy, setEstimatedBy] = useState("");
  const [employees, setEmployees] = useState([]);

  const { data: bidData } = useQuery({
    queryKey: ["onsite_bid", bidId],
    queryFn: () => base44.entities.Bid.filter({ id: bidId }),
    enabled: !!bidId,
  });

  useEffect(() => {
    loadPricing(); loadCatalog(); loadCategories();
    base44.entities.Employee.list().then(setEmployees);
  }, []);

  useEffect(() => {
    if (!bidId && linkedProject) {
      setProjectName(linkedProject.project_name || "");
      setClientName(linkedProject.client_name || linkedProject.home_owner?.name || "");
      setAddress(linkedProject.address || "");
      setLinkedProjectId(linkedProject.id);
    }
  }, [linkedProject, bidId]);

  useEffect(() => {
    if (bidData?.[0]) {
      const b = bidData[0];
      setProjectName(b.project_name || "");
      setClientName(b.client_name || "");
      setAddress(b.address || "");
      setLinkedProjectId(b.project_id || null);
      setBidType(b.bid_type || null);
      setRooms(b.rooms || []);
      setSpecs({ wood_species: b.wood_species || "", door_style: b.door_style || "", handles: b.handles || "", drawerbox: b.drawerbox || "", drawer_glides: b.drawer_glides || "", hinges: b.hinges || "" });
      setNotes(b.notes || "");
      setStatus(b.status || "draft");
      setEstimatedBy(b.estimated_by || "");
    }
  }, [bidData]);

  const loadPricing = async () => { const c = await base44.entities.BidPricingConfig.list(); setPricingConfigs(c); };
  const loadCatalog = async () => { const i = await base44.entities.BidItemCatalog.list("sort_order"); setCatalogItems(i); };
  const loadCategories = async () => {
    const cats = await base44.entities.BidCategory.list("sort_order");
    if (cats.length > 0) { setCategories(cats); }
    else {
      const { DEFAULT_CATEGORIES } = await import("./BidCatalogEditor");
      const created = await Promise.all(DEFAULT_CATEGORIES.map(c => base44.entities.BidCategory.create(c)));
      setCategories(created);
    }
  };

  const getPriceForCategory = (category) => {
    if (!bidType) return 0;
    const config = pricingConfigs.find(c => c.style_key === bidType);
    if (!config) return 0;
    if (category === "base") return config.bases_lf || 0;
    if (category === "upper") return config.uppers_lf || 0;
    if (category === "tall") return config.tall_lf || 0;
    return 0;
  };

  const handleBidTypeChange = (val) => {
    setBidType(val);
    const cfg = pricingConfigs.find(c => c.style_key === val);
    if (cfg) setSpecs({ wood_species: cfg.wood_species || "", door_style: cfg.door_style || "", handles: cfg.handles || "", drawerbox: cfg.drawerbox || "", drawer_glides: cfg.drawer_glides || "", hinges: cfg.hinges || "" });
    setRooms(prev => prev.map(room => ({
      ...room,
      items: (room.items || []).map(item => {
        if (item.measure_type !== "lf" || item.cabinet_category === "misc") return item;
        const cfg = pricingConfigs.find(c => c.style_key === val);
        if (!cfg) return item;
        let price = 0;
        if (item.cabinet_category === "base") price = cfg.bases_lf || 0;
        else if (item.cabinet_category === "upper") price = cfg.uppers_lf || 0;
        else if (item.cabinet_category === "tall") price = cfg.tall_lf || 0;
        return { ...item, unit_price: price };
      })
    })));
  };

  const grandTotal = rooms.reduce((s, room) => s + (room.items || []).reduce((rs, item) => rs + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0), 0);
  const totalLf = rooms.reduce((s, room) => s + (room.items || []).filter(i => i.measure_type === "lf").reduce((rs, i) => rs + (parseFloat(i.quantity) || 0), 0), 0);

  const [collapsedRooms, setCollapsedRooms] = useState({});
  const toggleRoomCollapse = (roomId) => setCollapsedRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }));

  const addRoom = () => setRooms(prev => [...prev, { id: `room_${Date.now()}`, room_name: "", items: [], photos: [], sketch_paths: [] }]);

  const updateRoom = (roomId, changes) => setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...changes } : r));

  const handlePhotoUpload = async (roomId, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingRoomId(roomId);
    const uploaded = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
    const newPhotos = uploaded.map((r, i) => ({ url: r.file_url, name: files[i].name }));
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: [...(r.photos || []), ...newPhotos] } : r));
    setUploadingRoomId(null);
  };

  const removePhoto = (roomId, photoIdx) => setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: r.photos.filter((_, i) => i !== photoIdx) } : r));

  const openLinkDialog = async () => {
    const projs = await base44.entities.Project.list("-created_date", 200);
    setAllProjects(projs.filter(p => !p.archived));
    setProjectSearch("");
    setShowLinkProjectDialog(true);
  };

  const handleLinkProject = async (project) => {
    setLinkedProjectId(project.id);
    setShowLinkProjectDialog(false);
    if (bidId) await base44.entities.Bid.update(bidId, { project_id: project.id });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const data = {
      project_name: projectName || "Untitled Onsite Bid",
      client_name: clientName,
      address,
      project_id: linkedProjectId || null,
      bid_type: bidType,
      ...specs,
      rooms,
      total: Math.round(grandTotal),
      total_lf: Math.round(totalLf * 10) / 10,
      notes,
      status,
      bid_mode: "onsite",
      estimated_by: estimatedBy,
    };
    if (bidId) { await base44.entities.Bid.update(bidId, data); }
    else { await base44.entities.Bid.create(data); }
    setIsSaving(false);
    setSaved(true);
    onSaved?.();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">ONSITE</span>
        </div>
        <Input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="Project Name"
          className="text-lg font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent flex-1"
        />
        {linkedProjectId ? (
          <div className="hidden sm:flex items-center gap-1">
            <a href={createPageUrl("ProjectDetails") + "?id=" + linkedProjectId} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-100">
              <Link2 className="w-3.5 h-3.5" /> View Project
            </a>
            <button onClick={() => setLinkedProjectId(null)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={openLinkDialog} className="hidden sm:flex h-9 gap-1.5 text-slate-700 border-slate-300">
            <Link2 className="w-4 h-4" /> Link Project
          </Button>
        )}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
        {rooms.length > 0 && (
          <Button onClick={() => setShowClientView(true)} variant="outline" className="h-9 gap-1.5 hidden sm:flex">
            <Send className="w-4 h-4" /> Client View
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-9">
          {saved ? <><Check className="w-4 h-4 mr-1" />Saved</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save</>}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Project Info */}
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Client Name</label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Address</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Project Address" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Estimate Provided By</label>
            <Select value={estimatedBy} onValueChange={setEstimatedBy}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.full_name}>{emp.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Cabinet Style */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Cabinet Style</h2>
            <Button variant="outline" size="sm" onClick={() => setShowPricingSettings(true)} className="h-9 gap-1.5">
              <Settings2 className="w-4 h-4" /> Edit Pricing
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BID_STYLES.map(s => {
              const cfg = pricingConfigs.find(c => c.style_key === s.key);
              const label = cfg?.style_label || s.label;
              const isSelected = bidType === s.key;
              return (
                <button key={s.key} onClick={() => handleBidTypeChange(s.key)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${isSelected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-300"}`}>
                  <div className={`text-sm font-semibold mb-1 ${isSelected ? "text-amber-800" : "text-slate-800"}`}>{label}</div>
                  {cfg?.description && <div className="text-xs text-slate-500 italic mb-1 leading-snug">{cfg.description}</div>}
                  {cfg ? (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>Base: <span className="font-medium text-slate-700">${cfg.bases_lf}/LF</span></div>
                      <div>Upper: <span className="font-medium text-slate-700">${cfg.uppers_lf}/LF</span></div>
                      <div>Tall: <span className="font-medium text-slate-700">${cfg.tall_lf}/LF</span></div>
                    </div>
                  ) : <div className="text-xs text-slate-400">Loading...</div>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Job Specifications */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-slate-900 mb-3">Job Specifications</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { field: "wood_species", label: "Wood Species" },
              { field: "door_style",   label: "Door Style" },
              { field: "handles",      label: "Handles" },
              { field: "drawerbox",    label: "Drawerbox" },
              { field: "drawer_glides",label: "Drawer Glides" },
              { field: "hinges",       label: "Hinges" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                <Input value={specs[field] || ""} onChange={e => setSpecs(prev => ({ ...prev, [field]: e.target.value }))} placeholder={label} className="h-9 text-sm" />
              </div>
            ))}
          </div>
        </Card>

        {/* Rooms */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{rooms.length > 0 ? `Rooms (${rooms.length})` : "Rooms"}</h2>
            <Button variant="outline" size="sm" onClick={() => setShowCatalogEditor(true)} className="h-9 gap-1.5">
              Edit Catalog
            </Button>
          </div>

          {rooms.map(room => {
            const isCollapsed = !!collapsedRooms[room.id];
            const roomTotal = (room.items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
            return (
            <Card key={room.id} className="overflow-hidden">
              {/* Room header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <button onClick={() => toggleRoomCollapse(room.id)} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                <Input
                  value={room.room_name || ""}
                  onChange={e => updateRoom(room.id, { room_name: e.target.value })}
                  placeholder="Room name (e.g. Kitchen)"
                  className="font-semibold text-slate-800 border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent text-base"
                />
                {isCollapsed && roomTotal > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex-shrink-0">
                    ${roomTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
                <button onClick={() => setRooms(prev => prev.filter(r => r.id !== room.id))} className="ml-auto p-1.5 text-slate-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {!isCollapsed && <div className="p-4 space-y-4">
                {/* Bid Items */}
                <RoomItemsEditor
                  room={room}
                  catalogItems={catalogItems}
                  categories={categories}
                  pricingConfigs={pricingConfigs}
                  bidType={bidType}
                  onChange={updated => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, ...updated } : r))}
                />

                {/* Photos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Photos</p>
                    <label className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${uploadingRoomId === room.id ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                      <Camera className="w-3.5 h-3.5" />
                      {uploadingRoomId === room.id ? "Uploading..." : "Add Photos"}
                      <input type="file" accept="image/*" multiple capture="environment" onChange={e => handlePhotoUpload(room.id, e)} className="hidden" disabled={uploadingRoomId === room.id} />
                    </label>
                  </div>
                  {(room.photos || []).length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {(room.photos || []).map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200">
                          <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(room.id, idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">No photos yet</div>
                  )}
                </div>

                {/* Room Sketch */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Room Layout Sketch</p>
                  <RoomSketch
                    paths={room.sketch_paths || []}
                    onPathsChange={paths => updateRoom(room.id, { sketch_paths: paths })}
                    onHighlightsChange={highlights => {
                      // Combine highlights with the same cabKey, summing their LF
                      const grouped = {};
                      highlights.forEach(hl => {
                        if (!grouped[hl.cabKey]) grouped[hl.cabKey] = { ...hl, quantity: 0, count: 0 };
                        grouped[hl.cabKey].quantity += hl.quantity;
                        grouped[hl.cabKey].count += 1;
                      });
                      const sketchItemIds = new Set((room.sketch_items || []).map(i => i.id));
                      const existingCustomItems = (room.items || []).filter(i => !sketchItemIds.has(i.id));
                      const newSketchItems = Object.values(grouped).map(hl => {
                        const price = getPriceForCategory(hl.cabKey);
                        const label = hl.cabKey.charAt(0).toUpperCase() + hl.cabKey.slice(1);
                        return {
                          id: `sketch_${hl.cabKey}`,
                          name: `${label} Cabinets (sketch)`,
                          cabinet_category: hl.cabKey,
                          measure_type: "lf",
                          quantity: Math.round(hl.quantity * 100) / 100,
                          unit_price: price,
                          notes: `From sketch: ${hl.count} section${hl.count > 1 ? "s" : ""} · ${hl.quantity.toFixed(2)} LF total`,
                        };
                      });
                      setRooms(prev => prev.map(r => r.id === room.id
                        ? { ...r, sketch_paths: r.sketch_paths, sketch_items: newSketchItems, items: [...existingCustomItems, ...newSketchItems] }
                        : r
                      ));
                    }}
                  />
                </div>

                {/* Room notes */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1.5">Room Notes</p>
                  <Textarea
                    value={room.room_notes || ""}
                    onChange={e => updateRoom(room.id, { room_notes: e.target.value })}
                    placeholder="Notes for this room..."
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>}
            </Card>
            );
          })}

          <Button onClick={addRoom} variant="outline" className="w-full h-11 border-dashed text-slate-600 border-slate-300">
            <Plus className="w-4 h-4 mr-1" /> Add Room
          </Button>
        </div>

        {/* General Notes */}
        <Card className="p-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Additional Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." className="min-h-[80px]" />
        </Card>

        {/* Grand Total Footer */}
        {rooms.length > 0 && (
          <Card className="p-4 bg-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-sm">{rooms.length} rooms · {totalLf.toFixed(1)} total LF</div>
                <div className="text-2xl font-bold text-amber-400 mt-0.5">${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 h-11 px-6">
                {saved ? <><Check className="w-4 h-4 mr-1" />Saved!</> : isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-1" />Save Bid</>}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Link Project Dialog */}
      <Dialog open={showLinkProjectDialog} onOpenChange={setShowLinkProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link to Project</DialogTitle></DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Search projects..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {allProjects.filter(p => !projectSearch || p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) || p.client_name?.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
              <button key={p.id} onClick={() => handleLinkProject(p)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200">
                <div className="font-medium text-sm text-slate-800">{p.project_name}</div>
                {p.client_name && <div className="text-xs text-slate-500">{p.client_name}</div>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BidPricingSettings open={showPricingSettings} onClose={() => setShowPricingSettings(false)} onPricingUpdated={loadPricing} />
      <BidCatalogEditor open={showCatalogEditor} onClose={() => setShowCatalogEditor(false)} onSaved={() => { loadCatalog(); loadCategories(); }} />
      <BidClientView open={showClientView} onClose={() => setShowClientView(false)} bid={{ project_name: projectName, client_name: clientName, address, rooms, notes, ...specs }} bidType={pricingConfigs.find(c => c.style_key === bidType)?.style_label || BID_STYLES.find(s => s.key === bidType)?.label} />
    </div>
  );
}