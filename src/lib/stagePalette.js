// One fixed palette for production stages, so a stage reads the same everywhere it
// appears: the chip on a production card and the room/project progress bars.
// chip = tinted background + darker text + a solid dot of the accent color, with a
// subtle border of the same accent at low opacity.
export const STAGE_PALETTE = {
  staged: {
    label: "Staged",
    chip: "bg-slate-100 text-slate-600 border-slate-600/20 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-300/30",
    dot: "bg-slate-500 dark:bg-slate-300",
    accent: "#64748B",
  },
  cut: {
    label: "Cut",
    chip: "bg-sky-100 text-sky-700 border-sky-700/20 dark:bg-sky-900 dark:text-sky-100 dark:border-sky-300/30",
    dot: "bg-sky-700 dark:bg-sky-300",
    accent: "#0369A1",
  },
  face_frame: {
    label: "Face Frame",
    chip: "bg-indigo-100 text-indigo-800 border-indigo-800/20 dark:bg-indigo-900 dark:text-indigo-100 dark:border-indigo-300/30",
    dot: "bg-indigo-800 dark:bg-indigo-300",
    accent: "#3730A3",
  },
  spray: {
    label: "Spray",
    chip: "bg-purple-100 text-purple-700 border-purple-700/20 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-300/30",
    dot: "bg-purple-700 dark:bg-purple-300",
    accent: "#7E22CE",
  },
  build: {
    label: "Build",
    chip: "bg-amber-100 text-amber-700 border-amber-700/20 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-300/30",
    dot: "bg-amber-700 dark:bg-amber-300",
    accent: "#B45309",
  },
  complete: {
    label: "Complete",
    chip: "bg-green-100 text-green-700 border-green-700/20 dark:bg-green-900 dark:text-green-100 dark:border-green-300/30",
    dot: "bg-green-700 dark:bg-green-300",
    accent: "#15803D",
  },
  on_hold: {
    label: "On Hold",
    chip: "bg-red-100 text-red-700 border-red-700/20 dark:bg-red-900 dark:text-red-100 dark:border-red-300/30",
    dot: "bg-red-700 dark:bg-red-300",
    accent: "#B91C1C",
  },
  missing: {
    label: "Missing",
    chip: "bg-orange-100 text-orange-800 border-orange-800/20 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-300/30",
    dot: "bg-orange-600 dark:bg-orange-300",
    accent: "#EA580C",
  },
};

/** The palette key for a production card — cards with no stage yet show as Staged. */
export function stageKeyOf(item) {
  if (!item) return "staged";
  if (!item.stage) return item.completed_date ? "complete" : "staged";
  return STAGE_PALETTE[item.stage] ? item.stage : "staged";
}

/** The chip label for a production card. */
export function stageLabelOf(item) {
  if (!item) return "Staged";
  if (!item.stage) return item.completed_date ? "Complete" : "Staged";
  return STAGE_PALETTE[item.stage]?.label || item.stage;
}

/**
 * Progress bar colour by band, following the same stage order as the chips:
 * nothing started → slate, low → sky, mid → purple, high → amber, done → green.
 */
export function progressBand(pct) {
  if (!pct || pct <= 0) {
    return {
      fill: "bg-slate-400 dark:bg-slate-500",
      text: "text-slate-500 dark:text-slate-400",
      accent: "#94A3B8",
    };
  }
  if (pct <= 33) {
    return {
      fill: "bg-sky-500 dark:bg-sky-400",
      text: "text-sky-700 dark:text-sky-400",
      accent: "#0EA5E9",
    };
  }
  if (pct <= 66) {
    return {
      fill: "bg-purple-500 dark:bg-purple-400",
      text: "text-purple-700 dark:text-purple-400",
      accent: "#9333EA",
    };
  }
  if (pct < 100) {
    return {
      fill: "bg-amber-500 dark:bg-amber-400",
      text: "text-amber-700 dark:text-amber-400",
      accent: "#D97706",
    };
  }
  return {
    fill: "bg-green-600 dark:bg-green-500",
    text: "text-green-700 dark:text-green-400",
    accent: "#15803D",
  };
}