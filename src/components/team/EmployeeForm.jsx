import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, User, FileText, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";

const PAGE_PERMISSIONS = [
  { group: "Dashboard", pages: [
    { key: "Dashboard", label: "Dashboard" },
  ]},
  { group: "Projects", pages: [
    { key: "Kanban", label: "Projects Board" },
    { key: "Invoicing", label: "Invoicing" },
    { key: "ContactsBoard", label: "Contacts Board" },
    { key: "Presentations", label: "Presentations" },
    { key: "OrdersBoard", label: "Project Orders" },
    { key: "PickupList", label: "Pick Up List" },
    { key: "PlanBidding", label: "Project Estimates" },
  ]},
  { group: "Operations", pages: [
    { key: "Calendar", label: "Calendar" },
    { key: "ShopProduction", label: "Production" },
    { key: "Tools", label: "Tools" },
    { key: "Inventory", label: "Inventory" },
    { key: "PurchaseOrders", label: "Purchase Orders" },
    { key: "Suppliers", label: "Suppliers" },
    { key: "EncoreDocs", label: "Encore Docs" },
    { key: "SOPBoard", label: "SOPs" },
    { key: "Notepad", label: "Notepad" },
  ]},
  { group: "Team", pages: [
    { key: "MorningMeeting", label: "Morning Meeting" },
    { key: "Team", label: "Team" },
    { key: "TimeSheet", label: "Time Sheet" },
    { key: "ChatBoard", label: "Chat" },
    { key: "Forms", label: "Forms" },
  ]},
];

export default function EmployeeForm({ open, onOpenChange, onSubmit, employee, isLoading }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    hire_date: "",
    birthday: "",
    profile_image: "",
    user_email: "",
    user_role: "user",
    allowed_pages: [],
    files: [],
    notes: ""
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [inviteAsUser, setInviteAsUser] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        department: employee.department || "",
        hire_date: employee.hire_date || "",
        birthday: employee.birthday || "",
        profile_image: employee.profile_image || "",
        user_email: employee.user_email || "",
        user_role: employee.user_role || "user",
        allowed_pages: employee.allowed_pages || [],
        files: employee.files || [],
        notes: employee.notes || ""
      });
      setInviteAsUser(!!employee.user_email);
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        position: "",
        department: "",
        hire_date: "",
        birthday: "",
        profile_image: "",
        user_email: "",
        user_role: "user",
        allowed_pages: [],
        files: [],
        notes: ""
      });
      setInviteAsUser(false);
    }
  }, [employee, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_image: file_url });
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        files: [...formData.files, { name: file.name, url: file_url }]
      });
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      files: formData.files.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              {formData.profile_image ? (
                <div className="relative">
                  <img 
                    src={formData.profile_image} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profile_image: "" })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile_image_upload"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("profile_image_upload").click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Job title"
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="invite_as_user"
                checked={inviteAsUser}
                onCheckedChange={(checked) => {
                  setInviteAsUser(checked);
                  if (!checked) {
                    setFormData({ ...formData, user_email: "", user_role: "user" });
                  } else if (formData.email) {
                    setFormData({ ...formData, user_email: formData.email });
                  }
                }}
              />
              <Label htmlFor="invite_as_user" className="cursor-pointer font-normal">
                Create user account for this employee
              </Label>
            </div>

            {inviteAsUser && (
              <div className="space-y-3 pl-6 border-l-2 border-amber-200">
                <div>
                  <Label htmlFor="user_email">User Email *</Label>
                  <Input
                    id="user_email"
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                    placeholder="email@example.com"
                    required={inviteAsUser}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    An invitation will be sent to this email
                  </p>
                </div>

                <div>
                  <Label htmlFor="user_role">User Role</Label>
                  <Select
                    value={formData.user_role}
                    onValueChange={(value) => setFormData({ ...formData, user_role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Page Permissions */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Page Permissions</Label>
            <p className="text-xs text-slate-500 mb-3">Select which pages this employee can access (applies when role is "User")</p>
            <div className="space-y-3">
              {PAGE_PERMISSIONS.map((group) => (
                <div key={group.group} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id={`group-${group.group}`}
                      checked={group.pages.every(p => (formData.allowed_pages || []).includes(p.key))}
                      onCheckedChange={(checked) => {
                        const keys = group.pages.map(p => p.key);
                        const current = formData.allowed_pages || [];
                        const updated = checked
                          ? [...new Set([...current, ...keys])]
                          : current.filter(k => !keys.includes(k));
                        setFormData({ ...formData, allowed_pages: updated });
                      }}
                    />
                    <label htmlFor={`group-${group.group}`} className="text-sm font-semibold text-slate-800 cursor-pointer">{group.group}</label>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pl-6">
                    {group.pages.map((page) => (
                      <div key={page.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`perm-${page.key}`}
                          checked={(formData.allowed_pages || []).includes(page.key)}
                          onCheckedChange={(checked) => {
                            const current = formData.allowed_pages || [];
                            const updated = checked
                              ? [...current, page.key]
                              : current.filter(k => k !== page.key);
                            setFormData({ ...formData, allowed_pages: updated });
                          }}
                        />
                        <label htmlFor={`perm-${page.key}`} className="text-xs text-slate-700 cursor-pointer">{page.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Files</Label>
            <div className="space-y-2">
              {formData.files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-slate-700 hover:text-amber-600 flex-1 truncate"
                  >
                    {file.name}
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file_upload"
                  disabled={uploadingFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file_upload").click()}
                  disabled={uploadingFile}
                  className="w-full"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Add File
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                employee ? "Save Changes" : "Add Employee"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}