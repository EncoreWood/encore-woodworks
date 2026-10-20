import { parseDate } from "@/lib/parseDate";

export const STAGES = [
  { id: "cut", label: "Cut", chip: "bg-orange-100 text-orange-800" },
  { id: "face_frame", label: "Face Frame", chip: "bg-blue-100 text-blue-800" },
  { id: "spray", label: "Spray", chip: "bg-purple-100 text-purple-800" },
  { id: "build", label: "Build", chip: "bg-amber-100 text-amber-800" },
  { id: "complete", label: "Complete", chip: "bg-green-100 text-green-800" },
  { id: "on_hold", label: "On Hold", chip: "bg-red-100 text-red-800" }
];

export function stageLabel(id) {
  if (!id) return "New";
  return STAGES.find(s => s.id === id)?.label || id;
}
export function stageChip(id) {
  return STAGES.find(s => s.id === id)?.chip || "bg-slate-100 text-slate-700";
}

export function formatDuration(ms) {
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
export function buildPasses(moves, now) {
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