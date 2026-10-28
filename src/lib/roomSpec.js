// Derives a room's wood species + finish label from a project's room selections.
// Paired species_finish_selections win; legacy single/multi lists are the fallback.
export function getRoomWoodFinish(project, roomName) {
  if (!project || !roomName) return { wood: "", finish: "" };
  const room = (project.rooms || []).find(
    (r) => (r.room_name || "").toLowerCase() === roomName.toLowerCase()
  );
  if (!room) return { wood: "", finish: "" };

  const pairs = room.species_finish_selections || [];
  const uniq = (arr) => [...new Set(arr.map((v) => (v || "").trim()).filter(Boolean))];

  const wood = pairs.length
    ? uniq(pairs.map((p) => p.wood_species)).join(", ")
    : room.wood_species || uniq((room.wood_species_selections || []).map((s) => s.value)).join(", ");

  const finish = pairs.length
    ? uniq(pairs.map((p) => p.finish)).join(", ")
    : room.finish || uniq((room.finish_selections || []).map((f) => f.value)).join(", ");

  return { wood: wood || "", finish: finish || "" };
}

export function roomSpecLabel(project, roomName) {
  const { wood, finish } = getRoomWoodFinish(project, roomName);
  return [wood, finish].filter(Boolean).join(" · ");
}