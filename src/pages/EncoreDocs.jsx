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
import { FileText, Plus, Edit, Trash2, Copy, Search, Mail } from "lucide-react";
import ProposalTemplateForm from "../components/proposals/ProposalTemplateForm";
import { toast } from "sonner";

export default function EncoreDocs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [sendingTemplate, setSendingTemplate] = useState(null);
  const [emailForm, setEmailForm] = useState({ to_email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["proposalTemplates"],
    queryFn: () => base44.entities.ProposalTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
      setShowCreateForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (template) => {
      const { id, created_date, updated_date, created_by, ...data } = template;
      return base44.entities.ProposalTemplate.create({
        ...data,
        template_name: `${data.template_name} (Copy)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
    },
  });

  const handleCreateBlank = () => {
    setShowCreateForm(true);
  };

  const handleSendEmail = async () => {
    if (!emailForm.to_email) {
      toast.error("Please enter recipient email");
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('sendProposalEmail', {
        to_email: emailForm.to_email,
        template_id: sendingTemplate.id,
        subject: emailForm.subject,
        message: emailForm.message
      });
      toast.success("Email sent successfully!");
      setSendingTemplate(null);
      setEmailForm({ to_email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Failed to send email: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-amber-600" />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600"
                      onClick={() => {
                        setSendingTemplate(template);
                        setEmailForm({ 
                          to_email: "", 
                          subject: `Proposal Template: ${template.template_name}`, 
                          message: "" 
                        });
                      }}
                      title="Send via Email"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingTemplate(template)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => duplicateMutation.mutate(template)}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={() => deleteMutation.mutate(template.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base font-semibold text-slate-900 mb-3">
                  {template.template_name || "Untitled Template"}
                </CardTitle>
                <div className="space-y-2 text-xs text-slate-600">
                  {template.cabinet_style && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.cabinet_style}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span>Rooms: {template.rooms?.length || 0}</span>
                    <span>Options: {template.options?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTemplates.length === 0 && (
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
            <ProposalTemplateForm
              template={null}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <ProposalTemplateForm
              template={editingTemplate}
              onSave={(data) => updateMutation.mutate({ id: editingTemplate.id, data })}
              onCancel={() => setEditingTemplate(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Send Email Dialog */}
        <Dialog open={!!sendingTemplate} onOpenChange={() => setSendingTemplate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Template via Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient Email *</Label>
                <Input
                  type="email"
                  value={emailForm.to_email}
                  onChange={(e) => setEmailForm({ ...emailForm, to_email: e.target.value })}
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
              <div>
                <Label>Message (Optional)</Label>
                <Textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  rows={4}
                  placeholder="Add a personal message..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSendingTemplate(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}