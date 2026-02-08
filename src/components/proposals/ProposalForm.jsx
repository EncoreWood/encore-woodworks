import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProposalForm({ proposal, project, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: project?.id || "",
    project_name: project?.project_name || "",
    job_name: project?.project_name || "",
    address: project?.address || "",
    cabinet_style: "Face Frame Inset",
    wood_species: "",
    door_style: "",
    handles: "",
    drawerbox: "",
    drawer_glides: "",
    hinges: "",
    rooms: [],
    options: [],
    files: [],
    standard_total: 0,
    overall_total: 0,
    payment_terms: "Payment Schedule\n50% Deposit required before Job Production Starts\n40% Payment will be required upon Completion of cabinet Production\nFinal 10% Will be due at completion of Installation\nAdditional work will be addressed only by a change order form and will not affect payment in this contract.",
    notes: "",
    ...proposal
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const roomsTotal = formData.rooms.reduce((sum, room) => sum + (room.price || 0), 0);
    const optionsTotal = formData.options
      .filter(opt => opt.selected)
      .reduce((sum, opt) => sum + (opt.price || 0), 0);
    setFormData(prev => ({
      ...prev,
      standard_total: roomsTotal,
      overall_total: roomsTotal + optionsTotal
    }));
  }, [formData.rooms, formData.options]);

  const addRoom = () => {
    setFormData(prev => ({
      ...prev,
      rooms: [...prev.rooms, { room_name: "", finish: "", items_of_recognition: "", price: 0 }]
    }));
  };

  const updateRoom = (index, field, value) => {
    const newRooms = [...formData.rooms];
    newRooms[index] = { ...newRooms[index], [field]: field === "price" ? parseFloat(value) || 0 : value };
    setFormData(prev => ({ ...prev, rooms: newRooms }));
  };

  const removeRoom = (index) => {
    setFormData(prev => ({ ...prev, rooms: prev.rooms.filter((_, i) => i !== index) }));
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { description: "", price: 0, selected: false }]
    }));
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: field === "price" ? parseFloat(value) || 0 : value };
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, { name: file.name, url: file_url }]
      }));
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Info */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4">Project Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Job Name</Label>
            <Input
              value={formData.job_name}
              onChange={(e) => setFormData({ ...formData, job_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Specifications */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4">Specifications</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cabinet Style</Label>
            <Input
              value={formData.cabinet_style}
              onChange={(e) => setFormData({ ...formData, cabinet_style: e.target.value })}
            />
          </div>
          <div>
            <Label>Wood Species</Label>
            <Input
              value={formData.wood_species}
              onChange={(e) => setFormData({ ...formData, wood_species: e.target.value })}
            />
          </div>
          <div>
            <Label>Door Style</Label>
            <Input
              value={formData.door_style}
              onChange={(e) => setFormData({ ...formData, door_style: e.target.value })}
            />
          </div>
          <div>
            <Label>Handles</Label>
            <Input
              value={formData.handles}
              onChange={(e) => setFormData({ ...formData, handles: e.target.value })}
            />
          </div>
          <div>
            <Label>Drawerbox</Label>
            <Input
              value={formData.drawerbox}
              onChange={(e) => setFormData({ ...formData, drawerbox: e.target.value })}
            />
          </div>
          <div>
            <Label>Drawer Glides</Label>
            <Input
              value={formData.drawer_glides}
              onChange={(e) => setFormData({ ...formData, drawer_glides: e.target.value })}
            />
          </div>
          <div>
            <Label>Hinges</Label>
            <Input
              value={formData.hinges}
              onChange={(e) => setFormData({ ...formData, hinges: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Rooms */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Standard Rooms</h3>
          <Button type="button" onClick={addRoom} size="sm" className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1" /> Add Room
          </Button>
        </div>
        <div className="space-y-3">
          {formData.rooms.map((room, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-xs">Room Name</Label>
                <Input
                  value={room.room_name}
                  onChange={(e) => updateRoom(index, "room_name", e.target.value)}
                  placeholder="Kitchen"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Finish</Label>
                <Input
                  value={room.finish}
                  onChange={(e) => updateRoom(index, "finish", e.target.value)}
                  placeholder="White"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Items of Recognition</Label>
                <Input
                  value={room.items_of_recognition}
                  onChange={(e) => updateRoom(index, "items_of_recognition", e.target.value)}
                  placeholder="Details"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  value={room.price}
                  onChange={(e) => updateRoom(index, "price", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRoom(index)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center font-semibold">
            <span>Standard Total:</span>
            <span className="text-lg">${formData.standard_total.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Options */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Options</h3>
          <Button type="button" onClick={addOption} size="sm" className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1" /> Add Option
          </Button>
        </div>
        <div className="space-y-3">
          {formData.options.map((option, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-1 flex items-end pb-2">
                <Checkbox
                  checked={option.selected}
                  onCheckedChange={(checked) => updateOption(index, "selected", checked)}
                />
              </div>
              <div className="col-span-8">
                <Label className="text-xs">Description</Label>
                <Input
                  value={option.description}
                  onChange={(e) => updateOption(index, "description", e.target.value)}
                  placeholder="Optional upgrade"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  value={option.price}
                  onChange={(e) => updateOption(index, "price", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Overall Total */}
      <Card className="p-4 bg-amber-50">
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Overall Total:</span>
          <span className="text-amber-700">${formData.overall_total.toLocaleString()}</span>
        </div>
      </Card>

      {/* Files */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Attachments</h3>
          <Button type="button" size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={uploading} asChild>
            <label>
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? "Uploading..." : "Upload File"}
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </Button>
        </div>
        <div className="space-y-2">
          {formData.files?.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
              <span className="text-sm">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {(!formData.files || formData.files.length === 0) && (
            <p className="text-sm text-slate-500">No files attached</p>
          )}
        </div>
      </Card>

      {/* Payment Terms */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4">Payment Terms</h3>
        <Textarea
          value={formData.payment_terms}
          onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
          rows={6}
          className="font-mono text-sm"
        />
      </Card>

      {/* Notes */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4">Additional Notes</h3>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          placeholder="Any additional notes..."
        />
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
          Save Proposal
        </Button>
      </div>
    </form>
  );
}