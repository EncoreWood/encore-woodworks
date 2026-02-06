import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Crown, Pencil } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeCard({ employee, onEdit }) {
  const isAdmin = employee.role === "admin";

  return (
    <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
            {isAdmin && (
              <Badge className="bg-amber-100 text-amber-700 border-0 mt-1">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
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
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail className="w-4 h-4 text-slate-400" />
          <span>{employee.email}</span>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Joined {format(new Date(employee.created_date), "MMM d, yyyy")}
          </p>
        </div>
      </div>
    </Card>
  );
}