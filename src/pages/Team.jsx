import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserPlus, Loader2, Pencil, Settings, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import EmployeeCard from "../components/team/EmployeeCard";
import EmployeeDetailsDialog from "../components/team/EmployeeDetailsDialog";
import EmployeeForm from "../components/team/EmployeeForm";
import AssignTaskDialog from "../components/team/AssignTaskDialog";
import { toast } from "sonner";

export default function Team() {
  const [activeTab, setActiveTab] = useState('active');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showDepartmentSettings, setShowDepartmentSettings] = useState(false);
  const [departments, setDepartments] = useState(["production", "design", "installation", "sales", "shop", "management"]);
  const [newDepartment, setNewDepartment] = useState("");
  const [editingDept, setEditingDept] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState("");
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

  const { data: cleaningSchedules = [] } = useQuery({
    queryKey: ["cleaningSchedules"],
    queryFn: () => base44.entities.CleaningSchedule.list()
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["employees"] });
      const previous = queryClient.getQueryData(["employees"]);
      queryClient.setQueryData(["employees"], old => old?.map(e => e.id === id ? { ...e, ...data } : e) || []);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["employees"], context.previous);
      toast.error(error.message || "Failed to update employee");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      toast.success("Employee updated successfully");
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

  const archiveEmployeeMutation = useMutation({
    mutationFn: async ({ id, archive, employeeName }) => {
      await base44.entities.Employee.update(id, {
        archived: archive,
        archived_date: archive ? format(new Date(), "yyyy-MM-dd") : null
      });

      if (archive && employeeName) {
        const todayStr = format(new Date(), "yyyy-MM-dd");

        // Remove from future presenter slots
        const futurePresenters = presenters.filter(p => p.presenter_name === employeeName && p.date >= todayStr);
        await Promise.all(futurePresenters.map(p => base44.entities.MeetingPresenter.delete(p.id)));

        // Remove from cleaning schedules (permanent pair + rotating)
        const scheduleUpdates = cleaningSchedules
          .filter(cs => cs.permanent_pair?.includes(employeeName) || cs.rotating_person?.includes(employeeName))
          .map(cs => {
            const updates = {};
            if (cs.permanent_pair?.includes(employeeName))
              updates.permanent_pair = cs.permanent_pair.filter(n => n !== employeeName);
            if (cs.rotating_person?.includes(employeeName))
              updates.rotating_person = cs.rotating_person.split(", ").filter(n => n.trim() !== employeeName).join(", ");
            return base44.entities.CleaningSchedule.update(cs.id, updates);
          });
        await Promise.all(scheduleUpdates);

        // Remove from future bathroom cleaning assignments
        const futureCleanings = bathroomCleanings.filter(c => c.date >= todayStr && c.assigned_to?.includes(employeeName));
        await Promise.all(futureCleanings.map(c =>
          base44.entities.BathroomCleaning.update(c.id, { assigned_to: c.assigned_to.filter(n => n !== employeeName) })
        ));
      }
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["presenters"] });
      queryClient.invalidateQueries({ queryKey: ["cleaningSchedules"] });
      queryClient.invalidateQueries({ queryKey: ["bathroomCleanings"] });
      setShowEmployeeDetails(false);
      toast.success(archive ? "Employee removed and associations cleaned up" : "Employee restored");
    },
    onError: () => toast.error("Failed to update employee")
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

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.toLowerCase())) {
      setDepartments([...departments, newDepartment.toLowerCase()]);
      setNewDepartment("");
    }
  };

  const handleDeleteDepartment = (dept) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const handleEditDepartment = (oldDept) => {
    if (editingDeptName.trim() && !departments.includes(editingDeptName.toLowerCase())) {
      setDepartments(departments.map(d => d === oldDept ? editingDeptName.toLowerCase() : d));
      setEditingDept(null);
      setEditingDeptName("");
    }
  };

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
             <div className="flex gap-2">
               <Button
                 onClick={() => setShowDepartmentSettings(true)}
                 variant="outline"
                 className="text-slate-600"
               >
                 <Settings className="w-4 h-4 mr-2" />
                 Departments
               </Button>
               <Button
                 onClick={handleAddNew}
                 className="bg-amber-600 hover:bg-amber-700"
               >
                 <UserPlus className="w-4 h-4 mr-2" />
                 Add Employee
               </Button>
             </div>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'active' ? 'bg-amber-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Active ({employees.filter(e => !e.archived).length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'archived' ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Archived ({employees.filter(e => e.archived).length})
          </button>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.filter(e => activeTab === 'active' ? !e.archived : e.archived).map((employee) => {
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
                onArchive={(emp) => {
                  if (confirm(`${emp.archived ? 'Restore' : 'Remove'} ${emp.full_name}?${
                    !emp.archived ? ' This will remove them from future meeting rotations, cleaning schedules, and mark their time cards as archived.' : ''
                  }`)) {
                    archiveEmployeeMutation.mutate({ id: emp.id, archive: !emp.archived, employeeName: emp.full_name });
                  }
                }}
              />
            );
          })}
        </div>

        {employees.filter(e => activeTab === 'active' ? !e.archived : e.archived).length === 0 && (
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

        {/* Department Settings Dialog */}
         <Dialog open={showDepartmentSettings} onOpenChange={setShowDepartmentSettings}>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>Department Management</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               {/* Add New Department */}
               <div className="flex gap-2">
                 <input
                   type="text"
                   value={newDepartment}
                   onChange={(e) => setNewDepartment(e.target.value)}
                   placeholder="New department name"
                   className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                   onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                 />
                 <Button
                   onClick={handleAddDepartment}
                   size="sm"
                   className="bg-amber-600 hover:bg-amber-700"
                 >
                   <Plus className="w-4 h-4" />
                 </Button>
               </div>

               {/* Department List */}
               <div className="space-y-2 max-h-64 overflow-y-auto">
                 {departments.map((dept) => (
                   <div
                     key={dept}
                     className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                   >
                     {editingDept === dept ? (
                       <div className="flex gap-2 flex-1">
                         <input
                           type="text"
                           value={editingDeptName}
                           onChange={(e) => setEditingDeptName(e.target.value)}
                           className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                           autoFocus
                         />
                         <Button
                           onClick={() => handleEditDepartment(dept)}
                           size="sm"
                           variant="outline"
                           className="h-8"
                         >
                           Save
                         </Button>
                         <Button
                           onClick={() => {
                             setEditingDept(null);
                             setEditingDeptName("");
                           }}
                           size="sm"
                           variant="outline"
                           className="h-8"
                         >
                           Cancel
                         </Button>
                       </div>
                     ) : (
                       <>
                         <span className="text-sm font-medium text-slate-700 capitalize">
                           {dept}
                         </span>
                         <div className="flex gap-1">
                           <Button
                             onClick={() => {
                               setEditingDept(dept);
                               setEditingDeptName(dept);
                             }}
                             size="sm"
                             variant="ghost"
                             className="h-8 w-8 p-0"
                           >
                             <Pencil className="w-3 h-3" />
                           </Button>
                           <Button
                             onClick={() => handleDeleteDepartment(dept)}
                             size="sm"
                             variant="ghost"
                             className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                           >
                             <Trash2 className="w-3 h-3" />
                           </Button>
                         </div>
                       </>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           </DialogContent>
         </Dialog>

        {/* Employee Details Dialog */}
        <EmployeeDetailsDialog
          open={showEmployeeDetails}
          onOpenChange={setShowEmployeeDetails}
          employee={employees.find(e => e.id === viewingEmployee?.id) || viewingEmployee}
          tasks={tasks}
          presenters={presenters}
          bathroomCleanings={bathroomCleanings}
          onEdit={handleEdit}
          onAssignTask={handleAssignTask}
          onArchive={(emp) => {
            archiveEmployeeMutation.mutate({ id: emp.id, archive: !emp.archived, employeeName: emp.full_name });
          }}
          archivePending={archiveEmployeeMutation.isPending}
        />

      </div>
    </div>
  );
}