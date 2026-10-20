import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Search } from "lucide-react";
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

export default function MoveHistoryTab({ columnMoveLogs = [], items = [] }) {
  const [search, setSearch] = useState("");
  const [openItemId, setOpenItemId] = useState(null);

  // Per-card time history built from the move log: time spent in each stage
  // (time between consecutive moves), plus live dwell in the current stage.
  const cardHistories = useMemo(() => {
    const byItem = {};
    columnMoveLogs.forEach(log => {
      if (!log.item_id) return;
      if (!byItem[log.item_id]) byItem[log.item_id] = [];
      byItem[log.item_id].push(log);
    });
    const histories = {};
    Object.entries(byItem).forEach(([itemId, moves]) => {
      moves.sort((a, b) => (a.moved_at || "").localeCompare(b.moved_at || ""));
      const stageTimes = {};
      let lastAt = null;
      let lastStage = null;
      moves.forEach(mv => {
        const at = parseDate(mv.moved_at);
        if (lastAt && lastStage) {
          stageTimes[lastStage] = (stageTimes[lastStage] || 0) + (at.getTime() - lastAt.getTime());
        }
        lastAt = at;
        lastStage = mv.to_column;
      });
      const now = Date.now();
      const currentStage = lastStage;
      const currentDwell = lastAt ? now - lastAt.getTime() : null;
      histories[itemId] = { stageTimes, currentStage, currentDwell, lastMoveAt: lastAt };
    });
    return histories;
  }, [columnMoveLogs]);

  // Only cards currently on the production board
  const boardCards = useMemo(() => items.filter(i => !i.is_job_info), [items]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boardCards
      .filter(c => !q || c.name?.toLowerCase().includes(q) || c.project_name?.toLowerCase().includes(q))
      .map(c => ({
        id: c.id,
        name: c.name,
        project_name: c.project_name || "",
        stage: c.stage,
        history: cardHistories[c.id] || { stageTimes: {}, currentStage: c.stage, currentDwell: null, lastMoveAt: null },
        // fallback for cards never moved since logging began: dwell from created date
        fallbackDwell: !cardHistories[c.id] && c.created_date ? Date.now() - parseDate(c.created_date).getTime() : null
      }))
      .sort((a, b) => {
        const ai = STAGES.findIndex(s => s.id === a.stage);
        const bi = STAGES.findIndex(s => s.id === b.stage);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.name.localeCompare(b.name);
      });
  }, [boardCards, cardHistories, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search card or project..."
          className="pl-9"
        />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          {visibleCards.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No production cards on the board.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleCards.map(card => {
                const h = card.history;
                const isOpen = openItemId === card.id;
                const stagesWithTime = STAGES.filter(s => (h.stageTimes[s.id] || 0) > 0);
                return (
                  <div key={card.id} className="py-2.5">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => setOpenItemId(isOpen ? null : card.id)}
                    >
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stageChip(card.stage)}`}>
                        {stageLabel(card.stage)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{card.name}</p>
                        {card.project_name && <p className="text-xs text-slate-400 truncate">{card.project_name}</p>}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDuration(h.currentDwell ?? card.fallbackDwell) || "—"} in {stageLabel(card.stage)}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="mt-2 ml-1 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Time per stage</p>
                        {stagesWithTime.length === 0 && !card.fallbackDwell ? (
                          <p className="text-xs text-slate-400">No stage moves logged yet for this card.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {stagesWithTime.map(s => (
                              <span key={s.id} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageChip(s.id)}`}>
                                {stageLabel(s.id)}: {formatDuration(h.stageTimes[s.id])}
                              </span>
                            ))}
                            {card.fallbackDwell != null && (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageChip(card.stage)}`}>
                                {stageLabel(card.stage)}: {formatDuration(card.fallbackDwell)}
                              </span>
                            )}
                          </div>
                        )}
                        {h.lastMoveAt && (
                          <p className="text-xs text-slate-400">
                            Last moved: {format(h.lastMoveAt, "MMM d, h:mm a")} · currently in {stageLabel(h.currentStage)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}