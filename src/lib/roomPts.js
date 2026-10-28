// Point values on production cards: each attached file carries its own PTS,
// and cards without files carry a card-level PTS.
export function cardPts(item) {
  const filePts = (item?.files || []).reduce((s, f) => s + (parseFloat(f.pts) || 0), 0);
  return filePts + (parseFloat(item?.pts) || 0);
}

export function roomPts(items) {
  return (items || []).reduce((s, item) => s + cardPts(item), 0);
}