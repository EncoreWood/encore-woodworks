import { Search, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calcCollected, getEffectiveInvoices } from "@/components/invoicing/CustomInvoicesEditor";
import { useState } from "react";

export default function CompletedProjectsTab({ projects, proposals, onCardClick }) {
  const [search, setSearch] = useState("");

  const filtered = !search
    ? projects
    : projects.filter(
        (p) =>
          p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.client_name?.toLowerCase().includes(search.toLowerCase())
      );

  const totalCollected = filtered.reduce(
    (sum, p) => sum + calcCollected(getEffectiveInvoices(p)),
    0
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" /> Completed Projects
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Jobs automatically move here after being Paid in Full for over 1 month.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm">
            <span className="text-sm font-medium text-slate-600">Total Collected:</span>
            <span className="text-lg font-bold text-emerald-600">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search projects or clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No completed projects yet</p>
          <p className="text-sm">Projects appear here one month after being marked Paid in Full.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const coTotal = (project.change_orders || []).reduce((s, co) => s + (co.amount || 0), 0);
            const currentTotal =
              (project.base_amount || project.total_amount || project.estimated_budget || 0) + coTotal;
            const collected = calcCollected(getEffectiveInvoices(project));
            const anchor = project.paid_in_full_date || project.final_invoice_received_date;
            return (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-emerald-200"
                onClick={(e) => onCardClick(project, e)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {project.project_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500">{project.client_name}</p>
                    </div>
                    <Link
                      to={createPageUrl(`ProjectDetails?id=${project.id}`)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open Project">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Current Total:</span>
                      <span className="font-bold text-slate-900">${currentTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Collected:</span>
                      <span className="font-medium text-green-600">${collected.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Paid in Full{anchor ? ` on ${anchor}` : ""}</span>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {project.status?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-emerald-600 font-medium">Completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}