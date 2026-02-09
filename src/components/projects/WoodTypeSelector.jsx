import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function WoodTypeSelector({ selectedWoods = [], availableWoods = [], onChange, onUpdateAvailable }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newWoodType, setNewWoodType] = useState("");
  const [editableWoods, setEditableWoods] = useState([]);

  const handleToggleWood = (wood) => {
    if (selectedWoods.includes(wood)) {
      onChange(selectedWoods.filter(w => w !== wood));
    } else {
      onChange([...selectedWoods, wood]);
    }
  };

  const handleAddWood = () => {
    if (newWoodType.trim() && !availableWoods.includes(newWoodType.trim())) {
      onUpdateAvailable([...availableWoods, newWoodType.trim()]);
      setNewWoodType("");
      setShowAddDialog(false);
    }
  };

  const handleRemoveWood = (wood) => {
    // Remove from both available and selected
    onUpdateAvailable(availableWoods.filter(w => w !== wood));
    if (selectedWoods.includes(wood)) {
      onChange(selectedWoods.filter(w => w !== wood));
    }
  };

  const openEditDialog = () => {
    setEditableWoods([...availableWoods]);
    setShowEditDialog(true);
  };

  const saveEditedWoods = () => {
    onUpdateAvailable(editableWoods.filter(w => w.trim()));
    // Update selected woods to remove any that were deleted
    onChange(selectedWoods.filter(w => editableWoods.includes(w)));
    setShowEditDialog(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Select wood types:</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openEditDialog}
            className="h-7 px-2 text-xs"
          >
            <Edit2 className="w-3 h-3 mr-1" />
            Edit List
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Wood
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableWoods.map((wood) => (
          <Badge
            key={wood}
            variant={selectedWoods.includes(wood) ? "default" : "outline"}
            className={`cursor-pointer transition-all ${
              selectedWoods.includes(wood)
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "hover:bg-slate-100"
            }`}
            onClick={() => handleToggleWood(wood)}
          >
            {wood}
          </Badge>
        ))}
      </div>

      {selectedWoods.length > 0 && (
        <div className="pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">Selected: {selectedWoods.join(", ")}</span>
        </div>
      )}

      {/* Add Wood Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Wood Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newWoodType}
              onChange={(e) => setNewWoodType(e.target.value)}
              placeholder="e.g., Bamboo"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddWood();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewWoodType("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddWood}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!newWoodType.trim() || availableWoods.includes(newWoodType.trim())}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Woods Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Wood Types</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {editableWoods.map((wood, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={wood}
                  onChange={(e) => {
                    const updated = [...editableWoods];
                    updated[idx] = e.target.value;
                    setEditableWoods(updated);
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWood(wood)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditableWoods([...editableWoods, ""])}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditableWoods([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveEditedWoods}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}