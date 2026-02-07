import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Package, Upload, X } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800" },
  ordered: { label: "Ordered", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800" },
  received: { label: "Received", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export default function PurchaseOrders() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [formData, setFormData] = useState({
    order_number: "",
    supplier: "",
    order_date: "",
    expected_delivery_date: "",
    total_cost: "",
    notes: "",
    items: [{ item_name: "", quantity: "", unit: "", price_per_unit: "" }],
  });

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-order_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const handleOpenDialog = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        order_number: order.order_number || "",
        supplier: order.supplier,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date || "",
        total_cost: order.total_cost || "",
        notes: order.notes || "",
        items: order.items || [{ item_name: "", quantity: "", unit: "", price_per_unit: "" }],
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingOrder(null);
    setFormData({
      order_number: "",
      supplier: "",
      order_date: "",
      expected_delivery_date: "",
      total_cost: "",
      notes: "",
      items: [{ item_name: "", quantity: "", unit: "", price_per_unit: "" }],
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: "", quantity: "", unit: "", price_per_unit: "" }],
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index, field, value) => {
    const updatedItems = formData.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price_per_unit) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleUploadInvoice = async (e, orderId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingInvoice(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PurchaseOrder.update(orderId, {
        invoice_file: file_url,
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleSubmit = () => {
    const data = {
      order_number: formData.order_number || undefined,
      supplier: formData.supplier,
      order_date: formData.order_date,
      expected_delivery_date: formData.expected_delivery_date || undefined,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : calculateTotal(),
      notes: formData.notes || undefined,
      items: formData.items.filter(item => item.item_name),
      status: editingOrder ? editingOrder.status : "pending",
    };

    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const updateStatus = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    const data = { status: newStatus };
    
    if (newStatus === "received" && !order.actual_delivery_date) {
      data.actual_delivery_date = format(new Date(), "yyyy-MM-dd");
    }
    
    updateMutation.mutate({ id: orderId, data });
  };

  const filteredOrders = filterStatus === "all" 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  const groupedOrders = {
    pending: filteredOrders.filter(o => o.status === "pending"),
    ordered: filteredOrders.filter(o => o.status === "ordered"),
    shipped: filteredOrders.filter(o => o.status === "shipped"),
    received: filteredOrders.filter(o => o.status === "received"),
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
            <p className="text-slate-500 mt-1">
              Manage supplier orders and deliveries
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Label className="text-xs text-slate-600">Filter by Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(groupedOrders).map(([status, statusOrders]) => (
            <div key={status}>
              <div className="bg-white rounded-lg border-2 border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900">
                    {statusConfig[status].label}
                  </h2>
                  <Badge className={statusConfig[status].color}>
                    {statusOrders.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {statusOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">No orders</p>
                  ) : (
                    statusOrders.map((order) => (
                      <Card key={order.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-slate-900">
                              {order.supplier}
                            </h3>
                            {order.order_number && (
                              <p className="text-xs text-slate-500">
                                #{order.order_number}
                              </p>
                            )}
                          </div>
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ordered:</span>
                            <span className="font-medium text-slate-900">
                              {format(new Date(order.order_date), "MMM d")}
                            </span>
                          </div>
                          {order.expected_delivery_date && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Expected:</span>
                              <span className="font-medium text-slate-900">
                                {format(new Date(order.expected_delivery_date), "MMM d")}
                              </span>
                            </div>
                          )}
                          {order.total_cost && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total:</span>
                              <span className="font-semibold text-slate-900">
                                ${order.total_cost.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="text-xs text-slate-600 pt-2 border-t">
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </div>
                        )}

                        <div className="pt-2 border-t space-y-2">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => updateStatus(order.id, newStatus)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(order)}
                              className="flex-1 h-8 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {!order.invoice_file ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-8 text-xs"
                                disabled={uploadingInvoice}
                                onClick={() => document.getElementById(`invoice-${order.id}`).click()}
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Invoice
                                <input
                                  id={`invoice-${order.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleUploadInvoice(e, order.id)}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-8 text-xs text-green-600"
                                onClick={() => window.open(order.invoice_file, "_blank")}
                              >
                                View Invoice
                              </Button>
                            )}
                          </div>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? "Edit Purchase Order" : "New Purchase Order"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Number (optional)</Label>
                  <Input
                    value={formData.order_number}
                    onChange={(e) =>
                      setFormData({ ...formData, order_number: e.target.value })
                    }
                    placeholder="PO-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Supplier *</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier: e.target.value })
                    }
                    placeholder="Supplier name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Date *</Label>
                  <Input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) =>
                      setFormData({ ...formData, order_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <Input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_delivery_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Order Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 border rounded">
                      <Input
                        placeholder="Item name"
                        value={item.item_name}
                        onChange={(e) => updateItem(index, "item_name", e.target.value)}
                        className="col-span-4 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="col-span-2 h-8 text-xs"
                      />
                      <Input
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="col-span-2 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.price_per_unit}
                        onChange={(e) => updateItem(index, "price_per_unit", e.target.value)}
                        className="col-span-3 h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="col-span-1 h-8 w-8 p-0 text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.items.some(i => i.quantity && i.price_per_unit) && (
                  <div className="flex justify-end mt-2 text-sm font-semibold text-slate-900">
                    Calculated Total: ${calculateTotal().toFixed(2)}
                  </div>
                )}
              </div>

              <div>
                <Label>Total Cost (optional - auto-calculated from items)</Label>
                <Input
                  type="number"
                  value={formData.total_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, total_cost: e.target.value })
                  }
                  placeholder="$0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes or special instructions"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formData.supplier ||
                    !formData.order_date ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {editingOrder ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}