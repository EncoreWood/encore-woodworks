import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, Loader2 } from "lucide-react";
import EmployeeCard from "../components/team/EmployeeCard";
import EmployeeForm from "../components/team/EmployeeForm";
import AssignTaskDialog from "../components/team/AssignTaskDialog";
import { toast } from "sonner";

export default function Team() {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data) => {
      const employee = await base44.entities.Employee.create(data);
      
      // If user_email is provided, invite them as a user
      if (data.user_email) {
        try {
          await base44.users.inviteUser(data.user_email, data.user_role || "user");
        } catch (error) {
          console.error("Failed to invite user:", error);
          throw new Error("Employee created but failed to send user invitation");
        }
      }
      
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      toast.success("Employee added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add employee");
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data, originalEmployee }) => {
      const employee = await base44.entities.Employee.update(id, data);
      
      // If user_email is newly added, invite them
      if (data.user_email && data.user_email !== originalEmployee.user_email) {
        try {
          await base44.users.inviteUser(data.user_email, data.user_role || "user");
        } catch (error) {
          console.error("Failed to invite user:", error);
          throw new Error("Employee updated but failed to send user invitation");
        }
      }
      
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      toast.success("Employee updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update employee");
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.MeetingTask.create(taskData),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowTaskDialog(false);
      setAssigningEmployee(null);
      
      // Sync to Google Calendar
      await base44.functions.invoke("syncToGoogleCalendar", {
        type: "task",
        data: data
      });
      
      toast.success("Task assigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign task");
    }
  });

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleSubmitEmployee = (data) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ 
        id: editingEmployee.id, 
        data,
        originalEmployee: editingEmployee 
      });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleAssignTask = (employee) => {
    setAssigningEmployee(employee);
    setShowTaskDialog(true);
  };

  const handleSubmitTask = (taskData) => {
    assignTaskMutation.mutate({
      task: taskData.task,
      date: taskData.date,
      assignee: assigningEmployee.full_name,
      completed: false
    });
  };

  const departmentCount = (dept) => employees.filter(e => e.department === dept).length;

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
              onClick={handleAddNew}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
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
                <p className="text-sm text-slate-500">Total Employees</p>
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
                <p className="text-sm text-slate-500">Production</p>
                <p className="text-2xl font-bold text-slate-900">{departmentCount("production")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Design</p>
                <p className="text-2xl font-bold text-slate-900">{departmentCount("design")}</p>
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
              onAssignTask={handleAssignTask}
            />
          ))}
        </div>

        {employees.length === 0 && (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No employees yet</h3>
            <p className="text-slate-500 mb-4">Get started by adding your first employee</p>
            <Button
              onClick={handleAddNew}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </Card>
        )}

        {/* Employee Form */}
        <EmployeeForm
          open={showEmployeeForm}
          onOpenChange={setShowEmployeeForm}
          onSubmit={handleSubmitEmployee}
          employee={editingEmployee}
          isLoading={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
        />

        {/* Assign Task Dialog */}
        <AssignTaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          onSubmit={handleSubmitTask}
          employee={assigningEmployee}
          isLoading={assignTaskMutation.isPending}
        />
      </div>
    </div>
  );
}