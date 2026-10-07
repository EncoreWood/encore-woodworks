import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DoorOpen, DollarSign, CalendarDays } from "lucide-react";
import { getEffectiveInvoices, calcCollected } from "@/components/invoicing/CustomInvoicesEditor";

export default function ProjectOverviewCards({ project, meetings = [] }) {
  const rooms = project.rooms || [];
  const completedRooms = rooms.filter(r => r.completed).length;
  const cabinetCount = rooms.reduce((s, r) => s + (r.cabinet_count || 0), 0);

  const changeOrders = project.change_orders || [];
  const coTotal = changeOrders.reduce((s, co) => s + (parseFloat(co.amount) || 0), 0);
  const currentTotal = (project.base_amount || project.total_amount || project.estimated_budget || 0) + coTotal;
  const collected = calcCollected(getEffectiveInvoices(project));
  const remaining = currentTotal - collected;

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = meetings
    .filter(m => (m.status === "scheduled" || m.status === "requested") && (!m.scheduled_date || m.scheduled_date >= today))
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rooms summary */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <DoorOpen className="w-5 h-5 text-amber-500" />Rooms
        </h2>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-slate-900">{rooms.length}</span>
          <span className="text-sm text-slate-500">rooms · {cabinetCount} cabinets</span>
        </div>
        {rooms.length > 0 ? (
          <>
            <Progress value={(completedRooms / rooms.length) * 100} className="h-2 bg-slate-100 mb-1" />
            <p className="text-xs text-slate-500 mb-3">{completedRooms}/{rooms.length} rooms complete</p>
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((r, i) => (
                <Badge key={i} variant="outline" className={cn("text-xs", r.completed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                  {r.room_name || `Room ${i + 1}`}
                </Badge>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No rooms yet — add them in the Project Info tab.</p>
        )}
      </Card>

      {/* Financials summary */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-500" />Financials
        </h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-blue-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-blue-600 mb-0.5">Total</p>
            <p className="text-sm font-bold text-blue-800">${currentTotal.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-emerald-600 mb-0.5">Collected</p>
            <p className="text-sm font-bold text-emerald-700">${collected.toLocaleString()}</p>
          </div>
          <div className={cn("rounded-lg p-2.5 text-center", remaining > 0 ? "bg-amber-50" : "bg-slate-50")}>
            <p className="text-[10px] text-slate-500 mb-0.5">Remaining</p>
            <p className={cn("text-sm font-bold", remaining > 0 ? "text-amber-700" : "text-slate-500")}>${remaining.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {changeOrders.length} change order{changeOrders.length === 1 ? "" : "s"} ({coTotal > 0 ? `+ $${coTotal.toLocaleString()}` : "$0"})
        </p>
        <p className="text-xs text-slate-400 mt-2">Full details in the Financials tab.</p>
      </Card>

      {/* Upcoming meetings */}
      <Card className="p-6 bg-white border-0 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-blue-500" />Meetings
        </h2>
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((m, i) => (
              <div key={m.id || i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <div className="text-center flex-shrink-0 w-14">
                  <p className="text-xs font-bold text-slate-800">{m.scheduled_date ? format(new Date(m.scheduled_date), "MMM d") : "TBD"}</p>
                  {m.scheduled_time && <p className="text-[10px] text-slate-500">{m.scheduled_time}</p>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                  {m.location && <p className="text-xs text-slate-400 truncate">{m.location}</p>}
                </div>
                <Badge className={cn("text-[10px] border-0 flex-shrink-0", m.status === "scheduled" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                  {m.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No upcoming meetings.</p>
        )}
        <p className="text-xs text-slate-400 mt-3">Manage in the Client Relations tab.</p>
      </Card>
    </div>
  );
}