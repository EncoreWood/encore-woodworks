import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, X, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STAGE_CONFIG = [
  { key: "deposit", label: "Deposit", amtField: "deposit_invoice_amount", recField: "deposit_invoice_received_date", expField: "deposit_expected_date", color: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  { key: "ninety", label: "90%", amtField: "ninety_percent_invoice_amount", recField: "ninety_percent_invoice_received_date", expField: "ninety_percent_expected_date", color: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  { key: "final", label: "Final", amtField: "final_invoice_amount", recField: "final_invoice_received_date", expField: "final_expected_date", color: "bg-green-100 text-green-800", dot: "bg-green-500" },
];

const fmt$ = (n) => n ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0";

export default function InvoicingCalendar({ projects }) {
  const queryClient = useQueryClient();
  const [focusMonth, setFocusMonth] = useState(startOfMonth(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(null);
  // inline editing state: { [projectId]: { field: value } }
  const [pendingEdits, setPendingEdits] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleDateChange = (projectId, field, value) => {
    setPendingEdits(prev => ({ ...prev, [projectId]: { ...(prev[projectId] || {}), [field]: value } }));
  };

  const handleDateBlur = (projectId, field, value) => {
    updateMutation.mutate({ id: projectId, data: { [field]: value } });
    setPendingEdits(prev => {
      const next = { ...prev };
      if (next[projectId]) delete next[projectId][field];
      return next;
    });
    toast.success("Date saved!");
  };

  const getDateValue = (project, field) => {
    return pendingEdits[project.id]?.[field] !== undefined
      ? pendingEdits[project.id][field]
      : (project[field] || "");
  };

  // Build 12-month window starting 3 months back
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => addMonths(subMonths(focusMonth, 3), i));
  }, [focusMonth]);

  // For each month, compute actual received and expected
  const monthData = useMemo(() => {
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      const actual = { total: 0, breakdown: [] };
      const expected = { total: 0, breakdown: [] };

      projects.forEach((p) => {
        STAGE_CONFIG.forEach((stage) => {
          const amt = parseFloat(p[stage.amtField] || p.estimated_budget || 0);
          const recDate = p[stage.recField];
          const expDate = p[stage.expField];

          if (recDate && format(new Date(recDate), "yyyy-MM") === monthKey && amt > 0) {
            actual.total += amt;
            actual.breakdown.push({ project: p.project_name, stage: stage.label, amt, color: stage.color });
          } else if (!recDate && expDate && format(new Date(expDate), "yyyy-MM") === monthKey && amt > 0) {
            expected.total += amt;
            expected.breakdown.push({ project: p.project_name, stage: stage.label, amt, color: stage.color });
          }
        });
      });

      return { month, actual, expected };
    });
  }, [months, projects]);

  const currentMonthData = selectedMonth
    ? monthData.find((m) => format(m.month, "yyyy-MM") === format(selectedMonth, "yyyy-MM"))
    : null;

  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditFields({
      deposit_expected_date: project.deposit_expected_date || "",
      ninety_percent_expected_date: project.ninety_percent_expected_date || "",
      final_expected_date: project.final_expected_date || "",
    });
  };

  const handleSave = () => {
    updateMutation.mutate({ id: editingProject.id, data: editFields });
  };

  // Summary stats
  const totalActualYTD = monthData
    .filter((m) => m.month <= new Date() && m.month.getFullYear() === new Date().getFullYear())
    .reduce((s, m) => s + m.actual.total, 0);
  const totalExpectedRemaining = monthData
    .filter((m) => m.month > new Date())
    .reduce((s, m) => s + m.expected.total + m.actual.total, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Received YTD</p>
            <p className="text-xl font-bold text-green-700">{fmt$(totalActualYTD)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Expected Future Pipeline</p>
            <p className="text-xl font-bold text-blue-700">{fmt$(totalExpectedRemaining)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Active Projects</p>
            <p className="text-xl font-bold text-amber-700">{projects.length}</p>
          </div>
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setFocusMonth(m => subMonths(m, 6))}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back 6 Months
        </Button>
        <span className="font-semibold text-slate-700 text-sm">
          {format(months[0], "MMM yyyy")} — {format(months[months.length - 1], "MMM yyyy")}
        </span>
        <Button variant="outline" size="sm" onClick={() => setFocusMonth(m => addMonths(m, 6))}>
          Next 6 Months <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {monthData.map(({ month, actual, expected }) => {
          const isCurrentMonth = isSameMonth(month, new Date());
          const isPast = month < startOfMonth(new Date());
          const isSelected = selectedMonth && isSameMonth(month, selectedMonth);
          const hasActivity = actual.total > 0 || expected.total > 0;

          return (
            <button
              key={format(month, "yyyy-MM")}
              onClick={() => setSelectedMonth(isSelected ? null : month)}
              className={`text-left rounded-xl border p-3 transition-all hover:shadow-md ${
                isSelected
                  ? "border-slate-700 bg-slate-900 text-white shadow-lg"
                  : isCurrentMonth
                  ? "border-amber-300 bg-amber-50"
                  : isPast
                  ? "border-slate-200 bg-white"
                  : "border-blue-200 bg-blue-50/40"
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${isSelected ? "text-slate-300" : isCurrentMonth ? "text-amber-700" : isPast ? "text-slate-500" : "text-blue-600"}`}>
                {format(month, "MMMM yyyy")}
                {isCurrentMonth && <span className="ml-1 text-amber-600">← Now</span>}
              </div>

              {actual.total > 0 && (
                <div className={`text-sm font-bold ${isSelected ? "text-green-300" : "text-green-700"}`}>
                  ✓ {fmt$(actual.total)}
                </div>
              )}
              {expected.total > 0 && (
                <div className={`text-xs font-medium mt-0.5 ${isSelected ? "text-blue-300" : "text-blue-600"}`}>
                  ~ {fmt$(expected.total)} expected
                </div>
              )}
              {!hasActivity && (
                <div className={`text-xs ${isSelected ? "text-slate-400" : "text-slate-400"}`}>No activity</div>
              )}

              {/* Stage dots */}
              {hasActivity && (
                <div className="flex gap-1 mt-2">
                  {actual.breakdown.map((b, i) => (
                    <div key={`a${i}`} className={`w-2 h-2 rounded-full ${STAGE_CONFIG.find(s => s.label === b.stage)?.dot || "bg-slate-400"}`} title={`${b.stage}: ${b.project}`} />
                  ))}
                  {expected.breakdown.map((b, i) => (
                    <div key={`e${i}`} className={`w-2 h-2 rounded-full opacity-50 border border-current ${STAGE_CONFIG.find(s => s.label === b.stage)?.dot || "bg-slate-400"}`} title={`Expected ${b.stage}: ${b.project}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Month Detail Panel */}
      {currentMonthData && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-lg">{format(currentMonthData.month, "MMMM yyyy")} — Detail</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Received */}
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Received ({fmt$(currentMonthData.actual.total)})
              </h4>
              {currentMonthData.actual.breakdown.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing received this month.</p>
              ) : (
                <div className="space-y-2">
                  {currentMonthData.actual.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{b.project}</p>
                        <Badge className={`text-xs mt-0.5 ${b.color}`}>{b.stage}</Badge>
                      </div>
                      <span className="text-sm font-bold text-green-700">{fmt$(b.amt)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t">
                    <span>Total Received</span>
                    <span className="text-green-700">{fmt$(currentMonthData.actual.total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expected */}
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Expected ({fmt$(currentMonthData.expected.total)})
              </h4>
              {currentMonthData.expected.breakdown.length === 0 ? (
                <p className="text-sm text-slate-400">No expected invoices this month.</p>
              ) : (
                <div className="space-y-2">
                  {currentMonthData.expected.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{b.project}</p>
                        <Badge className={`text-xs mt-0.5 ${b.color}`}>{b.stage}</Badge>
                      </div>
                      <span className="text-sm font-bold text-blue-700">{fmt$(b.amt)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t">
                    <span>Total Expected</span>
                    <span className="text-blue-700">{fmt$(currentMonthData.expected.total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Expected Dates Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Set Expected Receive Dates</h3>
          <p className="text-xs text-slate-500 mt-0.5">Set when you expect each invoice stage to be paid — these show as expected amounts on the calendar above.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Project</th>
                {STAGE_CONFIG.map(stage => (
                  <th key={stage.key} className="text-center px-3 py-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                      {stage.label} Expected
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.project_name}</div>
                    <div className="text-xs text-slate-500">{p.client_name}</div>
                  </td>
                  {STAGE_CONFIG.map((stage) => (
                    <td key={stage.key} className="px-3 py-2 text-center">
                      {p[stage.recField] ? (
                        <span className="text-xs text-green-600 font-medium">✓ Received</span>
                      ) : (
                        <Input
                          type="date"
                          className="h-7 text-xs w-36 mx-auto"
                          value={getDateValue(p, stage.expField)}
                          onChange={(e) => handleDateChange(p.id, stage.expField, e.target.value)}
                          onBlur={(e) => { if (e.target.value) handleDateBlur(p.id, stage.expField, e.target.value); }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}