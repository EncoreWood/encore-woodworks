import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700"
};

export default function EmployeePtoDialog({ open, onOpenChange, employee }) {
  const { data: vacations = [], isLoading } = useQuery({
    queryKey: ["employeeVacations", employee?.id],
    queryFn: () => base44.entities.Vacation.filter({ employee_id: employee.id }),
    enabled: open && !!employee
  });

  const accrued = employee?.pto_hours_accrued || 0;
  const used = employee?.pto_hours_used || 0;
  const available = accrued - used;
  const sorted = [...vacations].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PTO — {employee?.full_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">Accrued</p>
            <p className="text-xl font-bold text-slate-900">{accrued}h</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">Used</p>
            <p className="text-xl font-bold text-slate-900">{used}h</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <p className="text-xs text-amber-700">Available</p>
            <p className="text-xl font-bold text-amber-800">{available}h</p>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-slate-700 pt-2 pb-1">Time Off Requests</h4>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500 pb-4">No time off requests on record.</p>
        ) : (
          <div className="space-y-2 pb-4">
            {sorted.map((v) => (
              <div key={v.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">
                    {format(new Date(v.start_date + "T12:00:00"), "MMM d, yyyy")}
                    {v.end_date && v.end_date !== v.start_date && ` – ${format(new Date(v.end_date + "T12:00:00"), "MMM d, yyyy")}`}
                    {v.use_pto && v.pto_hours_used ? ` · ${v.pto_hours_used}h PTO` : ""}
                  </p>
                  {v.notes && <p className="text-xs text-slate-500 truncate">{v.notes}</p>}
                </div>
                <Badge className={`border-0 ${statusColors[v.status] || "bg-slate-100 text-slate-700"}`}>
                  {v.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}