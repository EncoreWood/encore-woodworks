import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Briefcase, Calendar, Pencil } from "lucide-react";
import { format } from "date-fns";

const departmentColors = {
  production: "bg-blue-100 text-blue-700",
  design: "bg-purple-100 text-purple-700",
  installation: "bg-orange-100 text-orange-700",
  sales: "bg-green-100 text-green-700",
  management: "bg-amber-100 text-amber-700"
};

export default function EmployeeCard({ employee, onEdit }) {
  return (
    <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
            {employee.position && (
              <p className="text-sm text-slate-500">{employee.position}</p>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(employee)}
          className="text-slate-400 hover:text-slate-700"
        >
          <Pencil className="w-4 h-4" />
        </Button>
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

        {employee.department && (
          <Badge className={`border-0 ${departmentColors[employee.department]}`}>
            {employee.department.charAt(0).toUpperCase() + employee.department.slice(1)}
          </Badge>
        )}

        {employee.hire_date && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Hired {format(new Date(employee.hire_date), "MMM d, yyyy")}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}