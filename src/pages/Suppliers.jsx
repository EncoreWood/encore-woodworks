import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, Phone, Mail, Star, Edit2, Trash2 } from "lucide-react";

export default function Suppliers() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    ordering_url: "",
    category: "general",
    contact_name: "",
    phone: "",
    email: "",
    account_number: "",
    notes: "",
    favorite: false
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-favorite", 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      website_url: "",
      ordering_url: "",
      category: "general",
      contact_name: "",
      phone: "",
      email: "",
      account_number: "",
      notes: "",
      favorite: false
    });
    setShowAddDialog(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      website_url: supplier.website_url || "",
      ordering_url: supplier.ordering_url || "",
      category: supplier.category || "general",
      contact_name: supplier.contact_name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      account_number: supplier.account_number || "",
      notes: supplier.notes || "",
      favorite: supplier.favorite || false
    });
    setShowAddDialog(true);
  };

  const toggleFavorite = (supplier) => {
    updateMutation.mutate({
      id: supplier.id,
      data: { ...supplier, favorite: !supplier.favorite }
    });
  };

  const categoryColors = {
    wood: "bg-amber-100 text-amber-800",
    hardware: "bg-slate-100 text-slate-800",
    finishes: "bg-purple-100 text-purple-800",
    cabinet_components: "bg-blue-100 text-blue-800",
    countertops: "bg-stone-100 text-stone-800",
    tools: "bg-red-100 text-red-800",
    general: "bg-gray-100 text-gray-800"
  };

  const filteredSuppliers = suppliers.filter(s => 
    filterCategory === "all" || s.category === filterCategory
  );

  const favorites = filteredSuppliers.filter(s => s.favorite);
  const regular = filteredSuppliers.filter(s => !s.favorite);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Suppliers</h1>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        <div className="mb-6">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="wood">Wood</SelectItem>
              <SelectItem value="hardware">Hardware</SelectItem>
              <SelectItem value="finishes">Finishes</SelectItem>
              <SelectItem value="cabinet_components">Cabinet Components</SelectItem>
              <SelectItem value="countertops">Countertops</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {favorites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              Favorites
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((supplier) => (
                <Card key={supplier.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${categoryColors[supplier.category]}`}>
                          {supplier.category}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(supplier)}
                        className="text-amber-500 hover:text-amber-600"
                      >
                        <Star className="w-5 h-5 fill-amber-500" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {supplier.ordering_url && (
                      <a
                        href={supplier.ordering_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Order Now
                      </a>
                    )}
                    {supplier.website_url && !supplier.ordering_url && (
                      <a
                        href={supplier.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Visit Website
                      </a>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                      </div>
                    )}
                    {supplier.account_number && (
                      <div className="text-xs text-slate-500">
                        Account: {supplier.account_number}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(supplier.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">All Suppliers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regular.map((supplier) => (
              <Card key={supplier.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${categoryColors[supplier.category]}`}>
                        {supplier.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(supplier)}
                      className="text-slate-300 hover:text-amber-500"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supplier.ordering_url && (
                    <a
                      href={supplier.ordering_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Order Now
                    </a>
                  )}
                  {supplier.website_url && !supplier.ordering_url && (
                    <a
                      href={supplier.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </a>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                    </div>
                  )}
                  {supplier.account_number && (
                    <div className="text-xs text-slate-500">
                      Account: {supplier.account_number}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                      className="flex-1"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(supplier.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Supplier Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wood">Wood</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="finishes">Finishes</SelectItem>
                      <SelectItem value="cabinet_components">Cabinet Components</SelectItem>
                      <SelectItem value="countertops">Countertops</SelectItem>
                      <SelectItem value="tools">Tools</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Ordering URL (Direct link to order/login)</Label>
                <Input
                  type="url"
                  value={formData.ordering_url}
                  onChange={(e) => setFormData({ ...formData, ordering_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Website URL</Label>
                <Input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="favorite"
                  checked={formData.favorite}
                  onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="favorite" className="cursor-pointer">Mark as favorite</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                  {editingSupplier ? "Update" : "Create"} Supplier
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}