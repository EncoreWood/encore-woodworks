import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DollarSign, Search, FileText, CheckCircle, AlertCircle, Clock, Edit } from "lucide-react";

export default function Invoicing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({
    estimated_budget: 0,
    deposit_paid: 0,
    actual_cost: 0
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingProject(null);
    },
  });

  const handleEdit = (project, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setEditForm({
      estimated_budget: project.estimated_budget || 0,
      deposit_paid: project.deposit_paid || 0,
      actual_cost: project.actual_cost || 0
    });
  };

  const handleSave = () => {
    updateProjectMutation.mutate({
      id: editingProject.id,
      data: editForm
    });
  };

  // Calculate invoicing status for each project
  const getInvoicingStatus = (project) => {
    const budget = project.estimated_budget || 0;
    const deposit = project.deposit_paid || 0;
    const actualCost = project.actual_cost || 0;
    const remaining = budget - deposit;

    if (project.status === "completed") {
      return actualCost <= deposit ? "paid" : "balance_due";
    } else if (deposit > 0) {
      return "deposit_received";
    } else {
      return "not_invoiced";
    }
  };

  // Group projects by invoicing status
  const groupedProjects = {
    not_invoiced: projects.filter(p => getInvoicingStatus(p) === "not_invoiced"),
    deposit_received: projects.filter(p => getInvoicingStatus(p) === "deposit_received"),
    balance_due: projects.filter(p => getInvoicingStatus(p) === "balance_due"),
    paid: projects.filter(p => getInvoicingStatus(p) === "paid"),
  };

  // Filter projects by search term
  const filterProjects = (projectList) => {
    if (!searchTerm) return projectList;
    return projectList.filter(p =>
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const statusConfig = {
    not_invoiced: {
      title: "Not Invoiced",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200"
    },
    deposit_received: {
      title: "Deposit Received",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    balance_due: {
      title: "Balance Due",
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200"
    },
    paid: {
      title: "Paid in Full",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200"
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600">Loading invoicing data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoicing</h1>
          <p className="text-slate-500 mt-1">Track project invoicing and payments</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search projects or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Invoicing Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(groupedProjects).map(([status, projectList]) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const filtered = filterProjects(projectList);

            return (
              <div key={status} className="flex flex-col">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bg} ${config.border} border mb-4`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <h2 className={`font-semibold ${config.color}`}>{config.title}</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {filtered.length}
                  </Badge>
                </div>

                <div className="space-y-3 flex-1">
                  {filtered.map((project) => {
                    const budget = project.estimated_budget || 0;
                    const deposit = project.deposit_paid || 0;
                    const actualCost = project.actual_cost || 0;
                    const remaining = budget - deposit;

                    return (
                      <div key={project.id} className="relative group">
                        <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base font-semibold text-slate-900">
                                    {project.project_name}
                                  </CardTitle>
                                  <p className="text-sm text-slate-500">{project.client_name}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => handleEdit(project, e)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Budget:</span>
                                  <span className="font-medium">${budget.toLocaleString()}</span>
                                </div>
                                {deposit > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Deposit:</span>
                                    <span className="font-medium text-green-600">${deposit.toLocaleString()}</span>
                                  </div>
                                )}
                                {status === "deposit_received" && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Remaining:</span>
                                    <span className="font-medium text-amber-600">${remaining.toLocaleString()}</span>
                                  </div>
                                )}
                                {status === "balance_due" && actualCost > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Balance Due:</span>
                                    <span className="font-medium text-red-600">${(actualCost - deposit).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="pt-2 border-t">
                                  <Badge variant="outline" className="text-xs">
                                    {project.status?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No projects
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Financial Details</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4 py-4">
                <div className="text-sm text-slate-600 mb-4">
                  <div className="font-semibold text-slate-900">{editingProject.project_name}</div>
                  <div>{editingProject.client_name}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Estimated Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={editForm.estimated_budget}
                    onChange={(e) => setEditForm({ ...editForm, estimated_budget: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Deposit Paid</Label>
                  <Input
                    id="deposit"
                    type="number"
                    value={editForm.deposit_paid}
                    onChange={(e) => setEditForm({ ...editForm, deposit_paid: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual">Actual Cost</Label>
                  <Input
                    id="actual"
                    type="number"
                    value={editForm.actual_cost}
                    onChange={(e) => setEditForm({ ...editForm, actual_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}