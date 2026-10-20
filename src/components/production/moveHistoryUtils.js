import { parseDate } from "@/lib/parseDate";
import { format, subDays } from "date-fns";

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

// True when this production item is one of the cards rendered on the Shop
// Production board columns (Cut / Face Frame / Spray / Build / Complete / On Hold).
export function isOnProductionBoard(item) {
  if (!item || item.is_job_info || !STAGES.some(s => s.id === item.stage)) return false;
  // Match CompleteStageCards: older completed cards live only in room folders.
  return item.stage !== "complete" || !item.completed_date
    || item.completed_date >= format(subDays(new Date(), 6), "yyyy-MM-dd");
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

// Working schedule: Monday–Thursday, 7:00 AM – 5:30 PM, minus a 12:00–12:30 lunch.
// All stage dwell times count only this time.
const WORK_DAYS = [1, 2, 3, 4]; // Mon, Tue, Wed, Thu
const WORK_START_MIN = 7 * 60;         // 7:00 AM
const WORK_END_MIN = 17 * 60 + 30;     // 5:30 PM
const LUNCH_START_MIN = 12 * 60;       // 12:00 PM
const LUNCH_END_MIN = 12 * 60 + 30;    // 12:30 PM

// Elapsed working time (ms) between two dates, counting only work days/hours
// and excluding the lunch break.
export function workMsBetween(from, to) {
  if (!from || !to || to <= from) return 0;
  let total = 0;
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  while (day <= to) {
    if (WORK_DAYS.includes(day.getDay())) {
      const segStart = Math.max(day.getTime() + WORK_START_MIN * 60000, from.getTime());
      const segEnd = Math.min(day.getTime() + WORK_END_MIN * 60000, to.getTime());
      if (segEnd > segStart) {
        const lunchStart = day.getTime() + LUNCH_START_MIN * 60000;
        const lunchEnd = day.getTime() + LUNCH_END_MIN * 60000;
        const lunchOverlap = Math.max(0, Math.min(segEnd, lunchEnd) - Math.max(segStart, lunchStart));
        total += (segEnd - segStart) - lunchOverlap;
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.max(0, total);
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
          cur.stageTimes[lastStage] = (cur.stageTimes[lastStage] || 0) + workMsBetween(lastAt, at);
        }
        // Card sat in its last stage until this send-back move
        closePass(lastAt ? workMsBetween(lastAt, at) : null);
      }
      cur = { stageTimes: {}, moves: [], startAt: mv.moved_at, sentBack: true };
      lastAt = null;
      lastStage = null;
    } else if (!cur) {
      cur = { stageTimes: {}, moves: [], startAt: mv.moved_at, sentBack: false };
    }
    // Close out the previous move's duration
    if (cur.moves.length && lastAt) {
      cur.moves[cur.moves.length - 1].duration = workMsBetween(lastAt, at);
    }
    if (lastAt && lastStage) {
      cur.stageTimes[lastStage] = (cur.stageTimes[lastStage] || 0) + workMsBetween(lastAt, at);
    }
    cur.moves.push({ to_stage: mv.to_column, moved_at: mv.moved_at, moved_by: mv.moved_by, duration: null });
    lastAt = at;
    lastStage = mv.to_column;
  });
  if (cur) closePass(lastAt ? workMsBetween(lastAt, new Date(now)) : null);
  return passes;
}