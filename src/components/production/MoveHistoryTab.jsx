import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Search, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/parseDate";
import { STAGES, stageLabel, stageChip, formatDuration, buildPasses, isOnProductionBoard } from "./moveHistoryUtils";
import StageMoveSubTabs from "./StageMoveSubTabs";

export default function MoveHistoryTab({ columnMoveLogs = [], items = [] }) {
  const [search, setSearch] = useState("");
  const [openItemId, setOpenItemId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
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
  const boardCards = useMemo(() => items.filter(isOnProductionBoard), [items]);

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
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab("all")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            activeTab === "all"
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Cards
        </button>
        {STAGES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeTab === s.id
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeTab !== "all" && (
        <React.Fragment>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search card or project..."
              className="pl-9"
            />
          </div>
          <StageMoveSubTabs
            stageId={activeTab}
            columnMoveLogs={columnMoveLogs}
            items={items}
            search={search}
          />
        </React.Fragment>
      )}

      {activeTab === "all" && (
      <>
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
      </>
      )}
    </div>
  );
}