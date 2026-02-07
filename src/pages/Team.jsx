import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserPlus, Loader2, User, Mail, Phone, Calendar, Cake, FileText, ShieldCheck, Pencil, ListTodo } from "lucide-react";
import { format } from "date-fns";
import EmployeeCard from "../components/team/EmployeeCard";
import EmployeeForm from "../components/team/EmployeeForm";
import AssignTaskDialog from "../components/team/AssignTaskDialog";
import { toast } from "sonner";

export default function Team() {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.MeetingTask.list("-date")
  });

  const { data: presenters = [] } = useQuery({
    queryKey: ["presenters"],
    queryFn: () => base44.entities.MeetingPresenter.list("-date")
  });

  const { data: bathroomCleanings = [] } = useQuery({
    queryKey: ["bathroomCleanings"],
    queryFn: () => base44.entities.BathroomCleaning.list("-date")
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200">
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
          {employees.map((employee) => {
            const employeeTasks = tasks.filter(task => task.assignee === employee.full_name && !task.completed);
            const employeePresentations = presenters.filter(p => p.presenter_name === employee.full_name);
            const employeeCleanings = bathroomCleanings.filter(c => c.assigned_to?.includes(employee.full_name));
            
            return (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                tasks={employeeTasks}
                presentations={employeePresentations}
                cleanings={employeeCleanings}
                onClick={() => {
                  setViewingEmployee(employee);
                  setShowEmployeeDetails(true);
                }}
                onEdit={handleEdit}
                onAssignTask={handleAssignTask}
              />
            );
          })}
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

        {/* Employee Details Dialog */}
        <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            {viewingEmployee && (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                    {viewingEmployee.profile_image ? (
                      <img src={viewingEmployee.profile_image} alt={viewingEmployee.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900">{viewingEmployee.full_name}</h3>
                    {viewingEmployee.position && (
                      <p className="text-slate-600 mt-1">{viewingEmployee.position}</p>
                    )}
                    {viewingEmployee.department && (
                      <Badge className="mt-2 border-0 bg-amber-100 text-amber-700">
                        {viewingEmployee.department.charAt(0).toUpperCase() + viewingEmployee.department.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    {viewingEmployee.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${viewingEmployee.email}`} className="text-slate-600 hover:text-amber-600">
                          {viewingEmployee.email}
                        </a>
                      </div>
                    )}
                    {viewingEmployee.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${viewingEmployee.phone}`} className="text-slate-600 hover:text-amber-600">
                          {viewingEmployee.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Important Dates</h4>
                  <div className="space-y-2">
                    {viewingEmployee.hire_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          Hired: {format(new Date(viewingEmployee.hire_date), "MMMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {viewingEmployee.birthday && (
                      <div className="flex items-center gap-2 text-sm">
                        <Cake className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          Birthday: {format(new Date(viewingEmployee.birthday), "MMMM d")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Access */}
                {viewingEmployee.user_email && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">User Access</h4>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-slate-600">
                        {viewingEmployee.user_role === 'admin' ? 'Admin User' : 'User'} - {viewingEmployee.user_email}
                      </span>
                    </div>
                  </div>
                )}

                {/* Files */}
                {viewingEmployee.files && viewingEmployee.files.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Files</h4>
                    <div className="space-y-2">
                      {viewingEmployee.files.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {viewingEmployee.notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Notes</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewingEmployee.notes}</p>
                  </div>
                )}

                {/* Assigned Tasks */}
                {(() => {
                  const employeeTasks = tasks.filter(task => task.assignee === viewingEmployee.full_name);
                  const upcomingTasks = employeeTasks.filter(task => !task.completed && new Date(task.date) >= new Date());
                  
                  if (upcomingTasks.length > 0) {
                    return (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Tasks</h4>
                        <div className="space-y-2">
                          {upcomingTasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                              <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900">{task.task}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(new Date(task.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Calendar Events */}
                {(() => {
                  const upcomingPresentations = presenters.filter(
                    p => p.presenter_name === viewingEmployee.full_name && new Date(p.date) >= new Date()
                  );
                  const upcomingCleanings = bathroomCleanings.filter(
                    c => c.assigned_to?.includes(viewingEmployee.full_name) && new Date(c.date) >= new Date()
                  );
                  
                  if (upcomingPresentations.length > 0 || upcomingCleanings.length > 0) {
                    return (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Calendar Events</h4>
                        <div className="space-y-2">
                          {upcomingPresentations.slice(0, 3).map((presenter) => (
                            <div key={presenter.id} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                              <Users className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900">Morning Meeting Presenter</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(new Date(presenter.date), "MMM d, yyyy")}
                                  {presenter.time && ` at ${presenter.time}`}
                                </p>
                              </div>
                            </div>
                          ))}
                          {upcomingCleanings.slice(0, 3).map((cleaning) => (
                            <div key={cleaning.id} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                              <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900">Bathroom Cleaning</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(new Date(cleaning.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Actions */}
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      setShowEmployeeDetails(false);
                      handleEdit(viewingEmployee);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmployeeDetails(false);
                      handleAssignTask(viewingEmployee);
                    }}
                    className="flex-1"
                  >
                    <ListTodo className="w-4 h-4 mr-2" />
                    Assign Task
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}