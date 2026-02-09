import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Search, Upload, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EncoreDocs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "other",
    tags: "",
    project_id: ""
  });
  const [uploadSource, setUploadSource] = useState("local"); // "local" or "drive"
  const [driveFileId, setDriveFileId] = useState("");

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.name.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const selectedProject = projects.find(p => p.id === uploadForm.project_id);
      const tags = uploadForm.tags.split(",").map(t => t.trim()).filter(Boolean);
      
      await base44.entities.Document.create({
        name: uploadForm.name,
        description: uploadForm.description,
        file_url,
        file_type: file.name.split(".").pop(),
        category: uploadForm.category,
        project_id: uploadForm.project_id || null,
        project_name: selectedProject?.project_name || null,
        tags
      });

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUploadDialog(false);
      setUploadForm({
        name: "",
        description: "",
        category: "other",
        tags: "",
        project_id: ""
      });
      setDriveFileId("");
      toast.success("Document uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleDriveUpload = async () => {
    if (!uploadForm.name.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    if (!driveFileId.trim()) {
      toast.error("Please enter Google Drive file ID");
      return;
    }

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('getGoogleDriveFile', {
        file_id: driveFileId.trim()
      });

      const selectedProject = projects.find(p => p.id === uploadForm.project_id);
      const tags = uploadForm.tags.split(",").map(t => t.trim()).filter(Boolean);

      await base44.entities.Document.create({
        name: uploadForm.name,
        description: uploadForm.description,
        file_url: data.file_url,
        file_type: data.file_type,
        category: uploadForm.category,
        project_id: uploadForm.project_id || null,
        project_name: selectedProject?.project_name || null,
        tags
      });

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUploadDialog(false);
      setUploadForm({
        name: "",
        description: "",
        category: "other",
        tags: "",
        project_id: ""
      });
      setDriveFileId("");
      toast.success("Document uploaded from Google Drive!");
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Encore Docs</h1>
          <p className="text-slate-500 mt-1">Upload and manage project documents</p>
        </div>

        {/* Search, Filter and Upload */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="proposal">Proposals</SelectItem>
              <SelectItem value="specification">Specifications</SelectItem>
              <SelectItem value="drawing">Drawings</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-amber-600 hover:bg-amber-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(doc.file_url, "_blank")}
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={() => {
                        if (confirm("Delete this document?")) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base font-semibold text-slate-900 mb-2">
                  {doc.name}
                </CardTitle>
                {doc.description && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{doc.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {doc.category}
                    </Badge>
                    {doc.file_type && (
                      <Badge variant="outline" className="text-xs">
                        .{doc.file_type}
                      </Badge>
                    )}
                  </div>
                  {doc.project_name && (
                    <p className="text-xs text-slate-500">Project: {doc.project_name}</p>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 pt-2 border-t">
                    {format(new Date(doc.created_date), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No documents found</p>
              <Button onClick={() => setShowUploadDialog(true)} className="bg-amber-600 hover:bg-amber-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Document
              </Button>
            </div>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Name *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Contract for Smith Kitchen"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="specification">Specification</SelectItem>
                    <SelectItem value="drawing">Drawing</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project (Optional)</Label>
                <Select
                  value={uploadForm.project_id}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="e.g., urgent, pending review"
                />
              </div>
              <div>
                <Label>Upload Source</Label>
                <Select value={uploadSource} onValueChange={setUploadSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">From Computer</SelectItem>
                    <SelectItem value="drive">From Google Drive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {uploadSource === "local" && (
                <div>
                  <Label>File *</Label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    disabled={uploading}
                  />
                </div>
              )}

              {uploadSource === "drive" && (
                <div>
                  <Label>Google Drive File ID *</Label>
                  <Input
                    value={driveFileId}
                    onChange={(e) => setDriveFileId(e.target.value)}
                    placeholder="e.g., 1A2B3C4D5E6F7G8H9I0J"
                    disabled={uploading}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Right-click file in Google Drive → Share → Copy link → Extract ID from URL
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUploadDialog(false);
                    setUploadForm({
                      name: "",
                      description: "",
                      category: "other",
                      tags: "",
                      project_id: ""
                    });
                    setDriveFileId("");
                    setUploadSource("local");
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                {uploadSource === "drive" && (
                  <Button
                    onClick={handleGoogleDriveUpload}
                    disabled={uploading || !driveFileId.trim()}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {uploading ? "Uploading..." : "Upload from Drive"}
                  </Button>
                )}
              </div>
              {uploading && <p className="text-sm text-amber-600">Uploading...</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}