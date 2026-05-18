import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DollarSign, Search, FileText, CheckCircle, AlertCircle, Clock, Edit, Eye, ExternalLink, Mail, Edit3, Download, PlusCircle, LayoutDashboard, Calendar, CalendarClock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import ProposalViewer from "../components/proposals/ProposalViewer";
import ProposalForm from "../components/proposals/ProposalForm";
import { toast } from "sonner";
import InvoicingCalendar from "../components/invoicing/InvoicingCalendar";
import CustomInvoicesEditor, { getEffectiveInvoices, calcCollected } from "../components/invoicing/CustomInvoicesEditor";

function FinEditTile({ label, value, onSave, colorClass = "text-slate-700", bgClass = "bg-slate-50" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const start = () => { setDraft(value || ""); setEditing(true); };
  const save = () => { onSave(parseFloat(draft) || 0); setEditing(false); };
  const cancel = () => setEditing(false);
  if (editing) {
    return (
      <div className={`${bgClass} rounded-lg p-2 text-center`}>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <div className="flex items-center gap-1 justify-center">
          <span className="text-xs text-slate-400">$</span>
          <input type="number" className="w-24 text-center text-sm font-bold border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} autoFocus />
        </div>
        <div className="flex gap-1 justify-center mt-1">
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
          <button onClick={cancel} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className={`${bgClass} rounded-lg p-3 text-center group cursor-pointer relative`} onClick={start}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>${(value || 0).toLocaleString()}</p>
      <Pencil className="w-2.5 h-2.5 text-slate-400 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function Invoicing() {
  const [activeTab, setActiveTab] = useState("board");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [sendingProposal, setSendingProposal] = useState(null);
  const [emailForm, setEmailForm] = useState({ to_email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [editForm, setEditForm] = useState({
    estimated_budget: 0,
    total_amount: 0,
    deposit_paid: 0,
    actual_cost: 0
  });
  const [changeOrderForm, setChangeOrderForm] = useState({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [editingChangeOrderIdx, setEditingChangeOrderIdx] = useState(null);
  const [addingPayment, setAddingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", notes: "" });
  const [viewingPayments, setViewingPayments] = useState(null);


  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list(),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const previous = queryClient.getQueryData(["projects"]);
      queryClient.setQueryData(["projects"], old => old?.map(p => p.id === id ? { ...p, ...data } : p) || []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["projects"], context.previous);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (!vars._skipClose) setEditingProject(null);
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setEditingProposal(null);
      toast.success("Proposal updated successfully!");
    },
  });

  const handleEdit = (project, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setEditForm({
      estimated_budget: project.estimated_budget || 0,
      total_amount: project.total_amount || 0,
      deposit_paid: project.deposit_paid || 0,
      actual_cost: project.actual_cost || 0
    });
    setChangeOrderForm({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    setEditingChangeOrderIdx(null);
  };

  const handleSave = () => {
    updateProjectMutation.mutate({
      id: editingProject.id,
      data: { estimated_budget: editForm.estimated_budget, total_amount: editForm.total_amount, deposit_paid: editForm.deposit_paid, actual_cost: editForm.actual_cost }
    });
  };

  const handleViewProposal = (project, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const proposal = proposals.find(p => p.project_id === project.id);
    setViewingProposal(proposal);
  };

  const handleCardClick = (project, e) => {
    e.preventDefault();
    setViewingDetails(project);
  };

  const handleSendEmail = async () => {
    if (!emailForm.to_email) {
      toast.error("Please enter recipient email");
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('sendProposal', {
        to_email: emailForm.to_email,
        proposal_id: sendingProposal.id,
        subject: emailForm.subject,
        message: emailForm.message
      });
      toast.success("Proposal sent successfully!");
      setSendingProposal(null);
      setEmailForm({ to_email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Failed to send proposal: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = async (proposal) => {
    try {
      toast.loading("Generating PDF...");
      const result = await base44.functions.invoke('generateProposalPDF', { proposal_id: proposal.id });
      const link = document.createElement('a');
      link.href = result.data.file_url;
      link.download = result.data.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const project = projects.find(p => p.id === draggableId);
    if (!project) return;

    const newInvoiceStatus = destination.droppableId;
    let newProjectStatus = project.status;
    
    if (newInvoiceStatus === "deposit_received" && (project.status === "inquiry" || project.status === "side_projects")) {
      newProjectStatus = "approved";
    } else if (newInvoiceStatus === "ninety_percent_received" && project.status === "approved") {
      newProjectStatus = "in_production";
    } else if (newInvoiceStatus === "paid_in_full" && !["completed"].includes(project.status)) {
      newProjectStatus = "completed";
    }

    updateProjectMutation.mutate({
      id: project.id,
      data: { 
        invoice_status: newInvoiceStatus,
        status: newProjectStatus
      }
    });
  };

  const getInvoicingStatus = (project) => {
    return project.invoice_status || "deposit_invoice_sent";
  };

  // Only show projects that are approved or further along
  const invoicingStatuses = ["approved", "in_design", "in_production", "ready_for_install", "installing", "completed"];
  const invoicingProjects = projects.filter(p => invoicingStatuses.includes(p.status));

  // Group projects by invoicing status
  const groupedProjects = {
    deposit_invoice_sent: invoicingProjects.filter(p => getInvoicingStatus(p) === "deposit_invoice_sent"),
    deposit_received: invoicingProjects.filter(p => getInvoicingStatus(p) === "deposit_received"),
    ninety_percent_sent: invoicingProjects.filter(p => getInvoicingStatus(p) === "ninety_percent_sent"),
    ninety_percent_received: invoicingProjects.filter(p => getInvoicingStatus(p) === "ninety_percent_received"),
    final_sent: invoicingProjects.filter(p => getInvoicingStatus(p) === "final_sent"),
    paid_in_full: invoicingProjects.filter(p => getInvoicingStatus(p) === "paid_in_full"),
  };

  // Filter projects by search term
  const filterProjects = (projectList) => {
    if (!searchTerm) return projectList;
    return projectList.filter(p =>
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Which project field holds the invoice amount for each stage
  const stageAmountKey = {
    deposit_invoice_sent: "deposit_invoice_amount",
    deposit_received: "deposit_invoice_amount",
    ninety_percent_sent: "ninety_percent_invoice_amount",
    ninety_percent_received: "ninety_percent_invoice_amount",
    final_sent: "final_invoice_amount",
    paid_in_full: "final_invoice_amount",
  };

  const stageExpectedDateKey = {
    deposit_invoice_sent: "deposit_expected_date",
    deposit_received: "ninety_percent_expected_date",
    ninety_percent_sent: "ninety_percent_expected_date",
    ninety_percent_received: "final_expected_date",
    final_sent: "final_expected_date",
    paid_in_full: null,
  };

  const getStageTotal = (status, projectList) => {
    const key = stageAmountKey[status];
    const total = projectList.reduce((sum, p) => sum + (p[key] || p.estimated_budget || 0), 0);
    return total;
  };

  const statusConfig = {
    deposit_invoice_sent: {
      title: "Deposit Invoice Sent",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    deposit_received: {
      title: "Deposit Received",
      icon: CheckCircle,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-200"
    },
    ninety_percent_sent: {
      title: "90% Sent",
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200"
    },
    ninety_percent_received: {
      title: "90% Received",
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200"
    },
    final_sent: {
      title: "Final Sent",
      icon: CheckCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200"
    },
    paid_in_full: {
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
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoicing</h1>
            <p className="text-slate-500 mt-1">Track project invoicing and payments</p>
          </div>
          {/* Tabs */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab("board")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "board" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "calendar" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Calendar className="w-4 h-4" /> Revenue Calendar
            </button>
          </div>
        </div>

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <InvoicingCalendar projects={invoicingProjects} />
        )}

        {/* Board Tab */}
        {activeTab === "board" && <>
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
         <DragDropContext onDragEnd={handleDragEnd}>
           <div className="grid grid-cols-6 gap-3">
             {Object.entries(groupedProjects).map(([status, projectList]) => {
               const config = statusConfig[status];
               const Icon = config.icon;
               const filtered = filterProjects(projectList);

               return (
                 <Droppable droppableId={status} key={status}>
                   {(provided, snapshot) => (
                     <div
                       ref={provided.innerRef}
                       {...provided.droppableProps}
                       className={`flex flex-col rounded-lg transition-colors ${
                         snapshot.isDraggingOver ? 'bg-slate-100' : ''
                       }`}
                     >
                       <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bg} ${config.border} border mb-4`}>
                         <Icon className={`w-5 h-5 ${config.color}`} />
                         <div className="flex flex-col flex-1 min-w-0">
                           <h2 className={`font-semibold ${config.color} leading-tight`}>{config.title}</h2>
                           {filtered.length > 0 && (
                             <span className="text-xs font-bold text-slate-700 mt-0.5">
                               ${getStageTotal(status, filtered).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                             </span>
                           )}
                         </div>
                         <Badge variant="secondary" className="ml-auto flex-shrink-0">
                           {filtered.length}
                         </Badge>
                       </div>

                       <div className="space-y-3 flex-1">
                         {filtered.map((project, index) => {
                           const budget = project.estimated_budget || 0;
                                    const actualCost = project.actual_cost || 0;
                                    const collected = calcCollected(getEffectiveInvoices(project));
                                    const remaining = budget - collected;
                                    const hasProposal = proposals.some(p => p.project_id === project.id);
                                    const expDateKey = stageExpectedDateKey[status];
                                    const expDate = expDateKey ? project[expDateKey] : null;

                           return (
                             <Draggable draggableId={project.id} index={index} key={project.id}>
                               {(provided, snapshot) => (
                                 <div
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                   className={`relative group transition-all ${
                                     snapshot.isDragging ? 'opacity-50' : ''
                                   }`}
                                 >
                        <Card 
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={(e) => handleCardClick(project, e)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base font-semibold text-slate-900">
                                  {project.project_name}
                                </CardTitle>
                                <p className="text-sm text-slate-500">{project.client_name}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasProposal && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => handleViewProposal(project, e)}
                                      title="View Proposal"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-amber-600"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const proposal = proposals.find(p => p.project_id === project.id);
                                        setEditingProposal(proposal);
                                      }}
                                      title="Edit Proposal"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-blue-600"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const proposal = proposals.find(p => p.project_id === project.id);
                                        setSendingProposal(proposal);
                                        setEmailForm({ 
                                          to_email: project.client_email || "", 
                                          subject: `Proposal: ${proposal.job_name || project.project_name}`, 
                                          message: "" 
                                        });
                                      }}
                                      title="Send via Email"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                {(project.payments?.length > 0) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-500"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingPayments(project); }}
                                    title="View Payment History"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-green-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setAddingPayment(project);
                                    setPaymentForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
                                  }}
                                  title="Add Payment"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => handleEdit(project, e)}
                                  title="Edit Financial Details"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                </div>
                                </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-2 text-sm">
                                    {(() => {
                                      const coTotal = (project.change_orders || []).reduce((s, co) => s + (co.amount || 0), 0);
                                      const currentTotal = (project.base_amount || project.total_amount || budget) + coTotal;
                                      return (<>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600 font-medium">Current Total:</span>
                                          <span className="font-bold text-slate-900">${currentTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Collected:</span>
                                          <span className="font-medium text-green-600">${collected.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-600">Remaining:</span>
                                          <span className="font-medium text-amber-600">${(currentTotal - collected).toLocaleString()}</span>
                                        </div>
                                      </>);
                                    })()}
                                    {expDate && (() => {
                                     const expStageLabel = expDateKey === "deposit_expected_date" ? "Deposit" : expDateKey === "ninety_percent_expected_date" ? "90%" : "Final";
                                     const [y, m, d] = expDate.split("-").map(Number);
                                      return (
                                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                                          <CalendarClock className="w-3 h-3 flex-shrink-0" />
                                          <span>{expStageLabel} exp: {format(new Date(y, m - 1, d), "MMM d, yyyy")}</span>
                                        </div>
                                      );
                                    })()}
                                    <div className="pt-2 border-t">
                                      <Badge variant="outline" className="text-xs">
                                        {project.status?.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                        </Card>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}

                        {filtered.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-sm">
                            No projects
                          </div>
                        )}
                        {provided.placeholder}
                        </div>
                        </div>
                        )}
                        </Droppable>
                        );
                        })}
                        </div>
                        </DragDropContext>
                        </>}

                        {/* Project Details Dialog */}
        <Dialog open={!!viewingDetails} onOpenChange={() => setViewingDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewingDetails?.project_name}</span>
                <Link to={createPageUrl(`ProjectDetails?id=${viewingDetails?.id}`)}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Project
                  </Button>
                </Link>
              </DialogTitle>
            </DialogHeader>
            {viewingDetails && (() => {
              const proposal = proposals.find(p => p.project_id === viewingDetails.id);

              const saveCustomInvoices = (customInvoices) => {
                updateProjectMutation.mutate({ id: viewingDetails.id, data: { custom_invoices: customInvoices }, _skipClose: true });
                setViewingDetails(prev => ({ ...prev, custom_invoices: customInvoices }));
              };

              const detailsCOs = viewingDetails.change_orders || [];
              const detailsCOsTotal = detailsCOs.reduce((s, co) => s + (co.amount || 0), 0);

              const [detailsCOForm, setDetailsCOForm] = [changeOrderForm, setChangeOrderForm];

              const addDetailsCO = () => {
                if (!detailsCOForm.description || !detailsCOForm.amount) return;
                const newCO = { id: Date.now().toString(), description: detailsCOForm.description, amount: parseFloat(detailsCOForm.amount) || 0, date: detailsCOForm.date };
                const updatedCOs = [...detailsCOs, newCO];
                updateProjectMutation.mutate({ id: viewingDetails.id, data: { change_orders: updatedCOs }, _skipClose: true });
                setViewingDetails(prev => ({ ...prev, change_orders: updatedCOs }));
                setChangeOrderForm({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
              };

              const removeDetailsCO = (idx) => {
                const updatedCOs = detailsCOs.filter((_, i) => i !== idx);
                updateProjectMutation.mutate({ id: viewingDetails.id, data: { change_orders: updatedCOs }, _skipClose: true });
                setViewingDetails(prev => ({ ...prev, change_orders: updatedCOs }));
              };

              const saveTotalAmount = (val) => {
                updateProjectMutation.mutate({ id: viewingDetails.id, data: { total_amount: val }, _skipClose: true });
                setViewingDetails(prev => ({ ...prev, total_amount: val }));
              };

              // Computed financials
              const estimated = viewingDetails.estimated_budget || 0;
              const baseTotal = viewingDetails.total_amount || estimated;
              const currentTotal = baseTotal + detailsCOsTotal;
              const invoicesForCalc = getEffectiveInvoices(viewingDetails);
              const collected = calcCollected(invoicesForCalc);
              const remaining = currentTotal - collected;

              return (
                <div className="space-y-6 py-4">
                  {/* Financials Card — matches ProjectDetails */}
                  <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-500" /> Financials
                    </h3>

                    {/* Summary tiles */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {/* Estimated — editable */}
                      <FinEditTile
                        label="Estimated"
                        value={estimated}
                        onSave={(v) => { saveTotalAmount(v); updateProjectMutation.mutate({ id: viewingDetails.id, data: { estimated_budget: v }, _skipClose: true }); setViewingDetails(prev => ({ ...prev, estimated_budget: v })); }}
                        colorClass="text-slate-700"
                        bgClass="bg-slate-50"
                      />
                      {/* Current Total base — editable */}
                      <FinEditTile
                        label="Current Total (Base)"
                        value={baseTotal}
                        onSave={saveTotalAmount}
                        colorClass="text-blue-800"
                        bgClass="bg-blue-50"
                      />
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-emerald-600 mb-1">Collected</p>
                        <p className="text-sm font-bold text-emerald-700">${collected.toLocaleString()}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                        <p className="text-xs text-slate-500 mb-1">Remaining</p>
                        <p className={`text-sm font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-500"}`}>${remaining.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Change Orders */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-700">
                          Change Orders
                          {detailsCOsTotal > 0 && <span className="ml-2 text-blue-600">+${detailsCOsTotal.toLocaleString()}</span>}
                        </p>
                      </div>
                      {detailsCOs.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {detailsCOs.map((co, idx) => (
                            <div key={co.id || idx} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-sm group">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-slate-800">{co.description}</span>
                                {co.date && <span className="text-xs text-slate-400 ml-2">{co.date}</span>}
                              </div>
                              <span className="font-semibold text-blue-700 mr-2">+${(co.amount || 0).toLocaleString()}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => removeDetailsCO(idx)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add CO form */}
                      <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50">
                        <Input placeholder="Description" value={detailsCOForm.description} onChange={(e) => setDetailsCOForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm" />
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <Input type="number" className="pl-5 h-8 text-sm" placeholder="Amount" value={detailsCOForm.amount} onChange={(e) => setDetailsCOForm(f => ({ ...f, amount: e.target.value }))} />
                          </div>
                          <Input type="date" className="w-36 h-8 text-sm" value={detailsCOForm.date} onChange={(e) => setDetailsCOForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 h-8" disabled={!detailsCOForm.description || !detailsCOForm.amount} onClick={addDetailsCO}>
                          <PlusCircle className="w-4 h-4 mr-2" /> Add Change Order
                        </Button>
                      </div>
                    </div>

                    {/* Invoices */}
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Invoices</p>
                      <CustomInvoicesEditor
                        key={viewingDetails.id}
                        project={viewingDetails}
                        onSave={saveCustomInvoices}
                        hideSummary
                      />
                    </div>
                  </Card>

                  {proposal ? (
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Proposal</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setViewingProposal(proposal);
                            setViewingDetails(null);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Proposal
                        </Button>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          {proposal.cabinet_style && (
                            <div>
                              <span className="text-slate-500">Cabinet Style:</span>
                              <div className="font-medium">{proposal.cabinet_style}</div>
                            </div>
                          )}
                          {proposal.wood_species && (
                            <div>
                              <span className="text-slate-500">Wood Species:</span>
                              <div className="font-medium">{proposal.wood_species}</div>
                            </div>
                          )}
                          {proposal.door_style && (
                            <div>
                              <span className="text-slate-500">Door Style:</span>
                              <div className="font-medium">{proposal.door_style}</div>
                            </div>
                          )}
                        </div>
                        {proposal.rooms && proposal.rooms.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="font-medium text-slate-700 mb-2">Rooms: {proposal.rooms.length}</div>
                            <div className="space-y-1">
                              {proposal.rooms.slice(0, 3).map((room, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span>{room.room_name}</span>
                                  <span className="font-medium">${room.price?.toLocaleString()}</span>
                                </div>
                              ))}
                              {proposal.rooms.length > 3 && (
                                <div className="text-xs text-slate-500">+ {proposal.rooms.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6">
                      <div className="text-center py-6">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 mb-4">No proposal created yet</p>
                        <Link to={createPageUrl(`ProjectDetails?id=${viewingDetails.id}`)}>
                          <Button className="bg-amber-600 hover:bg-amber-700">
                            Create Proposal
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  )}

                  <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Client Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>
                        <div className="font-medium">{viewingDetails.client_name}</div>
                      </div>
                      {viewingDetails.client_email && (
                        <div>
                          <span className="text-slate-500">Email:</span>
                          <div className="font-medium">{viewingDetails.client_email}</div>
                        </div>
                      )}
                      {viewingDetails.client_phone && (
                        <div>
                          <span className="text-slate-500">Phone:</span>
                          <div className="font-medium">{viewingDetails.client_phone}</div>
                        </div>
                      )}
                      {viewingDetails.address && (
                        <div>
                          <span className="text-slate-500">Address:</span>
                          <div className="font-medium">{viewingDetails.address}</div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* View Proposal Dialog */}
        <Dialog open={!!viewingProposal} onOpenChange={() => setViewingProposal(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Proposal</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadPDF(viewingProposal)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingProposal(viewingProposal);
                      setViewingProposal(null);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSendingProposal(viewingProposal);
                      const project = projects.find(p => p.id === viewingProposal.project_id);
                      setEmailForm({ 
                        to_email: project?.client_email || "", 
                        subject: `Proposal: ${viewingProposal.job_name || viewingProposal.project_name}`, 
                        message: "" 
                      });
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ProposalViewer proposal={viewingProposal} />
          </DialogContent>
        </Dialog>

        {/* Edit Proposal Dialog */}
        <Dialog open={!!editingProposal} onOpenChange={() => setEditingProposal(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Proposal</DialogTitle>
            </DialogHeader>
            <ProposalForm
              proposal={editingProposal}
              project={projects.find(p => p.id === editingProposal?.project_id)}
              onSave={(data) => updateProposalMutation.mutate({ id: editingProposal.id, data })}
              onCancel={() => setEditingProposal(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Send Email Dialog */}
        <Dialog open={!!sendingProposal} onOpenChange={() => setSendingProposal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Proposal via Email</DialogTitle>
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
                <Button variant="outline" onClick={() => setSendingProposal(null)}>
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

        {/* Payment History Dialog */}
        <Dialog open={!!viewingPayments} onOpenChange={() => setViewingPayments(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment History — {viewingPayments?.project_name}</DialogTitle>
            </DialogHeader>
            {viewingPayments && (
              <div className="space-y-3 py-2">
                {(viewingPayments.payments || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No payments recorded yet.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(viewingPayments.payments || []).map((p, i) => (
                        <div key={i} className="flex items-start justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                          <div>
                            <span className="font-semibold text-green-700">${parseFloat(p.amount).toLocaleString()}</span>
                            {p.date && <span className="ml-2 text-xs text-slate-500">{p.date}</span>}
                            {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            onClick={() => {
                              const updatedPayments = (viewingPayments.payments || []).filter((_, idx) => idx !== i);
                              const newDeposit = updatedPayments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0);
                              updateProjectMutation.mutate({ id: viewingPayments.id, data: { payments: updatedPayments, deposit_paid: newDeposit } });
                              setViewingPayments(prev => ({ ...prev, payments: updatedPayments, deposit_paid: newDeposit }));
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                      <span>Total Paid:</span>
                      <span className="text-green-700">${(viewingPayments.deposit_paid || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setViewingPayments(null);
                    setAddingPayment(viewingPayments);
                    setPaymentForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
                  }}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Payment Dialog */}
        <Dialog open={!!addingPayment} onOpenChange={() => setAddingPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
            </DialogHeader>
            {addingPayment && (
              <div className="space-y-4 py-2">
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">{addingPayment.project_name}</div>
                  <div>{addingPayment.client_name}</div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span>Total paid so far:</span>
                    <span className="font-semibold text-green-600">${(addingPayment.deposit_paid || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      className="pl-9"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Check #1234, wire transfer..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                {paymentForm.amount && (
                  <p className="text-xs text-slate-500">
                    New total: <span className="font-semibold text-green-600">${((addingPayment.deposit_paid || 0) + parseFloat(paymentForm.amount || 0)).toLocaleString()}</span>
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingPayment(null)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                onClick={() => {
                  const newPayment = { amount: parseFloat(paymentForm.amount), date: paymentForm.date, notes: paymentForm.notes };
                  const updatedPayments = [...(addingPayment.payments || []), newPayment];
                  const newDeposit = (addingPayment.deposit_paid || 0) + parseFloat(paymentForm.amount);
                  updateProjectMutation.mutate({ id: addingPayment.id, data: { payments: updatedPayments, deposit_paid: newDeposit } });
                  setAddingPayment(null);
                  setPaymentForm({ amount: "", date: "", notes: "" });
                  toast.success(`Payment of $${parseFloat(paymentForm.amount).toLocaleString()} added!`);
                }}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Financial Details</DialogTitle>
            </DialogHeader>
            {editingProject && (() => {
              const currentChangeOrders = editingProject.change_orders || [];
              const changeOrdersTotal = currentChangeOrders.reduce((s, co) => s + (co.amount || 0), 0);
              const computedTotal = editForm.total_amount + changeOrdersTotal;

              const addChangeOrder = () => {
                if (!changeOrderForm.description || !changeOrderForm.amount) return;
                const newCO = { id: Date.now().toString(), description: changeOrderForm.description, amount: parseFloat(changeOrderForm.amount) || 0, date: changeOrderForm.date };
                const updatedCOs = [...currentChangeOrders, newCO];
                updateProjectMutation.mutate({ id: editingProject.id, data: { change_orders: updatedCOs }, _skipClose: true });
                setEditingProject(prev => ({ ...prev, change_orders: updatedCOs }));
                setChangeOrderForm({ description: "", amount: "", date: new Date().toISOString().split("T")[0] });
              };

              const removeChangeOrder = (idx) => {
                const updatedCOs = currentChangeOrders.filter((_, i) => i !== idx);
                updateProjectMutation.mutate({ id: editingProject.id, data: { change_orders: updatedCOs }, _skipClose: true });
                setEditingProject(prev => ({ ...prev, change_orders: updatedCOs }));
              };

              return (
              <div className="space-y-4 py-4">
                <div className="text-sm text-slate-600 mb-4">
                  <div className="font-semibold text-slate-900">{editingProject.project_name}</div>
                  <div>{editingProject.client_name}</div>
                </div>

                {/* Total Amount */}
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (Base Contract)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="total_amount"
                      type="number"
                      className="pl-9"
                      value={editForm.total_amount}
                      onChange={(e) => setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Change Orders */}
                <div className="space-y-2">
                  <Label>Change Orders</Label>
                  {currentChangeOrders.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {currentChangeOrders.map((co, idx) => (
                        <div key={co.id || idx} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-slate-800">{co.description}</span>
                            {co.date && <span className="text-xs text-slate-400 ml-2">{co.date}</span>}
                          </div>
                          <span className="font-semibold text-blue-700 mr-2">+${(co.amount || 0).toLocaleString()}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeChangeOrder(idx)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add new change order */}
                  <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Add Change Order</p>
                    <Input
                      placeholder="Description"
                      value={changeOrderForm.description}
                      onChange={(e) => setChangeOrderForm(f => ({ ...f, description: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          className="pl-9"
                          placeholder="Amount"
                          value={changeOrderForm.amount}
                          onChange={(e) => setChangeOrderForm(f => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <Input
                        type="date"
                        className="w-36"
                        value={changeOrderForm.date}
                        onChange={(e) => setChangeOrderForm(f => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!changeOrderForm.description || !changeOrderForm.amount}
                      onClick={addChangeOrder}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Add Change Order
                    </Button>
                  </div>
                </div>

                {/* Running total */}
                {editForm.total_amount > 0 && (
                  <div className="flex justify-between items-center bg-slate-100 rounded-lg px-4 py-2 text-sm font-semibold">
                    <span className="text-slate-600">Running Total (Base + COs):</span>
                    <span className="text-slate-900 text-base">${computedTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="budget">Estimated Budget</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="budget"
                      type="number"
                      className="pl-9"
                      value={editForm.estimated_budget}
                      onChange={(e) => setEditForm({ ...editForm, estimated_budget: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual">Actual Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="actual"
                      type="number"
                      className="pl-9"
                      value={editForm.actual_cost}
                      onChange={(e) => setEditForm({ ...editForm, actual_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              );
            })()}
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