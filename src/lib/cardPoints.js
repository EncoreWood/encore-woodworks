// ProductionItem.total_points is the ONE authoritative point value for a card.
// Every screen displays it, and every write that can change a card's points
// (file upload / replacement / removal, the manual PTS field, card creation)
// recomputes it with computeTotalPoints.

export const roundPts = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function filePtsTotal(files) {
  return roundPts((files || []).reduce((sum, file) => sum + (parseFloat(file?.pts) || 0), 0));
}

/**
 * A manual card-level PTS overrides the file total; otherwise the card is worth
 * the sum of its files' points. Cards with neither are worth 0.
 */
export function computeTotalPoints({ files, pts } = {}) {
  const manual = pts === "" || pts === null || pts === undefined ? null : parseFloat(pts);
  if (manual !== null && Number.isFinite(manual) && manual > 0) return roundPts(manual);
  return filePtsTotal(files);
}

// What every screen shows for a card. Cards written before total_points was kept
// in sync (or left at 0) still report their real value instead of a phantom zero.
export function cardPoints(item) {
  if (!item) return 0;
  const stored = parseFloat(item.total_points);
  if (Number.isFinite(stored) && stored > 0) return roundPts(stored);
  return computeTotalPoints({ files: item.files, pts: item.pts });
}

// Patch fragment that keeps total_points in step with the data being written.
// Pass the card's current values for anything the write doesn't include.
export function totalPointsPatch(item, changes = {}) {
  return {
    total_points: computeTotalPoints({
      files: "files" in changes ? changes.files : item?.files,
      pts: "pts" in changes ? changes.pts : item?.pts,
    }),
  };
}