import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, Loader2 } from "lucide-react";
import EmployeeCard from "../components/team/EmployeeCard";
import EmployeeForm from "../components/team/EmployeeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Team() {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.User.list()
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowEditForm(false);
      setEditingEmployee(null);
      toast.success("Employee updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update employee");
    }
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("user");
      toast.success("Invitation sent successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    }
  });

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowEditForm(true);
  };

  const handleSubmitEdit = (data) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ 
        id: editingEmployee.id, 
        data: {
          full_name: data.full_name,
          role: data.role
        }
      });
    }
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      inviteUserMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
    }
  };

  const adminCount = employees.filter(e => e.role === "admin").length;
  const userCount = employees.filter(e => e.role === "user").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team</h1>
              <p className="text-slate-500 mt-1">Manage your team members</p>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Admins</p>
                <p className="text-2xl font-bold text-slate-900">{adminCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Users</p>
                <p className="text-2xl font-bold text-slate-900">{userCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={handleEdit}
            />
          ))}
        </div>

        {employees.length === 0 && (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No team members yet</h3>
            <p className="text-slate-500 mb-4">Get started by inviting your first team member</p>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </Card>
        )}

        {/* Edit Form */}
        <EmployeeForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          onSubmit={handleSubmitEdit}
          employee={editingEmployee}
          isLoading={updateEmployeeMutation.isPending}
        />

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite_email">Email Address</Label>
                <Input
                  id="invite_email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="invite_role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteEmail("");
                    setInviteRole("user");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviteUserMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {inviteUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}