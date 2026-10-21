const timeZone = "America/Denver";
export const productionStages = ["cut", "face_frame", "spray", "build", "complete", "on_hold"];

// Civil shop time keeps the working-hours calculation independent of server timezone.
function shopTime(value) {
  const date = new Date(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date).map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second), date.getUTCMilliseconds()));
}

export function productionBoardQuery(now) {
  const cutoff = shopTime(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 6);
  return {
    is_job_info: { $ne: true },
    stage: { $in: productionStages },
    $or: [
      { stage: { $ne: "complete" } },
      { completed_date: { $gte: cutoff.toISOString().slice(0, 10) } },
      { completed_date: { $exists: false } },
      { completed_date: null },
      { completed_date: "" }
    ]
  };
}

function workingMs(from, to) {
  const start = shopTime(from);
  const end = shopTime(to);
  const day = new Date(start);
  day.setUTCHours(0, 0, 0, 0);
  let total = 0;
  while (day <= end) {
    if ([1, 2, 3, 4].includes(day.getUTCDay())) {
      for (const [begin, finish] of [[420, 720], [750, 1050]]) {
        total += Math.max(0, Math.min(end.getTime(), day.getTime() + finish * 60000)
          - Math.max(start.getTime(), day.getTime() + begin * 60000));
      }
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return total;
}

export async function readHistoryPages(entity, query, sort = "id") {
  const rows = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort, limit: 250, ...(cursor ? { cursor } : {}) });
    rows.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return rows;
}

// A stay is proven by either an arrival OR a departure. Do not invent an arrival
// timestamp from card creation: cards can wait in a room folder before production.
export function buildStageHistory(cards, logs, stageId, now) {
  const byItem = new Map();
  for (const log of logs) {
    if (!log.moved_at || !Number.isFinite(new Date(log.moved_at).getTime())) continue;
    if (!byItem.has(log.item_id)) byItem.set(log.item_id, []);
    byItem.get(log.item_id).push(log);
  }
  const rows = [];
  for (const card of cards) {
    const moves = (byItem.get(card.id) || []).sort((a, b) => new Date(a.moved_at) - new Date(b.moved_at));
    const passCount = 1 + moves.slice(1).filter(move => move.sent_back).length;
    let passIndex = 1;
    let sentBack = false;
    let open = null;
    const addVisit = (move, isArrival) => {
      const row = {
        id: `${card.id}-${move.id}-${isArrival ? "in" : "out"}`,
        itemId: card.id, name: card.name, project: card.project_name || "",
        pts: card.pts != null ? Number(card.pts) : (card.files || []).reduce((sum, file) => sum + (parseFloat(file.pts) || 0), 0),
        isBeingWorked: !!card.is_being_worked,
        moved_at: move.moved_at, moved_by: move.moved_by,
        eventLabel: isArrival ? "Moved in" : "Moved out",
        duration: null, isCurrent: false, sentBack, passIndex, passCount
      };
      rows.push(row);
      return row;
    };
    moves.forEach((move, index) => {
      // Close the source stay before a send-back starts the next pass.
      if (move.from_column === stageId && move.from_column !== move.to_column) {
        if (open) {
          open.duration = workingMs(open.moved_at, move.moved_at);
          open = null;
        } else {
          addVisit(move, false);
        }
      } else if (open && move.from_column !== stageId) {
        // An unlogged change makes the exit time unknown, not an ongoing stay.
        open = null;
      }
      if (move.sent_back) {
        if (index > 0) passIndex += 1;
        sentBack = true;
      }
      if (move.to_column === stageId && move.from_column !== move.to_column) {
        open = addVisit(move, true);
      }
    });
    if (open && card.stage === stageId) {
      open.isCurrent = true;
      open.duration = workingMs(open.moved_at, now);
    }
  }
  return rows.sort((a, b) => new Date(b.moved_at) - new Date(a.moved_at) || a.id.localeCompare(b.id));
}

// Cards behind the per-period stat tiles: filter rows by the tile's period.
export function periodRows(rows, period, now) {
  const today = shopTime(now).toISOString().slice(0, 10);
  const match = {
    all: () => true,
    month: row => new Date(row.moved_at).getTime() >= now - 30 * 86400000,
    week: row => new Date(row.moved_at).getTime() >= now - 7 * 86400000,
    day: row => shopTime(row.moved_at).toISOString().slice(0, 10) === today
  }[period];
  return match ? rows.filter(match) : rows;
}

export function stageHistoryStats(rows, now) {
  const measured = rows.filter(row => row.duration != null);
  const today = shopTime(now).toISOString().slice(0, 10);
  const perPoint = predicate => {
    const values = measured.filter(row => row.pts > 0 && row.isBeingWorked && predicate(row));
    return values.length ? values.reduce((sum, row) => sum + row.duration / 60000 / row.pts, 0) / values.length : null;
  };
  const inPeriod = predicate => rows.filter(row => predicate(row)).length;
  const movedIn = predicate => inPeriod(row => row.eventLabel !== "Moved out" && predicate(row));
  const movedOut = predicate => inPeriod(row => row.eventLabel === "Moved out" && predicate(row));
  return {
    count: rows.length,
    currentCount: rows.filter(row => row.isCurrent).length,
    movedAll: movedIn(() => true),
    movedMonth: movedIn(row => new Date(row.moved_at).getTime() >= now - 30 * 86400000),
    movedWeek: movedIn(row => new Date(row.moved_at).getTime() >= now - 7 * 86400000),
    movedDay: movedIn(row => shopTime(row.moved_at).toISOString().slice(0, 10) === today),
    movedOutAll: movedOut(() => true),
    movedOutMonth: movedOut(row => new Date(row.moved_at).getTime() >= now - 30 * 86400000),
    movedOutWeek: movedOut(row => new Date(row.moved_at).getTime() >= now - 7 * 86400000),
    movedOutDay: movedOut(row => shopTime(row.moved_at).toISOString().slice(0, 10) === today),
    avgMs: measured.length ? measured.reduce((sum, row) => sum + row.duration, 0) / measured.length : null,
    avgPerPointAll: perPoint(() => true),
    avgPerPointMonth: perPoint(row => new Date(row.moved_at).getTime() >= now - 30 * 86400000),
    avgPerPointWeek: perPoint(row => new Date(row.moved_at).getTime() >= now - 7 * 86400000),
    avgPerPointDay: perPoint(row => shopTime(row.moved_at).toISOString().slice(0, 10) === today)
  };
}