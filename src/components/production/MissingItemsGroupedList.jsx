import { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import MissingItemRow from "./MissingItemRow";

/**
 * Groups missing items by job (project) then room, with collapsible sections.
 * expandedJobs: Set of job keys, expandedRooms: Set of "job||room" keys. Sections start collapsed.
 */
export default function MissingItemsGroupedList({ items, isAdmin, updating, onStatus, onSendToProduction, sending, expandedJobs, expandedRooms, onToggleJob, onToggleRoom }) {
  const grouped = useMemo(() => {
    const jobs = new Map();
    for (const item of items) {
      const jobKey = item.project_name || "No Job";
      const roomKey = item.room_name || "No Room";
      if (!jobs.has(jobKey)) jobs.set(jobKey, new Map());
      const rooms = jobs.get(jobKey);
      if (!rooms.has(roomKey)) rooms.set(roomKey, []);
      rooms.get(roomKey).push(item);
    }
    return jobs;
  }, [items]);

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([jobName, rooms]) => {
        const jobCollapsed = !expandedJobs.has(jobName);
        const jobCount = [...rooms.values()].reduce((s, list) => s + list.length, 0);
        return (
          <div key={jobName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Job header */}
            <button
              type="button"
              onClick={() => onToggleJob(jobName)}
              className="w-full px-5 py-3 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              {jobCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              <span className="text-sm font-bold text-slate-800">{jobName}</span>
              <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">{jobCount}</span>
            </button>

            {!jobCollapsed && (
              <div>
                {[...rooms.entries()].map(([roomName, roomItems]) => {
                  const roomCollapsed = !expandedRooms.has(`${jobName}||${roomName}`);
                  return (
                    <div key={roomName} className={cn(roomItems.length > 0 && "border-t border-slate-100")}>
                      {/* Room header */}
                      <button
                        type="button"
                        onClick={() => onToggleRoom(jobName, roomName)}
                        className="w-full px-5 py-2 flex items-center gap-2 bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-left"
                      >
                        {roomCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{roomName}</span>
                        <span className="text-xs text-slate-400">{roomItems.length} item{roomItems.length !== 1 ? "s" : ""}</span>
                      </button>

                      {!roomCollapsed && (
                        <div className="divide-y divide-slate-50">
                          {roomItems.map(item => (
                            <MissingItemRow key={item.id} item={item} isAdmin={isAdmin} updating={updating} onStatus={onStatus} onSendToProduction={onSendToProduction} sending={sending} />
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
  );
}