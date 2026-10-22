import { Inbox } from "lucide-react";
import MissingItemRow from "./MissingItemRow";

// Statuses that need action right now (everything else is in flight or done)
const ACTIONABLE_STATUSES = ["Open", "Ordered", "Received"];

/**
 * Flat cross-project queue of missing items needing action, oldest first.
 * Reuses MissingItemRow; showProject surfaces the job/room since multiple
 * projects are mixed in one list.
 */
export default function ActionQueueList({ items, cardById, projects, isAdmin, updating, onStatus, onSendToProduction, onBackToOpen, sending, onViewCard }) {
  const queue = items
    .filter(i => ACTIONABLE_STATUSES.includes(i.status))
    .sort((a, b) => {
      const ta = a.reported_at ? new Date(a.reported_at).getTime() : Infinity;
      const tb = b.reported_at ? new Date(b.reported_at).getTime() : Infinity;
      return ta - tb;
    });

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 text-center py-16 text-slate-400">
        <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Action Queue is clear</p>
        <p className="text-sm">No open, ordered, or received items waiting across any job.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {queue.length} item{queue.length !== 1 ? "s" : ""} needing action · oldest first
      </div>
      <div className="divide-y divide-slate-50">
        {queue.map(item => (
          <MissingItemRow
            key={item.id}
            item={item}
            card={cardById?.get(item.production_item_id)}
            projects={projects}
            isAdmin={isAdmin}
            updating={updating}
            onStatus={onStatus}
            onSendToProduction={onSendToProduction}
            onBackToOpen={onBackToOpen}
            sending={sending}
            onViewCard={onViewCard}
            showProject
          />
        ))}
      </div>
    </div>
  );
}