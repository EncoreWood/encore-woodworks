import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Users, Mail, Phone, Briefcase, Calendar, Cake, Pencil, ListTodo, ShieldCheck, FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";

const departmentColors = {
  production: "bg-blue-100 text-blue-700",
  design: "bg-purple-100 text-purple-700",
  installation: "bg-orange-100 text-orange-700",
  sales: "bg-green-100 text-green-700",
  management: "bg-amber-100 text-amber-700"
};

export default function EmployeeCard({ employee, tasks = [], presentations = [], cleanings = [], onClick, onEdit, onAssignTask }) {
  const upcomingItems = [
    ...tasks.slice(0, 2).map(t => ({ type: 'task', data: t })),
    ...presentations.slice(0, 1).map(p => ({ type: 'presentation', data: p })),
    ...cleanings.slice(0, 1).map(c => ({ type: 'cleaning', data: c }))
  ].slice(0, 2);

  return (
    <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {employee.profile_image ? (
            <img 
              src={employee.profile_image} 
              alt={employee.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
            {employee.position && (
              <p className="text-sm text-slate-500">{employee.position}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAssignTask(employee);
            }}
            className="text-slate-400 hover:text-slate-700"
            title="Assign Task"
          >
            <ListTodo className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(employee);
            }}
            className="text-slate-400 hover:text-slate-700"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {employee.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{employee.email}</span>
          </div>
        )}

        {employee.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{employee.phone}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {employee.department && (
            <Badge className={`border-0 ${departmentColors[employee.department]}`}>
              {employee.department.charAt(0).toUpperCase() + employee.department.slice(1)}
            </Badge>
          )}
          {employee.user_email && (
            <Badge className="border-0 bg-slate-100 text-slate-700">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {employee.user_role === 'admin' ? 'Admin User' : 'User'}
            </Badge>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-1">
          {employee.hire_date && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>Hired {format(new Date(employee.hire_date), "MMM d, yyyy")}</span>
            </div>
          )}
          {employee.birthday && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Cake className="w-3 h-3" />
              <span>Birthday {format(new Date(employee.birthday), "MMM d")}</span>
            </div>
          )}
          {employee.files && employee.files.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Paperclip className="w-3 h-3" />
              <span>{employee.files.length} file{employee.files.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        {upcomingItems.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            {upcomingItems.map((item, idx) => (
              <div key={idx} className="text-xs">
                {item.type === 'task' && (
                  <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-1.5 rounded">
                    <ListTodo className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.data.task}</p>
                      <p className="text-blue-600">{format(new Date(item.data.date), "MMM d")}</p>
                    </div>
                  </div>
                )}
                {item.type === 'presentation' && (
                  <div className="flex items-start gap-2 text-purple-700 bg-purple-50 p-1.5 rounded">
                    <Users className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">Morning Meeting</p>
                      <p className="text-purple-600">{format(new Date(item.data.date), "MMM d")}</p>
                    </div>
                  </div>
                )}
                {item.type === 'cleaning' && (
                  <div className="flex items-start gap-2 text-green-700 bg-green-50 p-1.5 rounded">
                    <Paperclip className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">Bathroom Cleaning</p>
                      <p className="text-green-600">{format(new Date(item.data.date), "MMM d")}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}