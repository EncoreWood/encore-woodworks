import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText, BarChart3, Edit2, Eye } from "lucide-react";
import { format } from "date-fns";

export default function Forms() {
  const [selectedForm, setSelectedForm] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // list, edit, fill, responses
  const [showNewFormDialog, setShowNewFormDialog] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [editingFields, setEditingFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: forms = [] } = useQuery({
    queryKey: ["forms"],
    queryFn: () => base44.entities.Form.list("-created_date")
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["formResponses", selectedForm?.id],
    queryFn: () => {
      if (!selectedForm) return [];
      return base44.entities.FormResponse.filter({ form_id: selectedForm.id }, "-created_date");
    },
    enabled: !!selectedForm
  });

  const createFormMutation = useMutation({
    mutationFn: (data) => base44.entities.Form.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      setShowNewFormDialog(false);
      setNewFormName("");
      setNewFormDescription("");
      setSelectedTemplate("");
    }
  });

  const updateFormMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Form.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      setViewMode("list");
    }
  });

  const deleteFormMutation = useMutation({
    mutationFn: (id) => base44.entities.Form.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      setSelectedForm(null);
      setViewMode("list");
    }
  });

  const submitResponseMutation = useMutation({
    mutationFn: (data) => base44.entities.FormResponse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formResponses"] });
      setFormData({});
      setViewMode("list");
      alert("Form submitted successfully!");
    }
  });

  const handleCreateForm = () => {
    if (!newFormName.trim()) return;
    
    let fields = [];
    if (selectedTemplate) {
      const template = forms.find(f => f.id === selectedTemplate);
      if (template) {
        fields = template.fields || [];
      }
    }
    
    createFormMutation.mutate({
      name: newFormName,
      description: newFormDescription,
      fields: fields,
      active: true
    });
  };

  const handleEditForm = (form) => {
    setSelectedForm(form);
    setEditingFields(form.fields || []);
    setViewMode("edit");
  };

  const handleSaveForm = () => {
    updateFormMutation.mutate({
      id: selectedForm.id,
      data: { ...selectedForm, fields: editingFields }
    });
  };

  const addField = () => {
    setEditingFields([
      ...editingFields,
      {
        id: Date.now().toString(),
        label: "",
        type: "text",
        required: false,
        options: []
      }
    ]);
  };

  const updateField = (index, updates) => {
    const newFields = [...editingFields];
    newFields[index] = { ...newFields[index], ...updates };
    setEditingFields(newFields);
  };

  const removeField = (index) => {
    setEditingFields(editingFields.filter((_, i) => i !== index));
  };

  const handleFillForm = (form) => {
    setSelectedForm(form);
    setFormData({});
    setViewMode("fill");
  };

  const handleSubmitForm = () => {
    const form = selectedForm;
    const requiredFields = form.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.id]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.map(f => f.label).join(", ")}`);
      return;
    }

    submitResponseMutation.mutate({
      form_id: form.id,
      form_name: form.name,
      responses: formData,
      submitted_by: currentUser?.full_name || currentUser?.email || "Unknown"
    });
  };

  const handleViewResponses = (form) => {
    setSelectedForm(form);
    setViewMode("responses");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Forms</h1>
          <p className="text-slate-600">Create and manage forms</p>
        </div>

        {viewMode === "list" && (
          <>
            <div className="flex justify-end mb-6">
              <Button onClick={() => setShowNewFormDialog(true)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                New Form
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{form.name}</span>
                      {!form.active && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Inactive</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {form.description && (
                      <p className="text-sm text-slate-600">{form.description}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {form.fields?.length || 0} field{form.fields?.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditForm(form)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFillForm(form)}
                        className="flex-1"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Fill
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewResponses(form)}
                        className="flex-1"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Responses
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {viewMode === "edit" && selectedForm && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedForm.name}</h2>
                <p className="text-slate-600">Edit form fields</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewMode("list")}>
                  Cancel
                </Button>
                <Button onClick={handleSaveForm} className="bg-amber-600 hover:bg-amber-700">
                  Save Changes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this form?")) {
                      deleteFormMutation.mutate(selectedForm.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                {editingFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Field {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(index, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Text Area</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {field.type === "select" && (
                      <div>
                        <Label>Options (comma separated)</Label>
                        <Input
                          value={(field.options || []).join(", ")}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                            })
                          }
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      <Label htmlFor={`required-${field.id}`} className="cursor-pointer font-normal">
                        Required field
                      </Label>
                    </div>
                  </div>
                ))}
                <Button onClick={addField} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === "fill" && selectedForm && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedForm.name}</h2>
                {selectedForm.description && (
                  <p className="text-slate-600">{selectedForm.description}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => setViewMode("list")}>
                Cancel
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                {selectedForm.fields?.map((field) => (
                  <div key={field.id}>
                    <Label>
                      {field.label} {field.required && <span className="text-red-600">*</span>}
                    </Label>
                    {field.type === "text" && (
                      <Input
                        value={formData[field.id] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.type === "textarea" && (
                      <Textarea
                        value={formData[field.id] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="mt-1"
                        rows={4}
                      />
                    )}
                    {field.type === "number" && (
                      <Input
                        type="number"
                        value={formData[field.id] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.type === "email" && (
                      <Input
                        type="email"
                        value={formData[field.id] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.type === "date" && (
                      <Input
                        type="date"
                        value={formData[field.id] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.type === "select" && (
                      <Select
                        value={formData[field.id] || ""}
                        onValueChange={(value) => setFormData({ ...formData, [field.id]: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "checkbox" && (
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox
                          id={field.id}
                          checked={formData[field.id] || false}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, [field.id]: checked })
                          }
                        />
                        <Label htmlFor={field.id} className="cursor-pointer font-normal">
                          Yes
                        </Label>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  onClick={handleSubmitForm}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  disabled={submitResponseMutation.isPending}
                >
                  Submit Form
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === "responses" && selectedForm && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedForm.name} - Responses</h2>
                <p className="text-slate-600">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
              </div>
              <Button variant="outline" onClick={() => setViewMode("list")}>
                Back to Forms
              </Button>
            </div>

            {responses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500">No responses yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-semibold text-slate-900">Submitted By</th>
                          <th className="text-left p-4 font-semibold text-slate-900">Date</th>
                          {selectedForm.fields?.map((field) => (
                            <th key={field.id} className="text-left p-4 font-semibold text-slate-900">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map((response) => (
                          <tr key={response.id} className="border-b hover:bg-slate-50">
                            <td className="p-4 text-slate-900">{response.submitted_by}</td>
                            <td className="p-4 text-slate-600 text-sm">
                              {format(new Date(response.created_date), "MMM d, yyyy HH:mm")}
                            </td>
                            {selectedForm.fields?.map((field) => (
                              <td key={field.id} className="p-4 text-slate-700">
                                {typeof response.responses[field.id] === "boolean"
                                  ? response.responses[field.id] ? "Yes" : "No"
                                  : response.responses[field.id] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* New Form Dialog */}
        <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Use Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Start from blank or choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Blank Form</SelectItem>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Form Name</Label>
                <Input
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="Enter form name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  placeholder="Describe the purpose of this form"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewFormDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateForm}
                  disabled={!newFormName.trim() || createFormMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Create Form
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}