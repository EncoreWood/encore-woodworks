export const todayPointFlow = ["staged", "cut", "face_frame", "spray", "build", "complete"];

export function denverDay(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const stageIndex = stage => todayPointFlow.indexOf(stage == null || stage === "" ? "staged" : stage);

// Only ProductionItem fields participate; a stored zero stays zero.
export function addTodayCardPoints(totals, items, day) {
  for (const item of items) {
    const currentIndex = stageIndex(item.stage);
    if (currentIndex < 0) continue;
    let minimumIndex = Infinity;
    for (const move of item.stage_move_log || []) {
      if (!move.timestamp || denverDay(move.timestamp) !== day) continue;
      for (const stage of [move.from_stage, move.to_stage]) {
        const index = stageIndex(stage);
        if (index >= 0) minimumIndex = Math.min(minimumIndex, index);
      }
    }
    const points = Number(item.total_points);
    if (!Number.isFinite(points)) continue;
    for (let index = minimumIndex; index < currentIndex; index++) {
      totals[todayPointFlow[index]] += points;
    }
  }
}