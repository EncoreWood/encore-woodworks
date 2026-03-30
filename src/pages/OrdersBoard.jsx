import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, X, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const orderColumns = [
  { id: "drawer_boxes", label: "Drawer Boxes" },
  { id: "fronts", label: "Fronts" },
  { id: "face_frame", label: "Face Frame" },
  { id: "panel_stock", label: "Panel Stock" },
  { id: "case", label: "Case" },
  { id: "internal_hardware", label: "Internal Hardware" },
  { id: "inserts", label: "Inserts" },
  { id: "external_hardware", label: "External Hardware" },
  { id: "glass", label: "Glass" }
];

const statusColors = {
  not_ordered: "bg-slate-100 text-slate-700",
  ordered: "bg-blue-100 text-blue-700",
  in_production: "bg-yellow-100 text-yellow-700",
  received: "bg-green-100 text-green-700",
  installed: "bg-purple-100 text-purple-700",
  not_applicable: "bg-gray-200 text-gray-500"
};

export default function OrdersBoard() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    status: "not_ordered",
    notes: "",
    ordered_date: "",
    expected_date: "",
    received_date: "",
    rooms: []
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const queryClient = useQueryClient();

  const { data: allProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list()
  });
  const projects = allProjects.filter(p => !p.archived);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["projectOrders"],
    queryFn: () => base44.entities.ProjectOrder.list()
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectOrders"] });
      setEditDialog(false);
      setSelectedCell(null);
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectOrders"] });
      setEditDialog(false);
      setSelectedCell(null);
    }
  });

  const getOrder = (projectId, orderType) => {
    return orders.find(
      (o) => o.project_id === projectId && o.order_type === orderType
    );
  };

  const handleCellClick = (project, orderType) => {
    const existingOrder = getOrder(project.id, orderType);
    setSelectedCell({ project, orderType, order: existingOrder });
    
    if (existingOrder) {
      setFormData({
        status: existingOrder.status || "not_ordered",
        notes: existingOrder.notes || "",
        ordered_date: existingOrder.ordered_date || "",
        expected_date: existingOrder.expected_date || "",
        received_date: existingOrder.received_date || "",
        rooms: existingOrder.rooms || []
      });
    } else {
      setFormData({
        status: "not_ordered",
        notes: "",
        ordered_date: "",
        expected_date: "",
        received_date: "",
        rooms: []
      });
    }
    
    setEditDialog(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCell?.order) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const updatedFiles = [
        ...(selectedCell.order.files || []),
        { name: file.name, url: file_url }
      ];

      await updateOrderMutation.mutateAsync({
        id: selectedCell.order.id,
        data: { ...selectedCell.order, files: updatedFiles }
      });

      setSelectedCell({
        ...selectedCell,
        order: { ...selectedCell.order, files: updatedFiles }
      });
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async (fileIndex) => {
    if (!selectedCell?.order) return;

    const updatedFiles = selectedCell.order.files.filter((_, i) => i !== fileIndex);
    
    await updateOrderMutation.mutateAsync({
      id: selectedCell.order.id,
      data: { ...selectedCell.order, files: updatedFiles }
    });

    setSelectedCell({
      ...selectedCell,
      order: { ...selectedCell.order, files: updatedFiles }
    });
  };

  const toggleRoom = (roomIndex, roomName) => {
    const existingRoomIndex = formData.rooms.findIndex(r => r.room_index === roomIndex);
    
    if (existingRoomIndex > -1) {
      setFormData({
        ...formData,
        rooms: formData.rooms.filter((_, i) => i !== existingRoomIndex)
      });
    } else {
      setFormData({
        ...formData,
        rooms: [...formData.rooms, { room_name: roomName, room_index: roomIndex, notes: "" }]
      });
    }
  };

  const updateRoomNotes = (roomIndex, notes) => {
    setFormData({
      ...formData,
      rooms: formData.rooms.map(r => 
        r.room_index === roomIndex ? { ...r, notes } : r
      )
    });
  };

  const handleSave = async () => {
    if (!selectedCell) return;

    const data = {
      project_id: selectedCell.project.id,
      project_name: selectedCell.project.project_name,
      order_type: selectedCell.orderType,
      ...formData,
      files: selectedCell.order?.files || []
    };

    if (selectedCell.order) {
      await updateOrderMutation.mutateAsync({
        id: selectedCell.order.id,
        data: { ...selectedCell.order, ...formData }
      });
    } else {
      await createOrderMutation.mutateAsync(data);
    }
  };

  if (loadingProjects || loadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading orders board...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Orders Board</h1>
            <p className="text-slate-600 mt-1">Track project orders and materials</p>
          </div>
        </div>

        {/* Desktop Table */}
        <Card className="hidden sm:block bg-white shadow-lg overflow-x-auto">
          <div className="min-w-[1400px]">
            <div className="grid grid-cols-[250px_repeat(9,_1fr)] border-b-2 border-slate-300 bg-slate-100">
              <div className="p-4 font-bold text-slate-900 border-r-2 border-slate-300">Project</div>
              {orderColumns.map((col) => (
                <div key={col.id} className="p-4 font-bold text-slate-900 text-center border-r border-slate-200 text-sm">{col.label}</div>
              ))}
            </div>
            {projects.map((project) => (
              <div key={project.id} className="grid grid-cols-[250px_repeat(9,_1fr)] border-b border-slate-200 hover:bg-slate-50">
                <div className="p-4 font-medium text-slate-900 border-r-2 border-slate-200" style={project.card_color ? { borderLeft: `4px solid ${project.card_color}` } : {}}>
                  <div className="flex items-center gap-2">
                    {project.card_color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.card_color }} />}
                    <span className="font-semibold">{project.project_name}</span>
                    <Link to={createPageUrl("Kanban") + `?project=${project.id}`} className="text-slate-400 hover:text-amber-600 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></Link>
                  </div>
                  <div className="text-xs text-slate-500">{project.client_name}</div>
                </div>
                {orderColumns.map((col) => {
                  const order = getOrder(project.id, col.id);
                  return (
                    <button key={col.id} onClick={() => handleCellClick(project, col.id)} className="p-3 border-r border-slate-200 hover:bg-amber-50 transition-colors text-left">
                      {order ? (
                        <div className="space-y-1">
                          <div className={`text-xs px-2 py-1 rounded font-medium inline-block ${statusColors[order.status]}`}>{order.status.replace("_", " ").toUpperCase()}</div>
                          {order.rooms?.length > 0 && <div className="text-xs text-slate-600">{order.rooms.length} room{order.rooms.length > 1 ? "s" : ""}</div>}
                          {order.notes && <div className="text-xs text-slate-600 line-clamp-2">{order.notes}</div>}
                          {order.files?.length > 0 && <div className="text-xs text-blue-600 flex items-center gap-1"><FileText className="w-3 h-3" />{order.files.length} file{order.files.length > 1 ? "s" : ""}</div>}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Click to add</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* Mobile Card Layout */}
        <div className="sm:hidden space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="bg-white shadow-sm overflow-hidden" style={project.card_color ? { borderLeft: `4px solid ${project.card_color}` } : {}}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{project.project_name}</div>
                  <div className="text-sm text-slate-500">{project.client_name}</div>
                </div>
                <Link to={createPageUrl("Kanban") + `?project=${project.id}`} className="text-slate-400 hover:text-amber-600">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {orderColumns.map((col) => {
                  const order = getOrder(project.id, col.id);
                  if (!order) return null;
                  return (
                    <button key={col.id} onClick={() => handleCellClick(project, col.id)} className="w-full flex items-start justify-between p-3 hover:bg-amber-50 text-left">
                      <span className="text-sm font-medium text-slate-700">{col.label}</span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${statusColors[order.status]}`}>{order.status.replace(/_/g, " ")}</span>
                    </button>
                  );
                })}
                <button onClick={() => handleCellClick(project, orderColumns[0].id)} className="w-full p-3 text-sm text-amber-600 hover:bg-amber-50 text-left font-medium">
                  + Add / Edit Orders
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCell?.project?.project_name} -{" "}
                {orderColumns.find((c) => c.id === selectedCell?.orderType)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_ordered">Not Ordered</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="installed">Installed</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Ordered Date</Label>
                  <Input
                    type="date"
                    value={formData.ordered_date}
                    onChange={(e) =>
                      setFormData({ ...formData, ordered_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Expected Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={formData.received_date}
                    onChange={(e) =>
                      setFormData({ ...formData, received_date: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Rooms */}
              {selectedCell?.project?.rooms && selectedCell.project.rooms.length > 0 && (
                <div>
                  <Label>Rooms</Label>
                  <div className="mt-2 space-y-3 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {selectedCell.project.rooms.map((room, index) => {
                      const isSelected = formData.rooms.some(r => r.room_index === index);
                      const roomData = formData.rooms.find(r => r.room_index === index);
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRoom(index, room.room_name)}
                              id={`room-${index}`}
                            />
                            <label 
                              htmlFor={`room-${index}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              {room.room_name || `Room ${index + 1}`}
                            </label>
                          </div>
                          {isSelected && (
                            <Textarea
                              value={roomData?.notes || ""}
                              onChange={(e) => updateRoomNotes(index, e.target.value)}
                              placeholder={`Notes for ${room.room_name || `Room ${index + 1}`}...`}
                              rows={2}
                              className="ml-6"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label>General Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add general notes about this order..."
                  rows={3}
                />
              </div>

              {/* Files */}
              <div>
                <Label>Files</Label>
                <div className="mt-2 space-y-2">
                  {selectedCell?.order?.files?.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {file.name}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <label className="block">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFile || !selectedCell?.order}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploadingFile || !selectedCell?.order}
                      onClick={(e) => e.currentTarget.previousElementSibling.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFile ? "Uploading..." : "Upload File"}
                    </Button>
                  </label>
                  {!selectedCell?.order && (
                    <p className="text-xs text-slate-500">
                      Save this order first before uploading files
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}