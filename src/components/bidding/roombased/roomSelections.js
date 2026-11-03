// Per-room selections for the room-based proposal template.
// A room either inherits the proposal-level selections ("Main") or carries its
// own values in `room.selections` with `use_main_selections === false`.

export const SELECTION_FIELDS = [
  { key: "cabinet_style", label: "Cabinet Style" },
  { key: "wood_species", label: "Wood Species" },
  { key: "finish", label: "Finish" },
  { key: "door_style", label: "Door Style" },
  { key: "handles", label: "Handles" },
  { key: "drawerbox", label: "Drawerbox" },
  { key: "drawer_glides", label: "Drawer Glides" },
  { key: "hinges", label: "Hinges" },
];

export const usesMainSelections = (room) => room?.use_main_selections !== false;

/** The proposal-level selections, read off a Bid record or the editor's field state. */
export const mainFieldsFromBid = (bid = {}) => ({
  cabinet_style: bid.cabinet_style || "",
  wood_species: bid.wood_species || "",
  door_style: bid.door_style || "",
  handles: bid.handles || "",
  drawerbox: bid.drawerbox || "",
  drawer_glides: bid.drawer_glides || "",
  hinges: bid.hinges || "",
});

/** Values that actually apply to a room — its own when customized, otherwise the main ones. */
export const effectiveSelections = (room, main = {}) =>
  usesMainSelections(room) ? main : { ...main, ...(room?.selections || {}) };

/** Finish column: a typed finish wins, then the room's own, then the inherited wood species. */
export const effectiveFinish = (room, main = {}) => {
  if (room?.finish) return room.finish;
  const selections = effectiveSelections(room, main);
  return selections.finish || selections.wood_species || "";
};

/** Placeholder for the Finish input — what the column will show if left blank. */
export const finishSuggestion = (room, main = {}) => {
  if (usesMainSelections(room)) return main.wood_species || "";
  const selections = room?.selections || {};
  return selections.finish || selections.wood_species || main.wood_species || "";
};

/** Selection lines printed under a room — only the values that differ from main. */
export function roomSelectionLines(room, main = {}) {
  if (usesMainSelections(room)) return [];
  const selections = room?.selections || {};
  const lines = SELECTION_FIELDS
    .filter((field) => field.key !== "finish")
    .map((field) => ({ key: field.key, label: field.label, value: selections[field.key] || "" }))
    .filter((line) => line.value && line.value !== (main[line.key] || ""));
  if (selections.finish) lines.push({ key: "finish", label: "Finish", value: selections.finish });
  return lines;
}

/** Notes saved on a customized room, shown under the room line. */
export const roomNotes = (room) => (usesMainSelections(room) ? "" : room?.selections?.notes || "");