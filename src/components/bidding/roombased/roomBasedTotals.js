// Shared math for the room-based proposal template.
// Standard Total counts only non-optional rooms, ever. Optional rooms and
// upgrades live in the Options section and only add to the selected total.

export const money = (value) =>
  `$${Math.round(Number(value) || 0).toLocaleString()}`;

export const signedMoney = (value) =>
  `+$${Math.round(Number(value) || 0).toLocaleString()}`;

const sumPrice = (rows) => rows.reduce((total, row) => total + (parseFloat(row?.price) || 0), 0);

export function computeRoomBasedTotals({ rooms = [], options = [] } = {}) {
  const standardRooms = rooms.filter((room) => !room.is_optional);
  const optionalRooms = rooms.filter((room) => room.is_optional);
  const selectedOptions = options.filter((option) => option.selected);
  const selectedOptionalRooms = optionalRooms.filter((room) => room.selected);

  const standardTotal = sumPrice(standardRooms);
  const optionsTotal = sumPrice(selectedOptions) + sumPrice(selectedOptionalRooms);
  const allOptionsTotal = sumPrice(options) + sumPrice(optionalRooms);

  return {
    standardRooms,
    optionalRooms,
    selectedOptions,
    selectedOptionalRooms,
    standardTotal,
    optionsTotal,
    selectedTotal: standardTotal + optionsTotal,
    ceilingTotal: standardTotal + allOptionsTotal,
    hasOptions: options.length > 0 || optionalRooms.length > 0,
  };
}

export const nextSortOrder = (rows = []) =>
  rows.reduce((max, row) => Math.max(max, Number(row?.sort_order) || 0), 0) + 1;