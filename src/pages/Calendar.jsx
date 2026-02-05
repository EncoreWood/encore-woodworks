import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";

const statusConfig = {
  inquiry: { label: "Inquiry", color: "bg-slate-500" },
  quoted: { label: "Quoted", color: "bg-blue-500" },
  approved: { label: "Approved", color: "bg-emerald-500" },
  in_design: { label: "In Design", color: "bg-violet-500" },
  in_production: { label: "In Production", color: "bg-amber-500" },
  ready_for_install: { label: "Ready", color: "bg-cyan-500" },
  installing: { label: "Installing", color: "bg-orange-500" },
  completed: { label: "Completed", color: "bg-emerald-600" },
  on_hold: { label: "On Hold", color: "bg-red-500" }
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date")
  });

  const getProjectsForDate = (date) => {
    return projects.filter((project) => {
      const startDate = project.start_date ? new Date(project.start_date) : null;
      const completionDate = project.estimated_completion ? new Date(project.estimated_completion) : null;
      
      return (
        (startDate && isSameDay(startDate, date)) ||
        (completionDate && isSameDay(completionDate, date))
      );
    });
  };

  const getDayContent = (day) => {
    const projectsOnDay = getProjectsForDate(day);
    if (projectsOnDay.length === 0) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 px-0.5 pb-0.5">
        {projectsOnDay.slice(0, 3).map((project) => (
          <div
            key={project.id}
            className={`h-1 flex-1 rounded-full ${statusConfig[project.status]?.color || "bg-slate-400"}`}
            title={project.project_name}
          />
        ))}
      </div>
    );
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const projectsInMonth = projects.filter((project) => {
    const startDate = project.start_date ? new Date(project.start_date) : null;
    const completionDate = project.estimated_completion ? new Date(project.estimated_completion) : null;
    
    return (
      (startDate && startDate >= monthStart && startDate <= monthEnd) ||
      (completionDate && completionDate >= monthStart && completionDate <= monthEnd)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Calendar</h1>
          <p className="text-slate-500 mt-1">View projects by their scheduled dates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <style>{`
                .rdp-day {
                  position: relative;
                  height: 80px;
                }
                .rdp-day_button {
                  width: 100%;
                  height: 100%;
                }
              `}</style>

              <CalendarComponent
                mode="single"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                classNames={{
                  months: "w-full",
                  month: "w-full",
                  table: "w-full border-collapse",
                  head_cell: "text-slate-500 font-medium w-14",
                  cell: "relative p-0 text-center border border-slate-100",
                  day: "relative h-20 w-full p-0 font-normal hover:bg-slate-50",
                  day_selected: "bg-amber-50 text-amber-900",
                  day_today: "bg-slate-100 font-semibold",
                  day_outside: "text-slate-300"
                }}
                components={{
                  DayContent: ({ date }) => (
                    <div className="w-full h-full flex flex-col">
                      <div className="text-sm p-2">{format(date, "d")}</div>
                      {getDayContent(date)}
                    </div>
                  )
                }}
              />

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-slate-600">Start Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Completion Date</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Projects List for Current Month */}
          <div>
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                This Month ({projectsInMonth.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {projectsInMonth.length === 0 ? (
                  <p className="text-sm text-slate-500">No projects scheduled this month</p>
                ) : (
                  projectsInMonth.map((project) => (
                    <Link
                      key={project.id}
                      to={createPageUrl("ProjectDetails") + "?id=" + project.id}
                      className="block p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-slate-900 text-sm line-clamp-1">
                          {project.project_name}
                        </h3>
                        <Badge
                          className={`text-xs border-0 ${statusConfig[project.status]?.color || "bg-slate-500"} text-white`}
                        >
                          {statusConfig[project.status]?.label || project.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{project.client_name}</p>
                      <div className="space-y-1 text-xs text-slate-500">
                        {project.start_date && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Start: {format(new Date(project.start_date), "MMM d")}</span>
                          </div>
                        )}
                        {project.estimated_completion && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Due: {format(new Date(project.estimated_completion), "MMM d")}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}