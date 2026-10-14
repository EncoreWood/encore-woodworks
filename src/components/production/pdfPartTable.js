export function partTypeOf(text) {
  const value = (text || "").trim().toLowerCase();
  if (/drawer\s*front/.test(value)) return "Drawer Front";
  if (/^(?:end(?:\s*panel)?(?:\s*\([lr]\))?|slab\s*end|fend)\b/.test(value)) return "End Panel";
  if (/\bdoor\b/.test(value) && !/hinge/.test(value)) return "Door";
  return null;
}

const dimension = /^(?:\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)$/;

// Columns use displayed page coordinates, including the PDF's page rotation.
export function readPartTable(lines) {
  const output = [];
  let columns = null;
  let last = null;
  for (const line of lines) {
    const headers = line.parts.map(p => p.str.trim().toLowerCase());
    if (["qty", "w", "l", "part", "material"].every(h => headers.includes(h))) {
      columns = line.parts;
      last = null;
      continue;
    }
    if (!columns) continue;
    const cell = name => {
      const index = columns.findIndex(p => p.str.trim().toLowerCase() === name);
      if (index < 0) return "";
      const start = columns[index].x - 2;
      const end = columns[index + 1]?.x - 2 || Infinity;
      return line.parts.filter(p => p.x >= start && p.x < end).map(p => p.str).join(" ").trim();
    };
    const qty = cell("qty"), width = cell("w"), length = cell("l");
    const part = cell("part"), material = cell("material");
    if (!qty && !width && !length && !part && !material) continue;
    if (/^\d+$/.test(qty) && dimension.test(width) && dimension.test(length)) {
      const label = partTypeOf(part);
      // Some face-frame tables put the opening letters at the end of Material.
      const cleanMaterial = material.replace(/\s+[A-Z](?:\s*,\s*[A-Z])*$/, "");
      last = label ? { label, quick_type: label, qty: Number(qty), width, length, material: cleanMaterial, y: line.y, height: line.parts[0].height } : null;
      if (last) output.push(last);
    } else if (last && !qty && !width && !length && !part && material && line.y - last.y < last.height * 1.6) {
      last.material += ` ${material}`;
    } else {
      last = null;
    }
  }
  return output.map(({ y, height, ...part }) => part);
}