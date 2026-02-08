import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Copy, Eye, Search } from "lucide-react";
import ProposalForm from "../components/proposals/ProposalForm";
import ProposalViewer from "../components/proposals/ProposalViewer";

export default function EncoreDocs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(null);

  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setShowCreateForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setEditingProposal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Proposal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (proposal) => {
      const { id, created_date, updated_date, created_by, ...data } = proposal;
      return base44.entities.Proposal.create({
        ...data,
        job_name: `${data.job_name} (Copy)`,
        project_name: `${data.project_name} (Copy)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const handleCreateBlank = () => {
    setShowCreateForm(true);
  };

  const filteredProposals = proposals.filter(p =>
    p.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Encore Docs</h1>
          <p className="text-slate-500 mt-1">Manage proposal templates and documents</p>
        </div>

        {/* Search and Create */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleCreateBlank} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setViewingProposal(proposal)}
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingProposal(proposal)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => duplicateMutation.mutate(proposal)}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={() => deleteMutation.mutate(proposal.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base font-semibold text-slate-900 mb-1">
                  {proposal.job_name || "Untitled Template"}
                </CardTitle>
                <p className="text-sm text-slate-500 mb-3">{proposal.project_name}</p>
                <div className="space-y-2 text-xs text-slate-600">
                  {proposal.cabinet_style && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {proposal.cabinet_style}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span>Rooms: {proposal.rooms?.length || 0}</span>
                    <span>Options: {proposal.options?.length || 0}</span>
                  </div>
                  {proposal.overall_total > 0 && (
                    <div className="font-semibold text-amber-700">
                      ${proposal.overall_total.toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredProposals.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No templates found</p>
              <Button onClick={handleCreateBlank} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          )}
        </div>

        {/* Create Template Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <ProposalForm
              proposal={null}
              project={{ project_name: "Template", id: "template" }}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={!!editingProposal} onOpenChange={() => setEditingProposal(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <ProposalForm
              proposal={editingProposal}
              project={{ project_name: editingProposal?.project_name || "", id: editingProposal?.project_id || "" }}
              onSave={(data) => updateMutation.mutate({ id: editingProposal.id, data })}
              onCancel={() => setEditingProposal(null)}
            />
          </DialogContent>
        </Dialog>

        {/* View Template Dialog */}
        <Dialog open={!!viewingProposal} onOpenChange={() => setViewingProposal(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Template</DialogTitle>
            </DialogHeader>
            <ProposalViewer proposal={viewingProposal} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}