import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Search, Undo2 } from "lucide-react";
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

// Split a card's moves into passes. A pass ends when the card is sent back
// into production for a missing item — that move starts the next pass, which
// keeps its own separate time history per stage.
function buildPasses(moves, now) {
  const passes = [];
  let cur = null;
  let lastAt = null;
  let lastStage = null;

  const closePass = (dwellForLast) => {
    if (!cur) return;
    // The last move's time in stage: how long until the pass ended
    if (cur.moves.length && dwellForLast != null) {
      cur.moves[cur.moves.length - 1].duration = dwellForLast;
    }
    passes.push({
      startAt: cur.startAt,
      sentBack: cur.sentBack,
      stageTimes: cur.stageTimes,
      moves: cur.moves,
      lastStage,
      lastAt,
      currentDwell: dwellForLast
    });
  };

  moves.forEach(mv => {
    const at = parseDate(mv.moved_at);
    if (mv.sent_back) {
      if (cur) {
        if (lastAt && lastStage) {
          cur.stageTimes[lastStage] = (cur.stageTimes[lastStage] || 0) + (at.getTime() - lastAt.getTime());
        }
        // Card sat in its last stage until this send-back move
        closePass(lastAt ? at.getTime() - lastAt.getTime() : null);
      }
      cur = { stageTimes: {}, moves: [], startAt: mv.moved_at, sentBack: true };
      lastAt = null;
      lastStage = null;
    } else if (!cur) {
      cur = { stageTimes: {}, moves: [], startAt: mv.moved_at, sentBack: false };
    }
    // Close out the previous move's duration
    if (cur.moves.length && lastAt) {
      cur.moves[cur.moves.length - 1].duration = at.getTime() - lastAt.getTime();
    }
    if (lastAt && lastStage) {
      cur.stageTimes[lastStage] = (cur.stageTimes[lastStage] || 0) + (at.getTime() - lastAt.getTime());
    }
    cur.moves.push({ to_stage: mv.to_column, moved_at: mv.moved_at, moved_by: mv.moved_by, duration: null });
    lastAt = at;
    lastStage = mv.to_column;
  });
  if (cur) closePass(lastAt ? now - lastAt.getTime() : null);
  return passes;
}

export default function MoveHistoryTab({ columnMoveLogs = [], items = [] }) {
  const [search, setSearch] = useState("");
  const [openItemId, setOpenItemId] = useState(null);
  const now = Date.now();

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
      histories[itemId] = { passes: buildPasses(moves, now) };
    });
    return histories;
  }, [columnMoveLogs, now]);

  // Only cards currently on the production board
  const boardCards = useMemo(() => items.filter(i => !i.is_job_info), [items]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boardCards
      .filter(c => !q || c.name?.toLowerCase().includes(q) || c.project_name?.toLowerCase().includes(q))
      .map(c => {
        const h = cardHistories[c.id];
        return {
          id: c.id,
          name: c.name,
          project_name: c.project_name || "",
          stage: c.stage,
          passes: h?.passes || [],
          fallbackDwell: !h && c.created_date ? now - parseDate(c.created_date).getTime() : null
        };
      })
      .sort((a, b) => {
        const ai = STAGES.findIndex(s => s.id === a.stage);
        const bi = STAGES.findIndex(s => s.id === b.stage);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.name.localeCompare(b.name);
      });
  }, [boardCards, cardHistories, search, now]);

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
                const isOpen = openItemId === card.id;
                const passes = card.passes;
                const currentPass = passes[passes.length - 1] || null;
                const currentStage = currentPass?.lastStage || card.stage;
                const dwell = currentPass?.currentDwell ?? card.fallbackDwell;
                return (
                  <div key={card.id} className="py-2.5">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => setOpenItemId(isOpen ? null : card.id)}
                    >
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stageChip(currentStage)}`}>
                        {stageLabel(currentStage)}
                      </span>
                      {passes.length > 1 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                          Pass {passes.length}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{card.name}</p>
                        {card.project_name && <p className="text-xs text-slate-400 truncate">{card.project_name}</p>}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDuration(dwell) || "—"} in {stageLabel(currentStage)}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="mt-2 ml-1 space-y-2">
                        {passes.length === 0 && card.fallbackDwell != null && (
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Pass 1</p>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageChip(card.stage)}`}>
                              {stageLabel(card.stage)}: {formatDuration(card.fallbackDwell)}
                            </span>
                          </div>
                        )}
                        {passes.length === 0 && card.fallbackDwell == null && (
                          <p className="text-xs text-slate-400 px-1">No stage moves logged yet for this card.</p>
                        )}
                        {passes.map((p, idx) => {
                          const isCurrentPass = idx === passes.length - 1;
                          const entries = STAGES.filter(s => (p.stageTimes[s.id] || 0) > 0 || (isCurrentPass && p.lastStage === s.id && p.currentDwell != null))
                            .map(s => ({
                              key: s.id,
                              label: stageLabel(s.id),
                              chip: stageChip(s.id),
                              ms: isCurrentPass && p.lastStage === s.id
                                ? (p.stageTimes[s.id] || 0) + p.currentDwell
                                : p.stageTimes[s.id]
                            }));
                          return (
                            <div key={idx} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                Pass {idx + 1}
                                {p.sentBack && (
                                  <span className="inline-flex items-center gap-1 text-rose-600 normal-case font-semibold">
                                    <Undo2 className="w-3 h-3" /> sent back for missing items
                                  </span>
                                )}
                                <span className="text-slate-400 normal-case font-medium">started {format(parseDate(p.startAt), "MMM d, h:mm a")}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {entries.map(e => (
                                  <span key={e.key} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${e.chip}`}>
                                    {e.label}: {formatDuration(e.ms)}
                                  </span>
                                ))}
                              </div>
                              {p.moves.length > 0 && (
                                <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                                  {p.moves.map((mv, mi) => (
                                    <div key={mi} className="flex items-center gap-2 text-xs text-slate-500">
                                      <Undo2 className={`w-3 h-3 text-rose-400 flex-shrink-0 ${mi === 0 && p.sentBack ? "" : "invisible"}`} />
                                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${stageChip(mv.to_stage)}`}>
                                        {stageLabel(mv.to_stage)}
                                      </span>
                                      <span>moved {mv.moved_at ? format(parseDate(mv.moved_at), "MMM d, h:mm a") : "—"}</span>
                                      {mv.moved_by && <span className="text-slate-400 truncate">by {mv.moved_by}</span>}
                                      <span className="ml-auto font-medium text-slate-600 flex-shrink-0">
                                        {mv.duration != null ? `${formatDuration(mv.duration)} in ${stageLabel(mv.to_stage)}` : ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
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