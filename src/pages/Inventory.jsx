import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";

const categoryConfig = {
  wood: { label: "Wood", color: "bg-amber-50 border-amber-200" },
  hardware: { label: "Hardware", color: "bg-slate-50 border-slate-200" },
  finishes: { label: "Finishes", color: "bg-blue-50 border-blue-200" },
  tools: { label: "Tools", color: "bg-orange-50 border-orange-200" },
  supplies: { label: "Supplies", color: "bg-green-50 border-green-200" },
  other: { label: "Other", color: "bg-gray-50 border-gray-200" },
};

const statusConfig = {
  in_stock: { label: "In Stock", color: "bg-green-100 text-green-800" },
  low_stock: { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" },
  reorder: { label: "Reorder", color: "bg-red-100 text-red-800" },
  discontinued: { label: "Discontinued", color: "bg-gray-100 text-gray-800" },
};

export default function Inventory() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    category: "supplies",
    quantity: "",
    unit: "",
    min_quantity: "",
    price_per_unit: "",
    supplier: "",
    location: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inventory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inventory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        min_quantity: item.min_quantity || "",
        price_per_unit: item.price_per_unit || "",
        supplier: item.supplier || "",
        location: item.location || "",
        notes: item.notes || "",
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData({
      name: "",
      category: "supplies",
      quantity: "",
      unit: "",
      min_quantity: "",
      price_per_unit: "",
      supplier: "",
      location: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      min_quantity: formData.min_quantity ? parseFloat(formData.min_quantity) : undefined,
      price_per_unit: formData.price_per_unit ? parseFloat(formData.price_per_unit) : undefined,
      supplier: formData.supplier || undefined,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
    };

    // Determine status
    if (formData.quantity === "" || formData.quantity === 0) {
      data.status = "discontinued";
    } else if (
      formData.min_quantity &&
      parseFloat(formData.quantity) <= parseFloat(formData.min_quantity)
    ) {
      data.status = "reorder";
    } else if (formData.min_quantity && parseFloat(formData.quantity) <= parseFloat(formData.min_quantity) * 1.5) {
      data.status = "low_stock";
    } else {
      data.status = "in_stock";
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredItems = items.filter((item) => {
    const categoryMatch = filterCategory === "all" || item.category === filterCategory;
    const statusMatch = filterStatus === "all" || item.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const categorizedItems = {
    wood: filteredItems.filter((i) => i.category === "wood"),
    hardware: filteredItems.filter((i) => i.category === "hardware"),
    finishes: filteredItems.filter((i) => i.category === "finishes"),
    tools: filteredItems.filter((i) => i.category === "tools"),
    supplies: filteredItems.filter((i) => i.category === "supplies"),
    other: filteredItems.filter((i) => i.category === "other"),
  };

  const lowStockItems = items.filter((i) =>
    ["low_stock", "reorder"].includes(i.status)
  );

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
            <p className="text-slate-500 mt-1">
              Manage materials, hardware, and supplies
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
                <p className="text-sm text-red-800 mt-1">
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""}{" "}
                  need attention:{" "}
                  {lowStockItems.map((i) => i.name).join(", ")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <Label className="text-xs text-slate-600">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inventory Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(categorizedItems).map(([category, categoryItems]) => (
            <div key={category}>
              <div className={`rounded-lg border-2 p-4 ${categoryConfig[category].color}`}>
                <h2 className="font-semibold text-slate-900 mb-4">
                  {categoryConfig[category].label} ({categoryItems.length})
                </h2>
                <div className="space-y-3">
                  {categoryItems.length === 0 ? (
                    <p className="text-sm text-slate-500">No items</p>
                  ) : (
                    categoryItems.map((item) => (
                      <Card key={item.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-slate-900 truncate">
                              {item.name}
                            </h3>
                            {item.supplier && (
                              <p className="text-xs text-slate-500">
                                {item.supplier}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={statusConfig[item.status].color}
                          >
                            {statusConfig[item.status].label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Qty:</span>
                            <p className="font-semibold text-slate-900">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          {item.min_quantity && (
                            <div>
                              <span className="text-slate-500">Min:</span>
                              <p className="font-semibold text-slate-900">
                                {item.min_quantity} {item.unit}
                              </p>
                            </div>
                          )}
                        </div>

                        {item.location && (
                          <p className="text-xs text-slate-600">
                            📍 {item.location}
                          </p>
                        )}

                        {item.price_per_unit && (
                          <p className="text-xs text-slate-600">
                            ${item.price_per_unit.toFixed(2)}/{item.unit}
                          </p>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(item)}
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="flex-1 text-red-600"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Item" : "Add Inventory Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Oak Wood Planks"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="e.g., board ft"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Quantity</Label>
                  <Input
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_quantity: e.target.value,
                      })
                    }
                    placeholder="Reorder level"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price per Unit</Label>
                  <Input
                    type="number"
                    value={formData.price_per_unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_unit: e.target.value,
                      })
                    }
                    placeholder="$0.00"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  placeholder="e.g., Woodcraft Supplies"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Storage Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Rack A1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formData.name ||
                    !formData.quantity ||
                    !formData.unit ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {editingItem ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}