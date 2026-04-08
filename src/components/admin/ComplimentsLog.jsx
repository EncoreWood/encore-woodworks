import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function ComplimentsLog() {
  const [filterTo, setFilterTo] = useState("all");
  const [filterFrom, setFilterFrom] = useState("all");

  const { data: compliments = [] } = useQuery({
    queryKey: ["compliments"],
    queryFn: () => base44.entities.Compliment.list("-submitted_at", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const allNames = [...new Set([...compliments.map(c => c.from), ...compliments.map(c => c.to)])].filter(Boolean).sort();

  const filtered = compliments.filter(c => {
    const matchTo = filterTo === "all" || c.to === filterTo;
    const matchFrom = filterFrom === "all" || c.from === filterFrom;
    return matchTo && matchFrom;
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total Compliments</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{compliments.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Shared in Meeting</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{compliments.filter(c => c.share_in_meeting).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">This Month</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {compliments.filter(c => c.date?.startsWith(format(new Date(), "yyyy-MM"))).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Unique Recipients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-purple-600">{new Set(compliments.map(c => c.to)).size}</p></CardContent>
        </Card>
      </div>

      {/* Filters + Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>🎉 Compliments Log</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterFrom} onValueChange={setFilterFrom}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="From..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All — From</SelectItem>
                  {allNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTo} onValueChange={setFilterTo}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="For..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All — For</SelectItem>
                  {allNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No compliments found.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map(c => (
                <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{c.from}</span>
                      <span className="text-xs text-slate-400">→</span>
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{c.to}</span>
                      {c.share_in_meeting && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">☀️ Meeting</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {c.submitted_at ? format(new Date(c.submitted_at), "MMM d, h:mm a") : c.date}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}