import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ArrowDownCircle, ArrowUpCircle, Filter } from "lucide-react";
import { format } from "date-fns";

export default function InventoryHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterItem, setFilterItem] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["inventoryLogs"],
    queryFn: () => base44.entities.InventoryLog.list("-performed_at", 200),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const people = useMemo(() => {
    const set = new Set(logs.map(l => l.performed_by).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterItem !== "all" && l.item_id !== filterItem) return false;
      if (filterPerson !== "all" && l.performed_by !== filterPerson) return false;
      if (filterDate && l.performed_at && !l.performed_at.startsWith(filterDate)) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!l.item_name?.toLowerCase().includes(s) && !l.notes?.toLowerCase().includes(s) && !l.performed_by?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [logs, filterItem, filterPerson, filterDate, searchTerm]);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-9 h-9" />
            </div>
            <Select value={filterItem} onValueChange={setFilterItem}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPerson} onValueChange={setFilterPerson}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Person" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {people.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-36 h-9 text-sm" />
            {(filterItem !== "all" || filterPerson !== "all" || filterDate || searchTerm) && (
              <button onClick={() => { setFilterItem("all"); setFilterPerson("all"); setFilterDate(""); setSearchTerm(""); }} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
            )}
          </div>
          <p className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No history entries found</p>
            ) : filtered.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${log.action === "Check In" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {log.action === "Check In" ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">{log.item_name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.action === "Check In" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {log.action === "Check In" ? "+" : "−"}{log.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{log.performed_by}</span>
                    <span>·</span>
                    <span>{log.performed_at ? format(new Date(log.performed_at), "MMM d, h:mm a") : ""}</span>
                  </div>
                  {log.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{log.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}