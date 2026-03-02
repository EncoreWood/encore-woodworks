import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import RoomsEditor from "./RoomsEditor";
import FileUploader from "./FileUploader";
import WoodTypeSelector from "./WoodTypeSelector";

const emptyContact = { name: "", email: "", phone: "" };

const initialFormState = {
  project_name: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  contractor: { ...emptyContact },
  home_owner: { ...emptyContact },
  designer: { ...emptyContact },
  project_type: "kitchen",
  status: "inquiry",
  priority: "medium",
  project_manager: "",
  project_manager_name: "",
  shop_manager: "",
  shop_manager_name: "",
  address: "",
  estimated_budget: "",
  start_date: "",
  estimated_completion: "",
  cabinet_style: "",
  hardware_type: "",
  finish: "",
  wood_types: [],
  available_wood_types: ["Maple", "Oak", "Cherry", "Walnut", "Birch", "Hickory", "Pine", "Alder", "Ash", "Mahogany"],
  notes: "",
  project_url: "",
  files: [],
  rooms: []
};

export default function ProjectForm({ open, onOpenChange, onSubmit, initialData, isLoading }) {
  const [formData, setFormData] = useState(initialData || initialFormState);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: open
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
    enabled: open
  });

  useEffect(() => {
    if (open) {
      const data = initialData || initialFormState;
      setFormData({
        ...data,
        contractor: data.contractor || { ...emptyContact },
        home_owner: data.home_owner || { ...emptyContact },
        designer: data.designer || { ...emptyContact },
      });
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null
    };
    onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleManagerChange = (field, employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (field === "project_manager") {
      setFormData((prev) => ({
        ...prev,
        project_manager: employeeId,
        project_manager_name: employee?.full_name || ""
      }));
    } else if (field === "shop_manager") {
      setFormData((prev) => ({
        ...prev,
        shop_manager: employeeId,
        shop_manager_name: employee?.full_name || ""
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {initialData ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Project Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Project Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => handleChange("project_name", e.target.value)}
                  placeholder="e.g., Smith Kitchen Remodel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type *</Label>
                <Select value={formData.project_type} onValueChange={(v) => handleChange("project_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="bathroom">Bathroom</SelectItem>
                    <SelectItem value="closet">Closet</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="laundry">Laundry</SelectItem>
                    <SelectItem value="new_construction">New Construction</SelectItem>
                    <SelectItem value="remodel">Remodel</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_design">In Design</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="ready_for_install">Ready for Install</SelectItem>
                    <SelectItem value="installing">Installing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
               <Label htmlFor="priority">Priority</Label>
               <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="low">Low</SelectItem>
                   <SelectItem value="medium">Medium</SelectItem>
                   <SelectItem value="high">High</SelectItem>
                   <SelectItem value="urgent">Urgent</SelectItem>
                 </SelectContent>
               </Select>
              </div>
              <div className="space-y-2">
               <Label htmlFor="project_manager">Project Manager</Label>
               <Select value={formData.project_manager} onValueChange={(v) => handleManagerChange("project_manager", v)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select manager" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={null}>None</SelectItem>
                   {employees.map((emp) => (
                     <SelectItem key={emp.id} value={emp.id}>
                       {emp.full_name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
              </div>
              <div className="space-y-2">
               <Label htmlFor="shop_manager">Shop Manager</Label>
               <Select value={formData.shop_manager} onValueChange={(v) => handleManagerChange("shop_manager", v)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select manager" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value={null}>None</SelectItem>
                   {employees.map((emp) => (
                     <SelectItem key={emp.id} value={emp.id}>
                       {emp.full_name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
              </div>
              </div>
              </div>

          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Client Information</h3>

            {[
              { field: "contractor", label: "Contractor", types: ["GC"] },
              { field: "home_owner", label: "Home Owner", types: ["Home Owner"] },
              { field: "designer", label: "Designer", types: ["Designer"] },
            ].map(({ field, label, types }) => {
              const relevantContacts = contacts.filter(c => !c.contact_type || types.includes(c.contact_type) || true);
              return (
                <div key={field} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-600">{label}</p>
                  <Select
                    value=""
                    onValueChange={(contactId) => {
                      const c = contacts.find(x => x.id === contactId);
                      if (c) handleChange(field, { name: c.name, email: c.email || "", phone: c.phone || "" });
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select from contacts..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.contact_type ? ` (${c.contact_type})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      placeholder="Name"
                      value={formData[field]?.name || ""}
                      onChange={(e) => handleChange(field, { ...formData[field], name: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={formData[field]?.email || ""}
                      onChange={(e) => handleChange(field, { ...formData[field], email: e.target.value })}
                    />
                    <Input
                      placeholder="Phone"
                      value={formData[field]?.phone || ""}
                      onChange={(e) => handleChange(field, { ...formData[field], phone: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <Label htmlFor="address">Installation Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>

          {/* Budget & Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Budget & Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_budget">Estimated Budget ($)</Label>
                <Input
                  id="estimated_budget"
                  type="number"
                  value={formData.estimated_budget}
                  onChange={(e) => handleChange("estimated_budget", e.target.value)}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_completion">Est. Completion</Label>
                <Input
                  id="estimated_completion"
                  type="date"
                  value={formData.estimated_completion}
                  onChange={(e) => handleChange("estimated_completion", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cabinet_style">Cabinet Style</Label>
                <Input
                  id="cabinet_style"
                  value={formData.cabinet_style}
                  onChange={(e) => handleChange("cabinet_style", e.target.value)}
                  placeholder="e.g., Shaker White"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hardware_type">Hardware Type</Label>
                <Input
                  id="hardware_type"
                  value={formData.hardware_type}
                  onChange={(e) => handleChange("hardware_type", e.target.value)}
                  placeholder="e.g., Brushed Nickel Pulls"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finish">Finish</Label>
                <Input
                  id="finish"
                  value={formData.finish}
                  onChange={(e) => handleChange("finish", e.target.value)}
                  placeholder="e.g., Natural Clear Coat"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Wood Types</Label>
                <WoodTypeSelector
                  selectedWoods={formData.wood_types || []}
                  availableWoods={formData.available_wood_types || initialFormState.available_wood_types}
                  onChange={(woods) => handleChange("wood_types", woods)}
                  onUpdateAvailable={(woods) => handleChange("available_wood_types", woods)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project_url">Project URL</Label>
                <Input
                  id="project_url"
                  type="url"
                  value={formData.project_url}
                  onChange={(e) => handleChange("project_url", e.target.value)}
                  placeholder="https://example.com/project"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Additional project notes..."
                  rows={3}
                />
              </div>
              </div>
              </div>

          {/* Project Files */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Project Files</h3>
            <FileUploader
              files={formData.files || []}
              onChange={(files) => handleChange("files", files)}
              label="Contracts, Designs, etc."
            />
          </div>

          {/* Rooms */}
          <RoomsEditor
            rooms={formData.rooms || []}
            onChange={(rooms) => handleChange("rooms", rooms)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}