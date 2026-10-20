import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { History, ArrowRight, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";

const STAGES = [
  { id: "cut", label: "Cut", chip: "bg-orange-100 text-orange-800" },
  { id: "face_frame", label: "Face Frame", chip: "bg-blue-100 text-blue-800" },
  { id: "spray", label: "Spray", chip: "bg-purple-100 text-purple-800" },
  { id: "build", label: "Build", chip: "bg-amber-100 text-amber-800" },
  { id: "complete", label: "Complete", chip: "bg-green-100 text-green-800" },
  { id: "on_hold", label: "On Hold", chip: "bg-red-100 text-red-800" }
];

function stageLabel(id) {
  if (!id) return "New";
  return STAGES.find(s => s.id === id)?.label || id;
}
function stageChip(id) {
  return STAGES.find(s => s.id === id)?.chip || "bg-slate-100 text-slate-700";
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export default function MoveHistoryTab({ columnMoveLogs = [] }) {
  const [search, setSearch] = useState("");

  // Per item: sort moves chronologically, compute how long the card sat in the
  // stage it just left (time between this move and its previous move).
  const rows = useMemo(() => {
    const byItem = {};
    columnMoveLogs.forEach(log => {
      if (!log.item_id) return;
      if (!byItem[log.item_id]) byItem[log.item_id] = [];
      byItem[log.item_id].push(log);
    });
    const all = [];
    Object.values(byItem).forEach(moves => {
      moves.sort((a, b) => (a.moved_at || "").localeCompare(b.moved_at || ""));
      moves.forEach((mv, i) => {
        const prev = i > 0 ? moves[i - 1] : null;
        const at = parseDate(mv.moved_at);
        const prevAt = prev ? parseDate(prev.moved_at) : null;
        all.push({
          id: mv.id,
          item_id: mv.item_id,
          item_name: mv.item_name || "(deleted card)",
          project_name: mv.project_name || "",
          from_column: mv.from_column || null,
          to_column: mv.to_column,
          moved_by: mv.moved_by || "—",
          moved_at: mv.moved_at,
          at,
          time_in_prev: prevAt && mv.from_column ? at.getTime() - prevAt.getTime() : null
        });
      });
    });
    all.sort((a, b) => b.at.getTime() - a.at.getTime());
    return all;
  }, [columnMoveLogs]);

  // Where each card is right now + how long it's been there
  const current = useMemo(() => {
    const latest = {};
    rows.forEach(r => {
      if (!latest[r.item_id] || r.at > latest[r.item_id].at) latest[r.item_id] = r;
    });
    const now = Date.now();
    return Object.values(latest)
      .map(r => ({ ...r, dwell: now - r.at.getTime() }))
      .sort((a, b) => {
        const ai = STAGES.findIndex(s => s.id === a.to_column);
        const bi = STAGES.findIndex(s => s.id === b.to_column);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.item_name.localeCompare(b.item_name);
      });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.item_name.toLowerCase().includes(q) ||
      r.project_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const filteredCurrent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return current;
    return current.filter(r =>
      r.item_name.toLowerCase().includes(q) ||
      r.project_name.toLowerCase().includes(q)
    );
  }, [current, search]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search card or project..."
          className="pl-9"
        />
      </div>

      {/* Current location of every card, with live time in stage */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" /> Cards Now (time in current stage)
          </h3>
          {filteredCurrent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No card moves logged yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {filteredCurrent.map(r => (
                <div key={r.item_id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stageChip(r.to_column)}`}>
                    {stageLabel(r.to_column)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.item_name}</p>
                    {r.project_name && <p className="text-xs text-slate-400 truncate">{r.project_name}</p>}
                  </div>
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{formatDuration(r.dwell)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full chronological move log, newest first */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-500" /> Move History
          </h3>
          {filteredRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No moves match your search.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRows.map(r => (
                <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="text-xs text-slate-500 w-32 flex-shrink-0">
                    {format(r.at, "MMM d, h:mm a")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.item_name}</p>
                    {r.project_name && <p className="text-xs text-slate-400 truncate">{r.project_name}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageChip(r.from_column)}`}>
                      {stageLabel(r.from_column)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageChip(r.to_column)}`}>
                      {stageLabel(r.to_column)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 w-24 text-right flex-shrink-0">
                    {r.time_in_prev != null ? `in ${stageLabel(r.from_column)} ${formatDuration(r.time_in_prev)}` : "—"}
                  </span>
                  <span className="text-xs text-slate-400 w-32 truncate text-right flex-shrink-0">by {r.moved_by}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}