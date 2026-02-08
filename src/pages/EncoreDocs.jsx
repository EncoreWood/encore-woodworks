import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit } from "lucide-react";
import ProposalTemplateForm from "../components/proposals/ProposalTemplateForm";

export default function EncoreDocs() {
  const [editingTemplate, setEditingTemplate] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["proposalTemplates"],
    queryFn: () => base44.entities.ProposalTemplate.list(),
  });

  const template = templates[0] || null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
      setEditingTemplate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates"] });
      setEditingTemplate(false);
    },
  });

  const handleSave = (data) => {
    if (template) {
      updateMutation.mutate({ id: template.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600">Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Encore Docs</h1>
            <p className="text-slate-500 mt-1">Proposal template</p>
          </div>
          <Card className="p-12 text-center">
            <FileText className="w-20 h-20 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Template Found</h2>
            <p className="text-slate-500 mb-6">Create your proposal template to get started</p>
            <Button onClick={() => setEditingTemplate(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal Template
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Encore Docs</h1>
          <p className="text-slate-500 mt-1">Proposal template</p>
        </div>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{template.template_name}</h2>
              {template.cabinet_style && (
                <Badge variant="outline" className="mt-2">{template.cabinet_style}</Badge>
              )}
            </div>
            <Button onClick={() => setEditingTemplate(true)} className="bg-amber-600 hover:bg-amber-700">
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
          </div>

          <div className="space-y-6">
            {/* Specifications */}
            {(template.wood_species || template.door_style || template.handles || template.drawerbox || template.drawer_glides || template.hinges) && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Specifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {template.wood_species && <div><span className="text-slate-500">Wood Species:</span> {template.wood_species}</div>}
                  {template.door_style && <div><span className="text-slate-500">Door Style:</span> {template.door_style}</div>}
                  {template.handles && <div><span className="text-slate-500">Handles:</span> {template.handles}</div>}
                  {template.drawerbox && <div><span className="text-slate-500">Drawerbox:</span> {template.drawerbox}</div>}
                  {template.drawer_glides && <div><span className="text-slate-500">Drawer Glides:</span> {template.drawer_glides}</div>}
                  {template.hinges && <div><span className="text-slate-500">Hinges:</span> {template.hinges}</div>}
                </div>
              </div>
            )}

            {/* Rooms */}
            {template.rooms?.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Default Rooms ({template.rooms.length})</h3>
                <div className="space-y-2">
                  {template.rooms.map((room, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <div className="font-medium">{room.room_name}</div>
                        {room.finish && <div className="text-slate-500 text-xs">{room.finish}</div>}
                      </div>
                      {room.price > 0 && <div className="font-semibold">${room.price.toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            {template.options?.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Default Options ({template.options.length})</h3>
                <div className="space-y-2">
                  {template.options.map((option, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        {option.selected && <Badge className="bg-green-600">Selected</Badge>}
                        <span>{option.description}</span>
                      </div>
                      {option.price > 0 && <div className="font-semibold">${option.price.toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Terms */}
            {template.payment_terms && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Payment Terms</h3>
                <div className="p-4 bg-slate-50 rounded-lg text-sm whitespace-pre-line">
                  {template.payment_terms}
                </div>
              </div>
            )}

            {/* Notes */}
            {template.notes && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Notes</h3>
                <div className="p-4 bg-slate-50 rounded-lg text-sm whitespace-pre-line">
                  {template.notes}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Edit Template Dialog */}
        <Dialog open={editingTemplate} onOpenChange={setEditingTemplate}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{template ? 'Edit' : 'Create'} Proposal Template</DialogTitle>
            </DialogHeader>
            <ProposalTemplateForm
              template={template}
              onSave={handleSave}
              onCancel={() => setEditingTemplate(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}