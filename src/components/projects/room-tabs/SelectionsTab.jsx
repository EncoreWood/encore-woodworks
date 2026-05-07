import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SELECTIONS = [
  {
    key: "cabinet_style", label: "Cabinet Style",
    options: ["FF Inset - Shaker", "FF Inset - Flat", "Overlay - Shaker", "Overlay - Flat", "Euro - Frameless", "Custom"]
  },
  {
    key: "wood_species", label: "Wood Species",
    options: ["Painted", "Maple", "Cherry", "White Oak", "Walnut", "Alder", "MDF", "Custom"]
  },
  {
    key: "finish", label: "Finish",
    options: ["TBD", "Painted White", "Painted Gray", "Painted Custom", "Natural", "Stain - Light", "Stain - Medium", "Stain - Dark", "Two-Tone", "Custom"]
  },
  {
    key: "door_style", label: "Door Style",
    options: ["Shaker", "Flat Panel", "Raised Panel", "Beadboard", "Glass Insert", "Slab", "Custom"]
  },
  {
    key: "handles", label: "Handles / Hardware",
    options: ["TBD", "Bar Pull", "Cup Pull", "Knob", "No Hardware", "Custom"]
  },
  {
    key: "drawer_glides", label: "Drawer Glides",
    options: ["Soft Close", "Full Extension", "Standard", "Custom"]
  },
  {
    key: "hinges", label: "Hinges",
    options: ["Soft Close", "Standard", "Concealed", "Custom"]
  },
  {
    key: "molding", label: "Molding",
    options: ["None", "Crown - Simple", "Crown - Build Up", "Light Rail", "Base Molding", "Custom"]
  },
  {
    key: "cabs_to_height", label: "Cabs Finished to Height",
    options: ["Yes", "No", "Partial"]
  }
];

function SelectionCard({ field, value, customValue, onChange, onCustomChange, readOnly }) {
  const isCustom = value === "Custom" || (value && !field.options.includes(value));
  const displayCustom = isCustom && value !== "Custom";

  if (readOnly) {
    return (
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <p className="text-xs text-slate-500 mb-1 font-medium">{field.label}</p>
        <p className="text-sm font-semibold text-slate-800">{value || <span className="text-slate-400 font-normal">—</span>}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <p className="text-xs text-slate-500 mb-1.5 font-medium">{field.label}</p>
      <select
        value={isCustom && !displayCustom ? "Custom" : (value || "")}
        onChange={e => onChange(field.key, e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <option value="">— Select —</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {(isCustom) && (
        <Input
          className="mt-2 h-8 text-sm"
          placeholder="Enter custom value..."
          value={displayCustom ? value : (customValue || "")}
          onChange={e => onCustomChange(field.key, e.target.value)}
        />
      )}
    </div>
  );
}

export default function SelectionsTab({ formData, setFormData, project, roomIndex, readOnly = false }) {
  const queryClient = useQueryClient();
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomValue, setNewCustomValue] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [pendingCustoms, setPendingCustoms] = useState({});

  const autoSave = async (updatedRoom) => {
    if (readOnly || roomIndex === null || roomIndex === undefined || !project?.id) return;
    // Always pull latest rooms from cache to avoid stale-prop overwrites
    const cached = queryClient.getQueryData(["project", project.id]);
    const baseRooms = (cached?.rooms ?? project.rooms ?? []);
    const updatedRooms = [...baseRooms];
    updatedRooms[roomIndex] = updatedRoom;
    await base44.entities.Project.update(project.id, { rooms: updatedRooms });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project", project.id] });
  };

  const handleChange = async (key, value) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    if (value !== "Custom") {
      await autoSave(updated);
    }
  };

  const handleCustomChange = async (key, value) => {
    setPendingCustoms(prev => ({ ...prev, [key]: value }));
    const updated = { ...formData, [key]: value };
    setFormData(updated);
  };

  const handleCustomBlur = async (key) => {
    const updated = { ...formData, [key]: formData[key] };
    await autoSave(updated);
  };

  const handleCabinetCountChange = async (value) => {
    const updated = { ...formData, cabinet_count: value };
    setFormData(updated);
  };

  const handleCabinetCountBlur = async () => {
    const updated = { ...formData, cabinet_count: formData.cabinet_count ? Number(formData.cabinet_count) : undefined };
    await autoSave(updated);
  };

  const handleNotesBlur = async () => {
    await autoSave({ ...formData });
  };

  const handleAddCustomSelection = async () => {
    if (!newCustomLabel.trim()) return;
    const custom_selections = [...(formData.custom_selections || []), { label: newCustomLabel.trim(), value: newCustomValue.trim() }];
    const updated = { ...formData, custom_selections };
    setFormData(updated);
    await autoSave(updated);
    setNewCustomLabel("");
    setNewCustomValue("");
    setAddingCustom(false);
  };

  const handleRemoveCustomSelection = async (idx) => {
    const custom_selections = (formData.custom_selections || []).filter((_, i) => i !== idx);
    const updated = { ...formData, custom_selections };
    setFormData(updated);
    await autoSave(updated);
  };

  return (
    <div className="space-y-4">
      {/* Preset selections grid */}
      <div className="grid grid-cols-2 gap-3">
        {SELECTIONS.map(field => (
          <SelectionCard
            key={field.key}
            field={field}
            value={formData[field.key] || ""}
            customValue={pendingCustoms[field.key]}
            onChange={handleChange}
            onCustomChange={handleCustomChange}
            readOnly={readOnly}
          />
        ))}

        {/* Cabinet Count */}
        {readOnly ? (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1 font-medium">Cabinet Count</p>
            <p className="text-sm font-semibold text-slate-800">{formData.cabinet_count || <span className="text-slate-400 font-normal">—</span>}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1.5 font-medium">Cabinet Count</p>
            <Input
              type="number"
              value={formData.cabinet_count || ""}
              onChange={e => handleCabinetCountChange(e.target.value)}
              onBlur={handleCabinetCountBlur}
              className="h-8 text-sm"
              placeholder="Count"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-xs text-slate-500 font-medium">Room Notes</Label>
        {readOnly ? (
          formData.notes ? (
            <p className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{formData.notes}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">—</p>
          )
        ) : (
          <Textarea
            value={formData.notes || ""}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            onBlur={handleNotesBlur}
            placeholder="Room-specific notes..."
            rows={2}
            className="mt-1 text-sm"
          />
        )}
      </div>

      {/* Custom selections */}
      {(formData.custom_selections || []).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {(formData.custom_selections || []).map((cs, idx) => (
            <div key={idx} className="bg-amber-50 rounded-lg p-3 border border-amber-200 relative">
              <p className="text-xs text-amber-600 mb-1 font-medium">{cs.label}</p>
              <p className="text-sm font-semibold text-slate-800">{cs.value || "—"}</p>
              {!readOnly && (
                <button
                  className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600"
                  onClick={() => handleRemoveCustomSelection(idx)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Selection */}
      {!readOnly && (
        <div>
          {addingCustom ? (
            <div className="border border-dashed border-amber-300 rounded-lg p-3 space-y-2">
              <Input
                placeholder="Label (e.g. Crown Color)"
                value={newCustomLabel}
                onChange={e => setNewCustomLabel(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Value (e.g. Painted White)"
                value={newCustomValue}
                onChange={e => setNewCustomValue(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleAddCustomSelection}>Add</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingCustom(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setAddingCustom(true)}>
              <Plus className="w-3 h-3" /> Add Custom Selection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}