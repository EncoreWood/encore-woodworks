import { cardPoints } from "@/lib/cardPoints";

// Point values on production cards come from the card's own total_points, the same
// value its PTS box shows — so a room or packet total can never disagree with a card.
export const cardPts = cardPoints;

export function roomPts(items) {
  // Merged cut cards absorbed back into a parent no longer count toward the room
  return (items || []).filter(item => !item?.is_merged).reduce((s, item) => s + cardPoints(item), 0);
}