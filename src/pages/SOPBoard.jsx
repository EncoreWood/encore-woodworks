import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Eye, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useState as useStateImport } from "react";

const CATEGORIES = ["Office", "Face Frame", "Spray", "Build", "Cut", "Calculations"];

export default function SOPBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSOPDialog, setShowNewSOPDialog] = useState(false);
  const [editingSOP, setEditingSOP] = useState(null);
  const [viewingSOP, setViewingSOP] = useState(null);
  const [newSOP, setNewSOP] = useState({
    title: "",
    category: "Office",
    purpose: "",
    scope: "",
    materials: "",
    steps: [{ step_number: 1, instruction: "" }],
    safety_precautions: "",
    quality_checkpoints: "",
    files: [],
    notes: ""
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: sops = [] } = useQuery({
    queryKey: ["sops"],
    queryFn: () => base44.entities.SOP.list("-created_date")
  });

  const createSOPMutation = useMutation({
    mutationFn: (data) => base44.entities.SOP.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      setShowNewSOPDialog(false);
      setNewSOP({
        title: "",
        category: "Office",
        purpose: "",
        scope: "",
        materials: "",
        steps: [{ step_number: 1, instruction: "" }],
        safety_precautions: "",
        quality_checkpoints: "",
        files: [],
        notes: ""
      });
      toast.success("SOP created successfully");
    },
    onError: () => toast.error("Failed to create SOP")
  });

  const updateSOPMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SOP.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      setEditingSOP(null);
      setNewSOP({
        title: "",
        category: "Office",
        purpose: "",
        scope: "",
        materials: "",
        steps: [{ step_number: 1, instruction: "" }],
        safety_precautions: "",
        quality_checkpoints: "",
        files: [],
        notes: ""
      });
      toast.success("SOP updated successfully");
    },
    onError: () => toast.error("Failed to update SOP")
  });

  const deleteSOPMutation = useMutation({
    mutationFn: (id) => base44.entities.SOP.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      setViewingSOP(null);
      toast.success("SOP deleted successfully");
    },
    onError: () => toast.error("Failed to delete SOP")
  });

  const groupedSOPs = CATEGORIES.reduce((acc, category) => {
    acc[category] = sops.filter(sop => sop.category === category && sop.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sop = sops.find(s => s.id === draggableId);
    if (!sop) return;

    updateSOPMutation.mutate({
      id: sop.id,
      data: { category: destination.droppableId }
    });
  };

  const handleSaveSOP = () => {
    if (!newSOP.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (editingSOP) {
      updateSOPMutation.mutate({
        id: editingSOP.id,
        data: newSOP
      });
    } else {
      createSOPMutation.mutate(newSOP);
    }
  };

  const handleEdit = (sop) => {
    setEditingSOP(sop);
    setNewSOP({
      title: sop.title || "",
      category: sop.category || "Office",
      purpose: sop.purpose || "",
      scope: sop.scope || "",
      materials: sop.materials || "",
      steps: sop.steps && sop.steps.length > 0 ? sop.steps : [{ step_number: 1, instruction: "" }],
      safety_precautions: sop.safety_precautions || "",
      quality_checkpoints: sop.quality_checkpoints || "",
      files: sop.files || [],
      notes: sop.notes || ""
    });
    setShowNewSOPDialog(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setNewSOP(prev => ({
          ...prev,
          files: [...(prev.files || []), { name: file.name, url: result.file_url }]
        }));
      }
      toast.success("File(s) uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setNewSOP(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const addStep = () => {
    const newStepNumber = (newSOP.steps?.length || 0) + 1;
    setNewSOP({
      ...newSOP,
      steps: [...(newSOP.steps || []), { step_number: newStepNumber, instruction: "" }]
    });
  };

  const removeStep = (index) => {
    setNewSOP({
      ...newSOP,
      steps: newSOP.steps.filter((_, i) => i !== index)
    });
  };

  const updateStep = (index, instruction) => {
    const updatedSteps = [...newSOP.steps];
    updatedSteps[index] = { step_number: index + 1, instruction };
    setNewSOP({ ...newSOP, steps: updatedSteps });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Standard Operating Procedures</h1>
              <p className="text-slate-500 mt-1">Organize and manage SOPs by category</p>
            </div>
            <Button
              onClick={() => {
                setEditingSOP(null);
                setNewSOP({ title: "", category: "Office", description: "", steps: [], notes: "" });
                setShowNewSOPDialog(true);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New SOP
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {CATEGORIES.map((category) => (
              <Droppable droppableId={category} key={category}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-slate-100" : ""
                    }`}
                  >
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <h2 className="font-semibold text-amber-900">{category}</h2>
                      <Badge variant="secondary" className="ml-auto mt-1">
                        {groupedSOPs[category].length}
                      </Badge>
                    </div>

                    <div className="space-y-3 flex-1">
                      {groupedSOPs[category].map((sop, index) => (
                        <Draggable draggableId={sop.id} index={index} key={sop.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`relative group transition-all ${
                                snapshot.isDragging ? "opacity-50" : ""
                              }`}
                            >
                              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm font-semibold text-slate-900 line-clamp-2">
                                      {sop.title}
                                    </CardTitle>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(sop);
                                        }}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSOPMutation.mutate(sop.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <p className="text-xs text-slate-600 line-clamp-3">
                                    {sop.purpose || "No description"}
                                  </p>
                                  {sop.files && sop.files.length > 0 && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                      <FileText className="w-3 h-3" />
                                      <span>{sop.files.length} file(s) attached</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {groupedSOPs[category].length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No SOPs
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {/* New/Edit SOP Dialog */}
        <Dialog open={showNewSOPDialog} onOpenChange={setShowNewSOPDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSOP ? "Edit SOP" : "Create New SOP"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newSOP.title}
                  onChange={(e) => setNewSOP({ ...newSOP, title: e.target.value })}
                  placeholder="SOP title"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={newSOP.category} onValueChange={(value) => setNewSOP({ ...newSOP, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose/Objective *</Label>
                <Textarea
                  id="purpose"
                  value={newSOP.purpose}
                  onChange={(e) => setNewSOP({ ...newSOP, purpose: e.target.value })}
                  placeholder="What is the goal of this procedure?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="scope">Scope</Label>
                <Textarea
                  id="scope"
                  value={newSOP.scope}
                  onChange={(e) => setNewSOP({ ...newSOP, scope: e.target.value })}
                  placeholder="When and where is this procedure used?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="materials">Required Materials/Tools</Label>
                <Textarea
                  id="materials"
                  value={newSOP.materials}
                  onChange={(e) => setNewSOP({ ...newSOP, materials: e.target.value })}
                  placeholder="List all materials and tools needed"
                  rows={2}
                />
              </div>

              <div>
                <Label className="mb-2">Step-by-Step Instructions</Label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {newSOP.steps.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-100 rounded-full text-sm font-semibold text-amber-700">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Textarea
                          value={step.instruction}
                          onChange={(e) => updateStep(index, e.target.value)}
                          placeholder={`Step ${index + 1} instruction`}
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      {newSOP.steps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 flex-shrink-0 h-8 w-8 p-0"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={addStep}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Step
                </Button>
              </div>

              <div>
                <Label htmlFor="safety">Safety Precautions</Label>
                <Textarea
                  id="safety"
                  value={newSOP.safety_precautions}
                  onChange={(e) => setNewSOP({ ...newSOP, safety_precautions: e.target.value })}
                  placeholder="Any safety warnings or precautions"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="quality">Quality Checkpoints</Label>
                <Textarea
                  id="quality"
                  value={newSOP.quality_checkpoints}
                  onChange={(e) => setNewSOP({ ...newSOP, quality_checkpoints: e.target.value })}
                  placeholder="Quality checks and acceptance criteria"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={newSOP.notes}
                  onChange={(e) => setNewSOP({ ...newSOP, notes: e.target.value })}
                  placeholder="Any additional information"
                  rows={2}
                />
              </div>

              <div>
                <Label>Attachments (Files, Videos, etc.)</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                    accept="*/*"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      {uploading ? "Uploading..." : "Click to upload or drag files"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Photos, videos, PDFs, etc.</p>
                  </label>
                </div>

                {newSOP.files && newSOP.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newSOP.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate"
                          >
                            {file.name}
                          </a>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 flex-shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewSOPDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSOP}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!newSOP.title.trim() || !newSOP.purpose.trim()}
              >
                {editingSOP ? "Update SOP" : "Create SOP"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}