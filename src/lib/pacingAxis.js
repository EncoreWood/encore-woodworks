// Y-axis ticks for the pacing charts. Recharts' automatic ticks produced fractional
// values, and the charts' negative left margin clipped the first digit of every label
// (20 → "0", 15 → "5"), so the axis looked like random single digits. Ticks are now
// computed here as whole numbers, always starting at 0 and stepping in a readable size.

function stepFor(top) {
  if (top <= 25) return 5;
  if (top <= 50) return 10;
  if (top <= 120) return 20;
  if (top <= 250) return 50;
  return 100;
}

// The top of the axis: at least the 20-point day target, rounded up to the next tick.
export function axisTop(max) {
  const needed = Math.max(5, Number(max) || 0);
  if (needed <= 20) return 20;
  if (needed <= 25) return 25;
  const step = stepFor(needed);
  return Math.ceil(needed / step) * step;
}

export function axisTicks(max) {
  const top = axisTop(max);
  const step = stepFor(top);
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

export function formatAxisValue(value) {
  const number = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}